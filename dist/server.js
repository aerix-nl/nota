(function() {
  var Backbone, Document, JobQueue, NotaServer, Path, Q, TemplateUtils, chalk, express, fs, http, mkdirp, open, phantom, s, _,
    __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };

  _ = require('underscore')._;

  s = require('underscore.string');

  chalk = require('chalk');

  http = require('http');

  express = require('express');

  phantom = require('phantom');

  fs = require('fs');

  mkdirp = require('mkdirp');

  Q = require('q');

  Path = require('path');

  open = require("open");

  Backbone = require('backbone');

  Document = require('./document');

  TemplateUtils = require('./template_utils');

  JobQueue = require('./queue');

  module.exports = NotaServer = (function() {
    function NotaServer(options, logging) {
      var _ref;
      this.options = options;
      this.webRender = __bind(this.webRender, this);
      this.webrenderUrl = __bind(this.webrenderUrl, this);
      this.url = __bind(this.url, this);
      _.extend(this, Backbone.Events);
      this.log = logging.log, this.logEvent = logging.logEvent, this.logError = logging.logError, this.logWarning = logging.logWarning, this.logClient = logging.logClient, this.logClientError = logging.logClientError;
      _ref = this.options, this.serverAddress = _ref.serverAddress, this.serverPort = _ref.serverPort, this.templatePath = _ref.templatePath, this.dataPath = _ref.dataPath;
      this.helper = new TemplateUtils(this.logWarning);
      _.extend(this.options.document, {
        templateType: this.helper.getTemplateType(this.templatePath)
      });
      this.on('all', this.logEvent, this);
    }

    NotaServer.prototype.start = function() {
      var deferred;
      deferred = Q.defer();
      this.trigger("server:init");
      this.app = express();
      this.server = http.createServer(this.app);
      this.app.use(express["static"](this.templatePath));
      this.app.get('/', function(req, res) {
        return res.redirect("/template.html");
      });
      this.app.use('/lib/', express["static"]("" + __dirname + "/"));
      this.app.use('/assets/', express["static"]("" + __dirname + "/../assets/"));
      this.app.use('/vendor/', express["static"]("" + __dirname + "/../bower_components/"));
      this.app.use('/nota.js', express["static"]("" + __dirname + "/client.js"));
      this.app.get('/data', (function(_this) {
        return function(req, res) {
          return res.send(fs.readFileSync(_this.dataPath, {
            encoding: 'utf8'
          }));
        };
      })(this));
      this.server.listen(this.serverPort);
      this.trigger("server:running");
      if (this.options.preview) {
        return this;
      }
      this.document = new Document(this, this.options.document);
      this.document.on('all', this.logEvent);
      if (this.options.listen) {
        this.document.once('page:ready', (function(_this) {
          return function() {
            return _this.listen().then(deferred.resolve);
          };
        })(this));
      } else {
        this.document.once('page:ready', (function(_this) {
          return function() {
            return deferred.resolve();
          };
        })(this));
      }
      return deferred.promise;
    };

    NotaServer.prototype.url = function() {
      return "http://" + this.serverAddress + ":" + this.serverPort + "/";
    };

    NotaServer.prototype.webrenderUrl = function() {
      return "http://" + this.serverAddress + ":" + this.serverPort + "/render";
    };

    NotaServer.prototype.serve = function(dataPath) {
      this.dataPath = dataPath;
    };

    NotaServer.prototype.queue = function() {
      var deferred, jobs, options;
      deferred = Q.defer();
      if (arguments[0] instanceof JobQueue) {
        this.jobQueue = arguments[0];
      } else {
        jobs = arguments[0];
        options = arguments[1] || {};
        _.extend(options, {
          deferFinish: deferred,
          templateType: this.document.options.templateType
        });
        this.jobQueue = new JobQueue(jobs, options);
      }
      switch (this.jobQueue.options.templateType) {
        case 'static':
          this.after('page:rendered', (function(_this) {
            return function() {
              return _this.renderStatic(_this.jobQueue);
            };
          })(this));
          break;
        case 'scripted':
          this.after('page:ready', (function(_this) {
            return function() {
              return _this.renderScripted(_this.jobQueue);
            };
          })(this));
      }
      return deferred.promise;
    };

    NotaServer.prototype.renderStatic = function(queue) {
      var job, start;
      job = queue.nextJob();
      start = new Date();
      return this.document.capture(job).then((function(_this) {
        return function(meta) {
          var finished;
          finished = new Date();
          meta.duration = finished - start;
          queue.jobCompleted(meta);
          if (!queue.isFinished()) {
            return _this.renderStatic(queue);
          }
        };
      })(this));
    };

    NotaServer.prototype.renderScripted = function(queue) {
      var error, inProgressJobs, job, offerData, postRender, renderJob, start;
      if ((inProgressJobs = queue.inProgress())) {
        if (typeof this.logWarning === "function") {
          this.logWarning("Attempting to render while already occupied with jobs:\n\n" + inProgressJobs + "\n\nRejecting this render call.\n\nFor multithreaded rendering of a queue please create another server\ninstance (don't forget to provide it with an unoccupied port).");
        }
        return;
      }
      job = queue.nextJob();
      start = new Date();
      this.document.on('error-timeout', function(err) {
        var meta;
        meta = _.extend({}, job, {
          fail: err
        });
        return postRender(meta);
      });
      offerData = (function(_this) {
        return function(job) {
          var data, deferred;
          deferred = Q.defer();
          data = job.data || JSON.parse(fs.readFileSync(job.dataPath, {
            encoding: 'utf8'
          }));
          _this.document.injectData(data).then(function() {
            return deferred.resolve(job);
          });
          return deferred.promise;
        };
      })(this);
      renderJob = (function(_this) {
        return function(job) {
          var deferred;
          deferred = Q.defer();
          _this.after('page:rendered', function() {
            return _this.document.capture(job);
          });
          _this.document.once('render:done', deferred.resolve);
          return deferred.promise;
        };
      })(this);
      postRender = (function(_this) {
        return function(meta) {
          var finished;
          finished = new Date();
          meta.duration = finished - start;
          if (meta.fail != null) {
            queue.jobFailed(job, meta);
          } else {
            queue.jobCompleted(job, meta);
          }
          if (typeof _this.log === "function") {
            _this.log("Job duration: " + ((meta.duration / 1000).toFixed(2)) + " seconds");
          }
          if (!queue.isFinished()) {
            return _this.renderScripted(queue);
          }
        };
      })(this);
      error = function(err) {
        return this.logError(err);
      };
      if ((job.dataPath != null) || (job.data != null)) {
        return offerData(job).then(renderJob).then(postRender)["catch"](error);
      } else {
        return renderJob(job).then(postRender)["catch"](error);
      }
    };

    NotaServer.prototype.listen = function() {
      var bodyParser, deferred, motd;
      deferred = Q.defer();
      bodyParser = require('body-parser');
      this.app.use(bodyParser.json());
      this.app.use(bodyParser.urlencoded({
        extended: true
      }));
      this.app.post('/render', this.webRender);
      this.app.get('/render', this.webRenderInterface);
      motd = "Listening at " + (chalk.cyan('http://localhost:' + this.serverPort + '/render')) + " for POST requests";
      this.ipLookup().then((function(_this) {
        return function(ip) {
          if (typeof _this.log === "function") {
            _this.log("" + motd + "\n\nLAN: http://" + ip.lan + ":" + _this.serverPort + "/render\nWAN: http://" + ip.wan + ":" + _this.serverPort + "/render\n");
          }
          return deferred.resolve();
        };
      })(this))["catch"]((function(_this) {
        return function(err) {
          console.log(err);
          if (typeof _this.log === "function") {
            _this.log(motd);
          }
          return deferred.resolve();
        };
      })(this));
      return deferred.promise;
    };

    NotaServer.prototype.ipLookup = function() {
      var deferred;
      deferred = Q.defer();
      require('dns').lookup(require('os').hostname(), (function(_this) {
        return function(errLan, ipLan, fam) {
          if (errLan != null) {
            return deferred.reject(errLan);
          }
          return require('externalip')(function(errExt, ipExt) {
            if (errExt != null) {
              return deferred.reject(errExt);
            }
            _this.ip = {
              lan: ipLan,
              wan: ipExt
            };
            return deferred.resolve(_this.ip);
          });
        };
      })(this));
      return deferred.promise;
    };

    NotaServer.prototype.webRenderInterface = function(req, res) {
      return res.send(fs.readFileSync("" + __dirname + "/../assets/webrender.html", {
        encoding: 'utf8'
      }));
    };

    NotaServer.prototype.webRender = function(req, res) {
      return mkdirp(this.options.webrenderPath, (function(_this) {
        return function(err) {
          var job;
          if (err) {
            return _this.logError("Nota requires write access to " + (chalk.cyan(options.webrenderPath)) + ". Error: " + err);
          }
          job = {
            data: req.body,
            outputPath: _this.options.webrenderPath
          };
          return _this.queue(job).then(function(meta) {
            if (meta[0].fail != null) {
              return res.send('fuck');
            } else {
              return res.download(Path.resolve(meta[0].outputPath));
            }
          });
        };
      })(this));
    };

    NotaServer.prototype.after = function(event, callback, context) {
      if (this.document.state === event) {
        return callback.apply(context || this);
      } else {
        return this.document.once(event, callback, context);
      }
    };

    NotaServer.prototype.close = function() {
      this.trigger('server:closing');
      this.document.close();
      this.server.close();
      return this.server.off('all', this.logEvent, this);
    };

    return NotaServer;

  })();

}).call(this);

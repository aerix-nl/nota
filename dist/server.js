(function() {
  var Backbone, Document, JobQueue, NotaServer, Path, Q, TemplateHelper, chalk, express, fs, http, open, phantom, s, _,
    __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };

  _ = require('underscore')._;

  s = require('underscore.string');

  chalk = require('chalk');

  http = require('http');

  express = require('express');

  phantom = require('phantom');

  fs = require('fs');

  Q = require('q');

  Path = require('path');

  open = require("open");

  Backbone = require('backbone');

  Document = require('./document');

  TemplateHelper = require('./template_helper');

  JobQueue = require('./queue');

  module.exports = NotaServer = (function() {
    function NotaServer(options, logChannels) {
      var _ref;
      this.options = options;
      this.webRender = __bind(this.webRender, this);
      this.webRenderInterface = __bind(this.webRenderInterface, this);
      this.webrenderUrl = __bind(this.webrenderUrl, this);
      this.url = __bind(this.url, this);
      _.extend(this, Backbone.Events);
      this.log = logChannels.log, this.logEvent = logChannels.logEvent, this.logError = logChannels.logError, this.logWarning = logChannels.logWarning, this.logClient = logChannels.logClient, this.logClientError = logChannels.logClientError;
      _ref = this.options, this.serverAddress = _ref.serverAddress, this.serverPort = _ref.serverPort, this.templatePath = _ref.templatePath, this.dataPath = _ref.dataPath;
      this.helper = new TemplateHelper(this.logWarning);
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
          res.setHeader('Content-Type', 'application/json');
          return res.send(fs.readFileSync(_this.dataPath, {
            encoding: 'utf8'
          }));
        };
      })(this));
      this.server.listen(this.serverPort);
      this.trigger("server:running");
      if (this.options.preview) {
        deferred.resolve();
      } else {
        this.document = new Document(this, this.options.document);
        this.document.on('all', this.logEvent);
        this.document.once('page:ready', (function(_this) {
          return function() {
            if (_this.options.listen) {
              _this.listen();
            }
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
      var deferred;
      deferred = Q.defer();
      this.jobQueue = this.parseQueueArgs(arguments, deferred);
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

    NotaServer.prototype.parseQueueArgs = function(args, deferred) {
      var jobQueue, jobs, options;
      if (args[0] instanceof JobQueue) {
        return jobQueue = args[0];
      } else {
        if (args[0] instanceof Array) {
          jobs = args[0];
        } else if (args[0] instanceof Object && ((args[0].data != null) || (args[0].dataPath != null))) {
          jobs = [args[0]];
        }
        options = args[1] || {};
        _.extend(options, {
          deferFinish: deferred,
          templateType: this.document.options.templateType
        });
        return jobQueue = new JobQueue(jobs, options);
      }
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
      var bodyParser, mkdirp;
      mkdirp = require('mkdirp');
      bodyParser = require('body-parser');
      this.Handlebars = require('handlebars');
      mkdirp(this.options.webrenderPath, (function(_this) {
        return function(err) {
          if (err) {
            throw new Error("Unable to create render output path " + (chalk.cyan(options.webrenderPath)) + ". Error: " + err);
          }
        };
      })(this));
      this.app.use(bodyParser.json());
      this.app.use(bodyParser.urlencoded({
        extended: true
      }));
      this.app.post('/render', this.webRender);
      this.app.get('/render', this.webRenderInterface);
      if (typeof this.log === "function") {
        this.log("Listening at " + (chalk.cyan('http://localhost:' + this.serverPort + '/render')) + " for POST requests");
      }
      if (this.options.logging.webrenderAddress) {
        return this.ipLookups().then((function(_this) {
          return function(ip) {
            _this.ip = ip;
            if (_this.ip.lan != null) {
              if (typeof _this.log === "function") {
                _this.log("LAN address: " + chalk.cyan("http://" + ip.lan + ":" + _this.serverPort + "/render"));
              }
            }
            if (_this.ip.wan != null) {
              return typeof _this.log === "function" ? _this.log("WAN address: " + chalk.cyan("http://" + ip.wan + ":" + _this.serverPort + "/render")) : void 0;
            }
          };
        })(this))["catch"]((function(_this) {
          return function(err) {
            return typeof _this.log === "function" ? _this.log(err) : void 0;
          };
        })(this));
      }
    };

    NotaServer.prototype.ipLookups = function() {
      var deferred, ext, local, reject, timeout;
      deferred = Q.defer();
      timeout = 2000;
      local = this.ipLookupLocal();
      ext = this.ipLookupExt();
      reject = function() {
        if (local.inspect().status === "fulfilled") {
          return deferred.resolve({
            lan: local.inspect().value
          });
        }
        if (ext.inspect().status === "fulfilled") {
          return deferred.resolve({
            wan: ext.inspect().value
          });
        }
        return deferred.reject("LAN and WAN IP lookup canceled after timeout of " + timeout + "ms");
      };
      setTimeout(reject, timeout);
      local.then(function(localIp) {
        return ext.then(function(extIp) {
          return deferred.resolve({
            lan: localIp,
            wan: extIp
          });
        });
      });
      return deferred.promise;
    };

    NotaServer.prototype.ipLookupLocal = function() {
      var deferred;
      deferred = Q.defer();
      require('dns').lookup(require('os').hostname(), (function(_this) {
        return function(errLan, ipLan, fam) {
          if (errLan != null) {
            return deferred.reject(errLan);
          }
          return deferred.resolve(ipLan);
        };
      })(this));
      return deferred.promise;
    };

    NotaServer.prototype.ipLookupExt = function() {
      var deferred;
      deferred = Q.defer();
      require('externalip')((function(_this) {
        return function(errExt, ipExt) {
          if (errExt != null) {
            return deferred.reject(errExt);
          }
          return deferred.resolve(ipExt);
        };
      })(this));
      return deferred.promise;
    };

    NotaServer.prototype.webRenderInterface = function(req, res) {
      var definition, html, template, webRenderHTML;
      html = fs.readFileSync("" + __dirname + "/../assets/webrender.html", {
        encoding: 'utf8'
      });
      template = this.Handlebars.compile(html);
      definition = this.helper.getTemplateDefinition(this.templatePath);
      webRenderHTML = template({
        template: definition,
        serverPort: this.serverPort,
        ip: this.ip
      });
      return res.send(webRenderHTML);
    };

    NotaServer.prototype.webRender = function(req, res) {
      var job;
      if (!this.reqPreconditions(req, res)) {
        return;
      }
      job = {
        data: req.body.data,
        outputPath: this.options.webrenderPath
      };
      return this.queue(job).then(function(meta) {
        var pdf;
        if (meta[0].fail != null) {
          return res.status(500).send("An error occured while rendering: " + meta[0].fail);
        } else {
          pdf = Path.resolve(meta[0].outputPath);
          return res.download(pdf);
        }
      });
    };

    NotaServer.prototype.reqPreconditions = function(req, res) {
      var e;
      if (req.body.data == null) {
        res.status(400).send("The <code>data</code> field of the request was undefined. Please provide a template model instance that you'd like to render into your template. See the <a href='/render#rest-api'>REST-API documentation</a> of the webrender service.").end();
        return false;
      } else if (typeof req.body.data === 'string') {
        try {
          req.body.data = JSON.parse(req.body.data);
        } catch (_error) {
          e = _error;
          res.status(400).send("Could not parse data string. Server expects a JSON string as the data field. Error: " + e).end();
          return false;
        }
      }
      if (req.body.data === {}) {
        res.status(400).send("Empty data object received");
        return false;
      }
      return true;
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

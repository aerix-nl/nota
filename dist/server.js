(function() {
  var Backbone, Document, JobQueue, NotaServer, Q, TemplateUtils, express, fs, http, open, phantom, s, _,
    __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };

  _ = require('underscore')._;

  s = require('underscore.string');

  http = require('http');

  express = require('express');

  phantom = require('phantom');

  fs = require('fs');

  Q = require('q');

  open = require("open");

  Backbone = require('backbone');

  Document = require('./document');

  TemplateUtils = require('./template_utils');

  JobQueue = require('./queue');

  module.exports = NotaServer = (function() {
    function NotaServer(options, logging) {
      var _ref;
      this.options = options;
      this.url = __bind(this.url, this);
      _.extend(this, Backbone.Events);
      this.logEvent = logging.logEvent, this.logError = logging.logError, this.logWarning = logging.logWarning;
      _ref = this.options, this.serverAddress = _ref.serverAddress, this.serverPort = _ref.serverPort, this.templatePath = _ref.templatePath, this.dataPath = _ref.dataPath;
      this.helper = new TemplateUtils(this.logWarning);
    }

    NotaServer.prototype.start = function() {
      var logging;
      this.on('all', this.logEvent, this);
      this.trigger("server:init");
      this.app = express();
      this.server = http.createServer(this.app);
      this.app.use(express["static"](this.templatePath));
      this.app.get('/', function(req, res) {
        return res.redirect("/template.html");
      });
      this.app.use('/lib/', express["static"]("" + __dirname + "/"));
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
      logging = {
        logEvent: this.logEvent,
        logWarning: this.logWarning,
        logError: this.logError
      };
      return this.document = new Document(this, this.options.document);
    };

    NotaServer.prototype.url = function() {
      return "http://" + this.serverAddress + ":" + this.serverPort + "/";
    };

    NotaServer.prototype.serve = function(dataPath) {
      this.dataPath = dataPath;
    };

    NotaServer.prototype.queue = function(jobs, options) {
      _.extend(options, {
        templateType: this.helper.getTemplateType(this.templatePath)
      });
      this.queue = new JobQueue(jobs, options);
      console.log(this.queue.options.type);
      console.log(this.document.state);
      switch (this.queue.options.type) {
        case 'static':
          return this.document.once("page:rendered", (function(_this) {
            return function() {
              return _this.renderStatic(_this.queue);
            };
          })(this));
        case 'scripted':
          return this.document.once('page:ready', (function(_this) {
            return function() {
              return _this.renderScripted(_this.queue);
            };
          })(this));
      }
    };

    NotaServer.prototype.renderStatic = function(queue) {
      var job, _results;
      _results = [];
      while (job = queue.nextJob()) {
        _results.push((function(_this) {
          return function(job) {
            _this.document.capture(job);
            return _this.document.once('render:done', queue.completeJob, queue);
          };
        })(this)(job));
      }
      return _results;
    };

    NotaServer.prototype.renderScripted = function(queue) {
      var currentJob, error, offerData, postRender, queueJob, renderJob;
      currentJob = queue.nextJob();
      queueJob = (function(_this) {
        return function(job) {
          var deferred;
          deferred = Q.defer();
          if (_this.document.state === 'page:ready') {
            deferred.resolve(job);
          } else {
            _this.document.once('page:ready', function() {
              return deferred.resolve(job);
            });
          }
          return deferred.promise;
        };
      })(this);
      offerData = (function(_this) {
        return function(job) {
          var data, deferred;
          deferred = Q.defer();
          console.log(44);
          data = JSON.parse(fs.readFileSync(job.dataPath, {
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
          if (_this.document.state === 'page:rendered') {
            _this.document.capture(job);
          } else {
            _this.document.once('page:rendered', function() {
              return _this.document.capture(job);
            });
          }
          _this.document.once('render:done', deferred.resolve);
          return deferred.promise;
        };
      })(this);
      postRender = (function(_this) {
        return function(meta) {
          queue.completeJob(meta);
          if (!queue.isFinished()) {
            return _this.renderScripted(queue);
          }
        };
      })(this);
      error = function(err) {
        return this.logError("Page loaded but still in state: " + clst + " (if it's a loading state, consider increasing the timeout in default-config.json)");
      };
      if (currentJob.dataPath != null) {
        return queueJob(currentJob).then(offerData).then(renderJob).then(postRender)["catch"](error);
      } else {
        return queueJob(currentJob).then(renderJob).then(postRender)["catch"](error);
      }
    };

    NotaServer.prototype.close = function() {
      this.trigger('server:closing');
      this.document.close();
      this.server.close();
      this.server.off('all', this.logEvent, this);
      return process.exit();
    };

    return NotaServer;

  })();

}).call(this);

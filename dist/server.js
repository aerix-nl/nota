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
      this.log = logging.log, this.logEvent = logging.logEvent, this.logError = logging.logError, this.logWarning = logging.logWarning;
      _ref = this.options, this.serverAddress = _ref.serverAddress, this.serverPort = _ref.serverPort, this.templatePath = _ref.templatePath, this.dataPath = _ref.dataPath;
      this.helper = new TemplateUtils(this.logWarning);
      _.extend(this.options.document, {
        templateType: this.helper.getTemplateType(this.templatePath)
      });
    }

    NotaServer.prototype.start = function() {
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
      this.document = new Document(this, this.options.document);
      return this.document.on('all', this.logEvent);
    };

    NotaServer.prototype.url = function() {
      return "http://" + this.serverAddress + ":" + this.serverPort + "/";
    };

    NotaServer.prototype.serve = function(dataPath) {
      this.dataPath = dataPath;
    };

    NotaServer.prototype.queue = function() {
      var deferred, jobs, options;
      deferred = Q.defer();
      if (arguments[0] instanceof JobQueue) {
        this.queue = arguments[0];
      } else {
        jobs = arguments[0];
        options = arguments[1] || {};
        _.extend(options, {
          deferFinish: deferred,
          templateType: this.document.options.templateType
        });
        this.queue = new JobQueue(jobs, options);
      }
      switch (this.queue.options.templateType) {
        case 'static':
          this.document.once('page:rendered', (function(_this) {
            return function() {
              return _this.renderStatic(_this.queue);
            };
          })(this));
          break;
        case 'scripted':
          this.document.once('page:ready', (function(_this) {
            return function() {
              return _this.renderScripted(_this.queue);
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
          queue.completeJob(meta);
          if (!queue.isFinished()) {
            return _this.renderStatic(queue);
          }
        };
      })(this));
    };

    NotaServer.prototype.renderScripted = function(queue) {
      var error, job, offerData, postRender, renderJob, start;
      job = queue.nextJob();
      start = new Date();
      offerData = (function(_this) {
        return function(job) {
          var data, deferred;
          deferred = Q.defer();
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
          var finished;
          finished = new Date();
          meta.duration = finished - start;
          queue.completeJob(meta);
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
      if (job.dataPath != null) {
        return offerData(job).then(renderJob).then(postRender)["catch"](error);
      } else {
        return renderJob(job).then(postRender)["catch"](error);
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

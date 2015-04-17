(function() {
  var Backbone, Document, JobQueue, NotaServer, Q, TemplateUtils, express, fs, http, open, phantom, _,
    __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };

  _ = require('underscore')._;

  _.str = require('underscore.string');

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
      this.helper = new TemplateUtils();
      this.logEvent = logging.logEvent, this.logError = logging.logError, this.logWarning = logging.logWarning;
      _ref = this.options, this.serverAddress = _ref.serverAddress, this.serverPort = _ref.serverPort, this.templatePath = _ref.templatePath, this.dataPath = _ref.dataPath;
      _.extend(this.options.document, {
        templateType: this.helper.getTemplateType(this.templatePath)
      });
    }

    NotaServer.prototype.start = function() {
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
      return this.document = new Document(this, this.options.document);
    };

    NotaServer.prototype.url = function() {
      return "http://" + this.serverAddress + ":" + this.serverPort + "/";
    };

    NotaServer.prototype.serve = function(dataPath) {
      this.dataPath = dataPath;
    };

    NotaServer.prototype.queue = function(jobs, options) {
      this.queue = new JobQueue(jobs, options);
      switch (this.queue.options.type) {
        case 'static':
          return this.document.once("page:rendered", (function(_this) {
            return function() {
              return _this.renderStatic(_this.queue);
            };
          })(this));
        case 'scripted':
          return this.document.once('page:opened', (function(_this) {
            return function() {
              return _this.renderscripted(_this.queue);
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
            return _this.document.once('render:done', _this.queue.completeJob, _this.queue);
          };
        })(this)(job));
      }
      return _results;
    };

    NotaServer.prototype.renderscripted = function(queue) {
      var currentJob, offerData, postRender, renderJob;
      currentJob = queue.nextJob();
      offerData = (function(_this) {
        return function(job) {
          var data, deferred;
          deferred = Q.defer();
          data = JSON.parse(fs.readFileSync(job.dataPath, {
            encoding: 'utf8'
          }));
          console.log(_this.document.state);
          if (_this.document.state === 'client:template:loaded') {
            _this.document.injectData(data);
            deferred.resolve(job);
          } else {
            _this.document.once('client:template:loaded', function() {
              _this.document.injectData(data);
              return deferred.resolve(job);
            });
            _this.document.once('page:loaded', function() {
              if (_this.document.state === 'page:loaded') {
                return deferred.resolve(_this.document.state);
              } else if (_this.document.state === 'client:init') {
                return deferred.reject('client-loading');
              } else if (_this.document.state === 'client:loaded') {
                return deferred.reject('template-unregistered');
              } else if (_this.document.state === 'client:template:init') {
                return deferred.reject('template-loading');
              }
            });
          }
          return deferred.promise;
        };
      })(this);
      renderJob = (function(_this) {
        return function(job) {
          var deferred;
          deferred = Q.defer();
          _this.document.once('page:rendered', function() {
            return _this.document.capture(job);
          });
          _this.document.once('render:done', deferred.resolve);
          return deferred.promise;
        };
      })(this);
      postRender = (function(_this) {
        return function(meta) {
          queue.completeJob(meta);
          if (!queue.isFinished()) {
            return _this.renderscripted(queue);
          }
        };
      })(this);
      return offerData(currentJob).then(renderJob).then(postRender)["catch"](function(err) {
        return this.logError("Page loaded but still in state: " + clst);
      });
    };

    NotaServer.prototype.close = function() {
      this.trigger('server:closing');
      this.document.close();
      this.server.close();
      return process.exit();
    };

    return NotaServer;

  })();

}).call(this);

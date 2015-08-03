(function() {
  var Nota, Path, Q, fs, _,
    __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };

  Path = require('path');

  Q = require('q');

  fs = require('fs');

  _ = require('underscore');

  module.exports = Nota = (function() {
    Nota.Server = require(Path.join(__dirname, 'server'));

    Nota.Document = require(Path.join(__dirname, 'document'));

    Nota.Webrender = require(Path.join(__dirname, 'webrender_server'));

    Nota.JobQueue = require(Path.join(__dirname, 'queue'));

    Nota.TemplateHelper = require(Path.join(__dirname, 'template_helper'));

    Nota.LoggingChannels = require(Path.join(__dirname, 'logging'));

    Nota.defaults = require(Path.join(__dirname, '../config-default.json'));

    Nota.meta = require(Path.join(__dirname, '../package.json'));

    function Nota(options, logging) {
      this.options = options;
      this.logging = logging;
      this.queue = __bind(this.queue, this);
      if (this.options == null) {
        this.options = this.defaults;
      }
      if (this.logging == null) {
        this.logging = require('./logging')(this.options);
      }
      this.helper = new Nota.TemplateHelper(this.logging);
      this.server = new Nota.Server(this.options, this.logging);
    }

    Nota.prototype.start = function(apis, template) {
      this.template = template;
      apis = _.extend({
        server: true
      }, apis);
      if (apis.webrender) {
        this.webrender = new Nota.Webrender(this.queue, this.options, this.logging);
        this.server.use(this.webrender);
      }
      if (this.template != null) {
        this.setTemplate(this.template);
      }
      return this.server.start();
    };

    Nota.prototype.setTemplate = function(template, phantom) {
      var deferred;
      if (phantom == null) {
        phantom = false;
      }
      if ((template != null ? template.path : void 0) == null) {
        throw new Error("No template path provided.");
      }
      deferred = Q.defer();
      this.server.setTemplate(template);
      if (this.webrender != null) {
        this.webrender.setTemplate(template);
      }
      if ((this.document != null) && (this.document.options.template.path !== template.path)) {
        this.document.close();
        delete this.document;
      }
      if ((this.document == null) && phantom) {
        this.document = new Nota.Document(this.server.url(), this.logging, this.options);
        this.document.on('all', this.logging.logEvent, this.logging);
        this.document.once('page:ready', (function(_this) {
          return function() {
            return deferred.resolve();
          };
        })(this));
      } else {
        deferred.resolve();
      }
      return deferred.promise;
    };

    Nota.prototype.setData = function(data) {
      return this.server.setData(data);
    };

    Nota.prototype.queue = function() {
      var deferred, err;
      deferred = Q.defer();
      try {
        this.jobQueue = this.parseQueueArgs(arguments, deferred);
      } catch (_error) {
        err = _error;
        deferred.reject(err);
      }
      this.setTemplate(this.jobQueue.template, true).then((function(_this) {
        return function() {
          switch (_this.jobQueue.template.type) {
            case 'static':
              return _this.after('page:rendered').then(function() {
                return _this.renderStatic(_this.jobQueue);
              });
            case 'scripted':
              return _this.after('page:ready').then(function() {
                return _this.renderScripted(_this.jobQueue);
              });
          }
        };
      })(this));
      return deferred.promise;
    };

    Nota.prototype.parseQueueArgs = function(args, deferred) {
      var jobQueue, jobs, template, templateRequiredError, _ref, _ref1;
      templateRequiredError = new Error("No template loaded yet. Please provide a template with the initial job queue call. Subsequent jobs on the same template can omit the template specification.");
      if (args[0] instanceof Nota.JobQueue) {
        jobQueue = args[0];
        if (!jobQueue.length > 0) {
          throw new Error("Empty job queue provided");
        }
        if ((jobQueue.template.path == null) && !((_ref = this.document) != null ? _ref.options.template.path : void 0)) {
          throw templateRequiredError;
        }
      } else {
        if (args[0] instanceof Array) {
          jobs = args[0];
        } else if (args[0] instanceof Object && ((args[0].data != null) || (args[0].dataPath != null))) {
          jobs = [args[0]];
        }
        template = args[1] || {};
        if (!((_ref1 = this.document) != null ? _ref1.options.template.path : void 0) && (template.path == null)) {
          throw templateRequiredError;
        }
        template.type = this.helper.getTemplateType(template.path);
        return jobQueue = new Nota.JobQueue(jobs, template, deferred);
      }
    };

    Nota.prototype.renderStatic = function(queue) {
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

    Nota.prototype.renderScripted = function(queue) {
      var error, inProgressJobs, job, postRender, renderJob, start, _base;
      if ((inProgressJobs = queue.inProgress())) {
        if (typeof (_base = this.logging).logWarning === "function") {
          _base.logWarning("Attempting to render while already occupied with jobs:\n\n" + inProgressJobs + "\n\nRejecting this render call.\n\nFor multithreaded rendering of a queue please create another server\ninstance (don't forget to provide it with an unoccupied port).");
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
      renderJob = (function(_this) {
        return function(job) {
          var deferred;
          deferred = Q.defer();
          _this.after('page:rendered').then(function() {
            return _this.document.capture(job);
          });
          _this.document.once('render:done', deferred.resolve);
          return deferred.promise;
        };
      })(this);
      postRender = (function(_this) {
        return function(meta) {
          var finished, _base1;
          finished = new Date();
          meta.duration = finished - start;
          if (meta.fail != null) {
            queue.jobFailed(job, meta);
          } else {
            queue.jobCompleted(job, meta);
          }
          if (typeof (_base1 = _this.logging).log === "function") {
            _base1.log("Job duration: " + ((meta.duration / 1000).toFixed(2)) + " seconds");
          }
          if (!queue.isFinished()) {
            return _this.renderScripted(queue);
          }
        };
      })(this);
      error = function(err) {
        return this.logging.logError(err);
      };
      this.setData(job.data || job.dataPath);
      return renderJob(job).then(postRender)["catch"](error);
    };

    Nota.prototype.after = function(event) {
      var defer;
      defer = Q.defer();
      if (this.document.state === event) {
        defer.resolve();
      } else {
        this.document.once(event, defer.resolve());
      }
      return defer.promise;
    };

    return Nota;

  })();

}).call(this);

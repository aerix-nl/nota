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

    Nota.prototype.setTemplate = function(template) {
      if ((template != null ? template.path : void 0) == null) {
        throw new Error("No template path provided.");
      }
      this.server.setTemplate(template);
      if (this.webrender != null) {
        this.webrender.setTemplate(template);
      }
      if ((this.document != null) && (this.document.options.template.path !== template.path)) {
        this.document.close();
        return delete this.document;
      }
    };

    Nota.prototype.openDocument = function() {
      var deferred;
      deferred = Q.defer();
      if (this.document == null) {
        this.document = new Nota.Document(this.server.url(), this.logging, this.options);
        this.document.on('all', this.logging.logEvent, this.logging);
      }
      this.document.init.promise.then(deferred.resolve);
      this.document.init.promise.fail(deferred.reject);
      return deferred.promise;
    };

    Nota.prototype.renderData = function(data) {
      this.server.setData(data);
      return this.document.renderData(data);
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
      this.setTemplate(this.jobQueue.template, true);
      switch (this.jobQueue.template.type) {
        case 'static':
          this.renderStatic(this.jobQueue);
          break;
        case 'scripted':
          this.renderScripted(this.jobQueue);
      }
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
      return this.openDocument().then((function(_this) {
        return function() {
          return _this.document.capture(job);
        };
      })(this)).then((function(_this) {
        return function(meta) {
          var finished;
          finished = new Date();
          meta.duration = finished - start;
          queue.jobCompleted(meta);
          if (!queue.isFinished()) {
            return _this.renderStatic(queue);
          }
        };
      })(this)).fail(this.logging.logError);
    };

    Nota.prototype.renderScripted = function(queue) {
      var afterJob, inProgressJobs, job, start, _base;
      if ((inProgressJobs = queue.inProgress())) {
        if (typeof (_base = this.logging).logWarning === "function") {
          _base.logWarning("Attempting to render while already occupied with jobs:\n\n" + inProgressJobs + "\n\nRejecting this render call.\n\nFor multithreaded rendering of a queue please create another server\ninstance (don't forget to provide it with an unoccupied port).");
        }
        return;
      }
      job = queue.nextJob();
      start = new Date();
      afterJob = (function(_this) {
        return function(meta, error) {
          var finished;
          if (error != null) {
            meta = _.extend({}, job, {
              fail: error
            });
          }
          finished = new Date();
          meta.duration = finished - start;
          if (meta.fail != null) {
            queue.jobFailed(job, meta);
          } else {
            queue.jobCompleted(job, meta);
          }
          if (!queue.isFinished()) {
            return _this.renderScripted(queue);
          }
        };
      })(this);
      return this.openDocument().then((function(_this) {
        return function() {
          return _this.renderData(job.data || job.dataPath);
        };
      })(this)).then((function(_this) {
        return function() {
          return _this.document.capture(job);
        };
      })(this)).then(afterJob)["catch"](function(error) {
        return afterJob(null, error);
      });
    };

    return Nota;

  })();

}).call(this);

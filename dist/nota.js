(function() {
  var Nota, Path, Q, fs, _;

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
      if (this.options == null) {
        this.options = this.defaults;
      }
      if (this.logging == null) {
        this.logging = require('./logging')(this.options);
      }
      this.helper = new Nota.TemplateHelper(this.logging);
      this.server = new Nota.Server(this.options, this.logging);
      if (this.options.listen) {
        this.webrender = new Nota.Webrender(this.server.app, this.options, this.logging);
        this.webrender.start();
      }
      this.server.start();
    }

    Nota.prototype.setTemplate = function(template) {
      var deferred, differentTemplate;
      if ((template != null ? template.path : void 0) == null) {
        throw new Error("No template path provided.");
      }
      deferred = Q.defer();
      if (this.document != null) {
        differentTemplate = this.document.options.template.path !== template.path;
        if (differentTemplate) {
          this.document.close();
          delete this.document;
        }
      }
      if (this.document == null) {
        this.server.setTemplate(template);
        this.document = new Nota.Document(this.server.url(), this.logging, this.options);
        this.document.on('all', this.logging.logEvent, this.logging);
        this.document.once('page:ready', (function(_this) {
          return function() {
            return deferred.resolve();
          };
        })(this));
      }
      return deferred.promise;
    };

    Nota.prototype.queue = function() {
      var deferred;
      deferred = Q.defer();
      this.jobQueue = this.parseQueueArgs(arguments, deferred);
      this.setTemplate(this.jobQueue.template).then((function(_this) {
        return function() {
          var e;
          try {
            switch (_this.jobQueue.template.type) {
              case 'static':
                return _this.after('page:rendered', function() {
                  return _this.renderStatic(_this.jobQueue);
                });
              case 'scripted':
                return _this.after('page:ready', function() {
                  return _this.renderScripted(_this.jobQueue);
                });
            }
          } catch (_error) {
            e = _error;
            return console.log(e);
          }
        };
      })(this));
      return deferred.promise;
    };

    Nota.prototype.parseQueueArgs = function(args, deferred) {
      var jobQueue, jobs, template, _ref;
      if (args[0] instanceof Nota.JobQueue) {
        return jobQueue = args[0];
      } else {
        if (args[0] instanceof Array) {
          jobs = args[0];
        } else if (args[0] instanceof Object && ((args[0].data != null) || (args[0].dataPath != null))) {
          jobs = [args[0]];
        }
        template = args[1] || {};
        if (!((_ref = this.document) != null ? _ref.options.template.path : void 0) && (template.path == null)) {
          throw new Error("No template loaded yet. Please provide a template with the initial job queue call. Subsequent jobs on the same template can omit the template specification.");
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
          _this.after('page:rendered', function() {
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
      if ((job.dataPath != null) || (job.data != null)) {
        this.server.setData(job.dataPath);
      }
      return renderJob(job).then(postRender)["catch"](error);
    };

    Nota.prototype.after = function(event, callback, context) {
      if (this.document.state === event) {
        return callback.apply(context || this);
      } else {
        return this.document.once(event, callback, context);
      }
    };

    return Nota;

  })();

}).call(this);

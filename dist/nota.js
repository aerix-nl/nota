(function() {
  var Nota, Path, Q;

  Path = require('path');

  Q = require('q');

  module.exports = Nota = (function() {
    Nota.Server = require(Path.join(__dirname, 'server'));

    Nota.Webrender = require(Path.join(__dirname, 'webrender_server'));

    Nota.JobQueue = require(Path.join(__dirname, 'queue'));

    Nota.TemplateHelper = require(Path.join(__dirname, 'template_helper'));

    Nota.LoggingChannels = require(Path.join(__dirname, 'logging'));

    Nota.defaults = require(Path.join(__dirname, '../config-default.json'));

    Nota.meta = require(Path.join(__dirname, '../package.json'));

    function Nota(options1, logging) {
      this.options = options1;
      this.logging = logging;
      if (this.options == null) {
        throw new Error("Server requires an Nota options hash. See `/config-default.json` and the NotaCLI parseOptions function.");
      }
      if (this.logging == null) {
        this.logging = require('./logging')(this.options);
      }
    }

    Nota.prototype.start = function() {
      var deferred;
      deferred = Q.defer();
      this.server = new Server(this.options, this.logging);
      if (this.options.listen) {
        this.webrender = new Webrender(this.server.app, this.options, this.logging);
        this.webrender.start();
      }
      this.server.start();
      if (this.options.preview) {
        deferred.resolve();
      } else {
        this.document = new Nota.Document(this, this.options.document);
        this.document.on('all', this.logging.logEvent);
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

    Nota.prototype.parseQueueArgs = function(args, deferred) {
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
        _.extend(options.document, {
          templateType: this.helper.getTemplateType(this.templatePath)
        });
        return jobQueue = new Nota.JobQueue(jobs, options);
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
      var base, error, inProgressJobs, job, offerData, postRender, renderJob, start;
      if ((inProgressJobs = queue.inProgress())) {
        if (typeof (base = this.logging).logWarning === "function") {
          base.logWarning("Attempting to render while already occupied with jobs:\n\n" + inProgressJobs + "\n\nRejecting this render call.\n\nFor multithreaded rendering of a queue please create another server\ninstance (don't forget to provide it with an unoccupied port).");
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
          var base1, finished;
          finished = new Date();
          meta.duration = finished - start;
          if (meta.fail != null) {
            queue.jobFailed(job, meta);
          } else {
            queue.jobCompleted(job, meta);
          }
          if (typeof (base1 = _this.logging).log === "function") {
            base1.log("Job duration: " + ((meta.duration / 1000).toFixed(2)) + " seconds");
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
        return offerData(job).then(renderJob).then(postRender)["catch"](error);
      } else {
        return renderJob(job).then(postRender)["catch"](error);
      }
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

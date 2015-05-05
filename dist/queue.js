(function() {
  var JobQueue, _,
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  _ = require('underscore')._;

  module.exports = JobQueue = (function(_super) {
    __extends(JobQueue, _super);

    function JobQueue(jobs, options) {
      var job, _i, _len, _ref;
      this.jobs = jobs;
      this.options = options;
      if (this.jobs.length === 0) {
        throw new Error("Creating empty job queue");
      }
      _ref = this.jobs;
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        job = _ref[_i];
        this.push(job);
      }
      this.meta = new Array(this.jobs.length);
    }

    JobQueue.prototype.jobCompleted = function(job, jobMeta) {
      var index, _ref;
      index = this.jobIndex(job);
      if (index === -1) {
        throw new Error('Mentioned job is not known in this qeueue');
      }
      this.meta[index] = jobMeta;
      if (this.isFinished()) {
        return (_ref = this.options.deferFinish) != null ? _ref.resolve(this.meta) : void 0;
      }
    };

    JobQueue.prototype.jobFailed = function(job, jobMeta) {
      return this.jobCompleted(job, jobMeta);
    };

    JobQueue.prototype.jobIndex = function(job) {
      return this.jobs.indexOf(job);
    };

    JobQueue.prototype.nextJob = function() {
      var deq;
      deq = this.splice(0, 1);
      if (deq.length === 1) {
        return deq[0];
      } else {
        return null;
      }
    };

    JobQueue.prototype.isFinished = function() {
      return this.length === 0;
    };

    JobQueue.prototype.inProgress = function() {
      var i, inProgress, job;
      inProgress = (function() {
        var _i, _len, _ref, _results;
        _ref = this.jobs;
        _results = [];
        for (i = _i = 0, _len = _ref.length; _i < _len; i = ++_i) {
          job = _ref[i];
          if (_(this).contains(job)) {
            continue;
          }
          if (meta[i] != null) {
            continue;
          }
          _results.push(job);
        }
        return _results;
      }).call(this);
      if (inProgress.length === 0) {
        return null;
      } else {
        return inProgress;
      }
    };

    return JobQueue;

  })(Array);

}).call(this);

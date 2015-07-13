(function() {
  var JobQueue, _,
    extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
    hasProp = {}.hasOwnProperty;

  _ = require('underscore')._;

  module.exports = JobQueue = (function(superClass) {
    extend(JobQueue, superClass);

    function JobQueue(jobs, options) {
      var j, job, len, ref;
      this.jobs = jobs;
      this.options = options;
      if (this.jobs.length === 0) {
        throw new Error("Creating empty job queue");
      }
      ref = this.jobs;
      for (j = 0, len = ref.length; j < len; j++) {
        job = ref[j];
        this.push(job);
      }
      this.meta = new Array(this.jobs.length);
    }

    JobQueue.prototype.jobCompleted = function(job, jobMeta) {
      var index, ref;
      index = this.jobIndex(job);
      if (index === -1) {
        throw new Error('Mentioned job is not known in this qeueue');
      }
      this.meta[index] = jobMeta;
      if (this.isFinished()) {
        return (ref = this.options.deferFinish) != null ? ref.resolve(this.meta) : void 0;
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
        var j, len, ref, results;
        ref = this.jobs;
        results = [];
        for (i = j = 0, len = ref.length; j < len; i = ++j) {
          job = ref[i];
          if (_(this).contains(job)) {
            continue;
          }
          if (meta[i] != null) {
            continue;
          }
          results.push(job);
        }
        return results;
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

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
      this.rendered = 0;
      this.meta = new Array(this.jobs.length);
    }

    JobQueue.prototype.dequeue = function() {
      return this.splice(0, 1);
    };

    JobQueue.prototype.completeJob = function(jobMeta) {
      var _base;
      this.meta[this.rendered] = jobMeta;
      this.rendered += 1;
      if (this.isFinished()) {
        return typeof (_base = this.options).callback === "function" ? _base.callback(this.meta) : void 0;
      }
    };

    JobQueue.prototype.nextJob = function() {
      var deq;
      deq = this.dequeue();
      if (deq.length === 1) {
        return deq[0];
      } else {
        return null;
      }
    };

    JobQueue.prototype.isFinished = function() {
      return this.length === 0;
    };

    return JobQueue;

  })(Array);

}).call(this);

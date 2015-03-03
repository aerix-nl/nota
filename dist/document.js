(function() {
  var Backbone, Document, Q, fs, phantom, _,
    __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };

  fs = require('fs');

  Q = require('q');

  phantom = require('phantom');

  _ = require('underscore')._;

  Backbone = require('backbone');

  Document = (function() {
    Document.prototype.timeout = 1500;

    function Document(server, options) {
      this.server = server;
      this.options = options;
      this.onResourceReceived = __bind(this.onResourceReceived, this);
      this.onResourceRequested = __bind(this.onResourceRequested, this);
      _.extend(this, Backbone.Events);
      phantom.create((function(_this) {
        return function(phantomInstance) {
          _this.phantomInstance = phantomInstance;
          return phantomInstance.createPage(function(page) {
            _this.page = page;
            _this.counter = [];
            _this.timer = null;
            _this.page.set('paperSize', _this.options.paperSize);
            _this.page.onConsoleMessage(function(msg) {
              return console.log(msg);
            });
            _this.page.set('onError', function(msg) {
              return console.error(msg);
            });
            _this.page.set('onCallback', function(msg) {
              return _this.trigger("client:" + msg);
            });
            _this.page.set('onResourceRequested', _this.onResourceRequested);
            _this.page.set('onResourceReceived', _this.onResourceReceived);
            return _this.trigger('document:ready');
          });
        };
      })(this));
    }

    Document.prototype.render = function(outputPath, callback, options) {
      var doRender;
      if (options == null) {
        options = {};
      }
      doRender = (function(_this) {
        return function() {
          _this.trigger("render:init");
          return _this.page.open(_this.server.url(), function(status) {
            _this.trigger("page:init");
            if (status === 'success') {
              return _this.once("page:ready", function() {
                return _this.page.render(outputPath, callback);
              });
            } else {
              throw new Error("Unable to load page: " + status);
            }
          });
        };
      })(this);
      if (this.page == null) {
        return this.once("document:ready", doRender);
      } else {
        return doRender();
      }
    };

    Document.prototype.onResourceRequested = function(request) {
      this.trigger("page:resource:requested");
      if (this.counter.indexOf(request.id) === -1) {
        this.counter.push(request.id);
        return clearTimeout(this.timer);
      }
    };

    Document.prototype.onResourceReceived = function(resource) {
      var i;
      this.trigger("page:resource:received");
      if (resource.stage !== "end" && (resource.redirectURL == null)) {
        return;
      }
      if ((i = this.counter.indexOf(resource.id)) === -1) {
        return;
      }
      this.counter.splice(i, 1);
      if (this.counter.length === 0) {
        return this.timer = setTimeout((function(_this) {
          return function() {
            return _this.trigger("page:ready");
          };
        })(this), this.timeout);
      }
    };

    Document.prototype.close = function() {
      this.page.close();
      return this.phantomInstance.exit();
    };

    return Document;

  })();

  module.exports = Document;

}).call(this);

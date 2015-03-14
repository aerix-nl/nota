(function() {
  var Backbone, Document, NotaHelper, Q, fs, path, phantom, _,
    __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };

  fs = require('fs');

  Q = require('q');

  path = require('path');

  phantom = require('phantom');

  _ = require('underscore')._;

  Backbone = require('backbone');

  NotaHelper = require('./helper');

  Document = (function() {
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
            _this.trigger('page:init');
            return _this.page.open(_this.server.url(), function(status) {
              if (status === 'success') {
                _this.trigger('page:opened');
                return _this.on('client:template:render:done', _this.onDataRendered, _this);
              } else {
                throw new Error("Unable to load page: " + status);
                _this.trigger('page:fail');
                return _this.close();
              }
            });
          });
        };
      })(this));
    }

    Document.prototype.getMeta = function(callback) {
      var getFn;
      getFn = function() {
        return Nota.getDocumentMeta();
      };
      return this.page.evaluate(getFn, (function(_this) {
        return function(meta) {
          if (meta == null) {
            meta = {};
          }
          if (meta === {}) {
            _this.trigger('page:no-meta');
          } else {
            _this.trigger('page:meta-fetched', meta);
          }
          return callback(meta);
        };
      })(this));
    };

    Document.prototype.capture = function(captureOptions) {
      var outputPath;
      if (captureOptions == null) {
        captureOptions = {};
      }
      this.trigger('render:init');
      outputPath = captureOptions.outputPath;
      return this.getMeta((function(_this) {
        return function(meta) {
          if (outputPath != null) {
            if (NotaHelper.isDirectory(outputPath)) {
              if (meta.filesystemName != null) {
                outputPath = path.join(outputPath, meta.filesystemName);
              } else {
                outputPath = path.join(outputPath, _this.options.defaultFilename);
              }
            }
            if (NotaHelper.isFile(outputPath) && !captureOptions.preserve) {
              _this.trigger('render:overwrite', outputPath);
            }
          } else {
            if (meta.filesystemName != null) {
              outputPath = meta.filesystemName;
            } else {
              outputPath = _this.options.defaultFilename;
            }
          }
          captureOptions.outputPath = outputPath;
          _.extend(meta, captureOptions);
          return _this.page.render(outputPath, function() {
            return _this.trigger('render:done', meta);
          });
        };
      })(this));
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
            return _this.trigger("page:loaded");
          };
        })(this), this.options.timeout);
      }
    };

    Document.prototype.injectData = function(data) {
      var inject;
      this.rendered = false;
      inject = function(data) {
        return Nota.injectData(data);
      };
      return this.page.evaluate(inject, null, data);
    };

    Document.prototype.onDataRendered = function() {
      this.rendered = true;
      return this.trigger('page:ready');
    };

    Document.prototype.close = function() {
      this.page.close();
      return this.phantomInstance.exit();
    };

    return Document;

  })();

  module.exports = Document;

}).call(this);

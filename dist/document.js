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
            _this.trigger('page:init');
            return _this.page.open(_this.serverUrl, function(status) {
              if (status === 'success') {
                _this.emit('page:opened');
                _this.on('client:template:loaded', _this.injectData, _this);
                return _this.on('client:template:render:done', _this.onDataRendered, _this);
              } else {
                throw new Error("Unable to load page: " + status);
                _this.close();
                return _this.emit('page:fail');
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
      return this.page.evaluate(getFn, function(meta) {
        if (meta == null) {
          meta = {};
        }
        if (meta === {}) {
          this.emit('page:no-meta');
        } else {
          this.emit('page:meta-fetched', meta);
        }
        return callback(meta);
      });
    };

    Document.prototype.capture = function(options) {
      var outputPath;
      if (options == null) {
        options = {};
      }
      this.emit('render:init');
      outputPath = options.outputPath;
      return this.geMeta((function(_this) {
        return function(meta) {
          if (NotaHelper.isDir(outputPath)) {
            if (meta.filesystemName != null) {
              outputPath = path.join(outputPath, meta.filesystemName);
            } else {
              outputPath = path.join(outputPath, _this.options.defaultFilename);
            }
          }
          if (NotaHelper.fileExists(outputPath) && !options.preserve) {
            _this.emit('render:overwrite', outputPath);
          }
          options.outputPath = outputPath;
          _.extend(meta, options);
          return _this.page.render(outputPath, function() {
            return _this.emit('render:done', meta);
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
        })(this), this.timeout);
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
      return this.emit('page:ready');
    };

    Document.prototype.close = function() {
      this.page.close();
      return this.phantomInstance.exit();
    };

    return Document;

  })();

  module.exports = Document;

}).call(this);

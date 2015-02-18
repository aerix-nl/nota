(function() {
  var EventEmitter2, Page, Q, fs, phantom, _,
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  fs = require('fs');

  Q = require('q');

  phantom = require('phantom');

  _ = require('underscore')._;

  EventEmitter2 = require('eventemitter2').EventEmitter2;

  Page = (function(_super) {
    __extends(Page, _super);

    Page.prototype.rendered = false;

    function Page(options) {
      this.serverAddress = options.serverAddress, this.serverPort = options.serverPort, this.outputPath = options.outputPath, this.defaultFilename = options.defaultFilename, this.initData = options.initData;
      this.serverUrl = "http://" + this.serverAddress + ":" + this.serverPort;
      phantom.create((function(_this) {
        return function(phantomInstance) {
          _this.phantomInstance = phantomInstance;
          _this.emit("init");
          return phantomInstance.createPage(function(page) {
            _this.page = page;
            _this.page.set('paperSize', {
              format: 'A4',
              orientation: 'portrait',
              border: '0cm'
            });
            _this.page.onConsoleMessage(function(msg) {
              return console.log(msg);
            });
            _this.page.set('onError', function(msg) {
              return console.error(msg);
            });
            _this.page.set('onCallback', function(msg) {
              return _this.emit("client:" + msg);
            });
            return _this.page.open(_this.serverUrl, function(status) {
              if (status === 'success') {
                _this.emit('opened');
                _this.on('client:template:loaded', function() {
                  if (this.initData != null) {
                    return this.injectData();
                  }
                });
                return _this.on('client:template:render:done', function() {
                  this.rendered = true;
                  return this.emit('ready');
                });
              } else {
                throw new Error("Unable to load page: " + status);
                _this.phantomInstance.exit();
                return _this.emit('fail');
              }
            });
          });
        };
      })(this));
    }

    Page.prototype.isDir = function(path) {
      return fs.existsSync(path) && fs.statSync(path).isDirectory();
    };

    Page.prototype.fileExists = function(path) {
      return fs.existsSync(path) && fs.statSync(path).isFile();
    };

    Page.prototype.capture = function(options) {
      if (options == null) {
        options = {};
      }
      this.emit('capture:init');
      return this.page.evaluate((function() {
        return Nota.getDocumentMeta();
      }), (function(_this) {
        return function(meta) {
          if (meta == null) {
            meta = {};
          }
          if (_this.isDir(_this.outputPath) && (meta.filesystemName != null)) {
            _this.outputPath = _this.outputPath + meta.filesystemName;
            meta.filesystemName = _this.outputPath;
          }
          if (_this.fileExists(_this.outputPath)) {
            _this.emit('capture:overwrite', _this.outputPath);
          }
          if (_this.outputPath == null) {
            _this.outputPath = meta.filesystemName || _this.defaultFilename;
          }
          meta.filesystemName = _this.outputPath;
          return _this.page.render(_this.outputPath, function() {
            return _this.emit('capture:done', meta);
          });
        };
      })(this));
    };

    Page.prototype.injectClient = function() {
      var body, script;
      body = document.getElementsByTagName('body')[0];
      script = document.createElement('script');
      script.type = 'text/javascript';
      script.src = '/vendor/requirejs/require.js';
      script.setAttribute('data-main', "/lib/client-main");
      script.onload = function() {
        return window.callPhantom("client:onload");
      };
      return body.appendChild(script);
    };

    Page.prototype.injectData = function(data) {
      var inject;
      if (data != null) {
        this.initData = data;
      }
      this.rendered = false;
      inject = function(data) {
        return Nota.injectData(data);
      };
      return this.page.evaluate(inject, null, this.initData);
    };

    Page.prototype.close = function() {
      this.page.close();
      return this.phantomInstance.exit();
    };

    return Page;

  })(EventEmitter2);

  module.exports = Page;

}).call(this);

(function() {
  var EventEmitter, Page, Q, fs, phantom, _,
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  fs = require('fs');

  Q = require('q');

  phantom = require('phantom');

  _ = require('underscore')._;

  EventEmitter = require('events').EventEmitter;

  Page = (function(_super) {
    __extends(Page, _super);

    Page.prototype.dependencies = ['vendor/jquery/jquery.js', 'vendor/rivets/dist/rivets.js', 'vendor/underscore/underscore.js', 'lib/client.js'];

    function Page(serverAddress, serverPort, data, outputPath) {
      this.serverAddress = serverAddress;
      this.serverPort = serverPort;
      this.data = data;
      this.outputPath = outputPath;
      this.serverUrl = "http://" + this.serverAddress + ":" + this.serverPort;
      phantom.create((function(_this) {
        return function(phantomInstance) {
          _this.phantomInstance = phantomInstance;
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
              return _this.emit(msg);
            });
            return _this.page.open(_this.serverUrl, function(status) {
              if (status === 'success') {
                return _this.injectDependencies().then(function() {
                  _this.injectData();
                  return _this.page.render(_this.outputPath, function() {
                    _this.phantomInstance.exit();
                    return _this.emit('render');
                  });
                });
              } else {
                console.error("Unable to load page: " + status);
                _this.phantomInstance.exit();
                return _this.emit('fail');
              }
            });
          });
        };
      })(this));
    }

    Page.prototype.injectDependencies = function() {
      var deferred, dependencies, inject, injectNext;
      dependencies = this.dependencies.slice(0);
      deferred = Q.defer();
      inject = function(src) {
        var body, script;
        body = document.getElementsByTagName('body')[0];
        script = document.createElement('script');
        script.type = 'text/javascript';
        script.src = src;
        script.onload = function() {
          return window.callPhantom("nota:load:" + src);
        };
        return body.appendChild(script);
      };
      injectNext = (function(_this) {
        return function() {
          var dependency;
          if (dependencies.length === 0) {
            deferred.resolve();
            return;
          }
          dependency = dependencies.shift();
          console.log("injecting " + dependency);
          _this.page.evaluate(inject, null, dependency);
          return _this.once("nota:load:" + dependency, injectNext);
        };
      })(this);
      injectNext();
      return deferred.promise;
    };

    Page.prototype.injectData = function() {
      var inject;
      inject = function(data) {
        return Nota.addData(data);
      };
      return this.page.evaluate(inject, null, this.data);
    };

    return Page;

  })(EventEmitter);

  module.exports = Page;

}).call(this);

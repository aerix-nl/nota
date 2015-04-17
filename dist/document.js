(function() {
  var Backbone, Document, Path, Q, TemplateUtils, phantom, _,
    __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };

  Q = require('q');

  Path = require('path');

  phantom = require('phantom');

  _ = require('underscore')._;

  Backbone = require('backbone');

  TemplateUtils = require('./template_utils');

  module.exports = Document = (function() {
    Document.prototype.pagePhases = ['page:opened', 'page:loaded', 'client:init', 'client:loaded', 'client:template:init', 'client:template:loaded'];

    function Document(server, options) {
      this.server = server;
      this.options = options;
      this.onResourceReceived = __bind(this.onResourceReceived, this);
      this.onResourceRequested = __bind(this.onResourceRequested, this);
      _.extend(this, Backbone.Events);
      this.helper = new TemplateUtils();
      this.on('all', this.setState, this);
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
                _this.on('page:loaded', function() {
                  if (_this.options.templateType === 'static') {
                    return _this.trigger('page:rendered');
                  }
                });
                return _this.on('client:template:render:done', function() {
                  if (_this.options.templateType === 'dynamic') {
                    return _this.trigger("page:rendered");
                  }
                });
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

    Document.prototype.getMeta = function() {
      var deferred, metaRequest;
      deferred = Q.defer();
      metaRequest = function() {
        return typeof Nota !== "undefined" && Nota !== null ? Nota.getDocumentMeta() : void 0;
      };
      this.page.evaluate(metaRequest, deferred.resolve);
      return deferred.promise;
    };

    Document.prototype.capture = function(captureOptions) {
      var metaPromise;
      if (captureOptions == null) {
        captureOptions = {};
      }
      this.page.evaluate(function() {
        if (typeof $ !== "undefined" && $ !== null) {
          return $('a').each(function(idx, a) {
            return $(a).replaceWith($('<span class="hyperlink">' + $(a).text() + '</span>')[0]);
          });
        }
      });
      metaPromise = this.getMeta();
      return metaPromise.then((function(_this) {
        return function(meta) {
          var outputPath;
          if (meta != null) {
            _this.trigger('page:meta-fetched', meta);
          } else {
            _this.trigger('page:no-meta');
          }
          outputPath = _this.helper.findOutputPath({
            path: captureOptions.outputPath,
            meta: meta,
            preserve: captureOptions.preserve,
            defaultFilename: _this.options.defaultFilename
          });
          captureOptions.outputPath = outputPath;
          meta = _.extend({}, meta, captureOptions);
          _this.trigger('render:init');
          return _this.page.render(outputPath, function() {
            return _this.trigger('render:done', meta);
          });
        };
      })(this));
    };

    Document.prototype.onResourceRequested = function(request) {
      this.trigger('page:resource:requested');
      if (this.counter.indexOf(request.id) === -1) {
        this.counter.push(request.id);
        return clearTimeout(this.timer);
      }
    };

    Document.prototype.onResourceReceived = function(resource) {
      var i;
      this.trigger('page:resource:received');
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
            return _this.trigger('page:loaded');
          };
        })(this), this.options.resourceTimeout);
      }
    };

    Document.prototype.injectData = function(data) {
      var deferred, inject;
      deferred = Q.defer();
      inject = function(data) {
        return Nota.injectData(data);
      };
      this.page.evaluate(inject, deferred.resolve, data);
      return deferred.promise;
    };

    Document.prototype.setState = function(event) {
      if (_(this.pagePhases).contains(event)) {
        return this.state = event;
      }
    };

    Document.prototype.close = function() {
      this.page.close();
      return this.phantomInstance.exit();
    };

    return Document;

  })();

}).call(this);

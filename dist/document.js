(function() {
  var Backbone, Document, Handlebars, Path, Q, TemplateHelper, chalk, phantom, _,
    __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };

  Q = require('q');

  Path = require('path');

  chalk = require('chalk');

  phantom = require('phantom');

  _ = require('underscore')._;

  Backbone = require('backbone');

  Handlebars = require('handlebars');

  TemplateHelper = require('./template_helper');

  module.exports = Document = (function() {
    Document.prototype.pagePhases = ['page:init', 'page:opened', 'client:init', 'client:loaded', 'client:template:init', 'client:template:loaded', 'page:ready', 'client:template:render:init', 'client:template:render:done', 'page:rendered'];

    function Document(templateUrl, logging, options) {
      this.logging = logging;
      this.options = options;
      this.onRequest = __bind(this.onRequest, this);
      this.onCallback = __bind(this.onCallback, this);
      this.onClientError = __bind(this.onClientError, this);
      this.onResourceReceived = __bind(this.onResourceReceived, this);
      this.onResourceRequested = __bind(this.onResourceRequested, this);
      this.setFooter = __bind(this.setFooter, this);
      _.extend(this, Backbone.Events);
      this.helper = new TemplateHelper(this.logging);
      this.on('all', this.setState, this);
      phantom.create((function(_this) {
        return function(phantomInstance) {
          _this.phantomInstance = phantomInstance;
          return _this.phantomInstance.createPage(function(page) {
            _this.page = page;
            _this.loadingResources = [];
            _this.timers = {
              'resource': null,
              'template': null,
              'render': null,
              'extrender': null
            };
            _this.options.template.paperSize = _this.parsePaper(_this.options.template.paperSize);
            _this.page.set('paperSize', _this.options.template.paperSize);
            _this.page.set('zoomFactor', _this.options.template.zoomFactor);
            _this.page.onConsoleMessage(function(msg) {
              return _this.logging.logClient(msg);
            });
            _this.page.set('onError', _this.onClientError);
            _this.page.set('onCallback', _this.onCallback);
            _this.page.set('onResourceRequested', _this.onResourceRequested);
            _this.page.set('onResourceReceived', _this.onResourceReceived);
            _this.page.set('onTemplateInit', _this.onTemplateInit);
            _this.trigger('page:init');
            return _this.page.open(templateUrl, function(status) {
              if (status === 'success') {
                _this.trigger('page:opened');
                return _this.listen();
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

    Document.prototype.listen = function() {
      if (this.options.template.type === 'static') {
        this.on('page:ready', (function(_this) {
          return function() {
            return _this.trigger('page:rendered');
          };
        })(this));
      }
      this.on('client:template:init', (function(_this) {
        return function() {
          clearTimeout(_this.timers.resource);
          return _this.timers['template'] = setTimeout(function() {
            var _base;
            return typeof (_base = _this.logging).logWarning === "function" ? _base.logWarning("Still waiting to receive " + (chalk.cyan('client:template:loaded')) + " event after " + (_this.options.template.templateTimeout / 1000) + "s. Perhaps it crashed?") : void 0;
          }, _this.options.template.templateTimeout);
        };
      })(this));
      this.on('client:template:loaded', (function(_this) {
        return function() {
          clearTimeout(_this.timers.resource);
          clearTimeout(_this.timers.template);
          return _this.trigger('page:ready');
        };
      })(this));
      if (this.options.template.type === 'scripted') {
        return this.on('page:ready', (function(_this) {
          return function() {
            _this.on('client:template:render:init', function() {
              clearTimeout(_this.timers.render);
              return _this.timers['extrender'] = setTimeout(function() {
                var _base;
                return typeof (_base = _this.logging).logWarning === "function" ? _base.logWarning("Still waiting for template to finish rendering after " + (_this.options.template.extRenderTimeout / 1000) + "s. Perhaps it crashed?") : void 0;
              }, _this.options.template.extRenderTimeout);
            });
            return _this.on('client:template:render:done', function() {
              clearTimeout(_this.timers.render);
              clearTimeout(_this.timers.extrender);
              return _this.trigger('page:rendered');
            });
          };
        })(this));
      }
    };

    Document.prototype.getDocumentProperty = function(property) {
      var deferred, propertyValueRequest;
      if (property == null) {
        throw new Error("Document property to get is not set");
      }
      deferred = Q.defer();
      propertyValueRequest = function(property) {
        return typeof Nota !== "undefined" && Nota !== null ? Nota.getDocument(property) : void 0;
      };
      this.page.evaluate(propertyValueRequest, deferred.resolve, property);
      return deferred.promise;
    };

    Document.prototype.setFooter = function(footer) {
      var footerTemplate, paperSizeOptions, renderFooter;
      if (footer == null) {
        return;
      }
      paperSizeOptions = _.extend({}, this.options.template.paperSize);
      footerTemplate = Handlebars.compile(footer.contents);
      renderFooter = function(pageNum, numPages) {
        return "<span style=\"float:right; font-family: 'DINPro', 'Roboto', sans-serif;\n  color:#8D9699 !important; padding-right: 21mm;\"> " + pageNum + " /\n  " + numPages + " </span>";
      };
      footer.contents = this.phantomInstance.callback(renderFooter, footer.content);
      paperSizeOptions.footer = footer;
      return this.page.set('paperSize', paperSizeOptions);
    };

    Document.prototype.parsePaper = function(paperSize) {
      var _ref, _ref1, _ref2, _ref3;
      if (paperSize != null ? (_ref = paperSize.margin) != null ? _ref.deferHorizontal : void 0 : void 0) {
        paperSize.margin.left = 0;
        paperSize.margin.right = 0;
      }
      if (paperSize != null ? (_ref1 = paperSize.margin) != null ? _ref1.deferVertical : void 0 : void 0) {
        paperSize.margin.top = 0;
        paperSize.margin.bottom = 0;
      }
      if ((paperSize != null ? (_ref2 = paperSize.margin) != null ? _ref2.deferHorizontal : void 0 : void 0) != null) {
        delete paperSize.margin.deferHorizontal;
      }
      if ((paperSize != null ? (_ref3 = paperSize.margin) != null ? _ref3.deferVertical : void 0 : void 0) != null) {
        delete paperSize.margin.deferVertical;
      }
      return paperSize;
    };

    Document.prototype.capture = function(job) {
      var deferred;
      deferred = Q.defer();
      job = _.extend({}, job);
      this.page.evaluate(function() {
        if (typeof $ !== "undefined" && $ !== null) {
          return $('a').each(function(idx, a) {
            return $(a).replaceWith($('<span class="hyperlink">' + $(a).text() + '</span>')[0]);
          });
        }
      });
      this.getDocumentProperty('footer').then(this.setFooter).fail(deferred.reject);
      this.getDocumentProperty('meta').then((function(_this) {
        return function(meta) {
          var outputPath;
          if (meta != null) {
            _this.trigger('page:meta-fetched', meta);
          } else {
            _this.trigger('page:no-meta');
          }
          outputPath = _this.helper.findOutputPath({
            defaultFilename: _this.options.template.defaultFilename,
            preserve: job.preserve,
            outputPath: job.outputPath,
            meta: meta
          });
          job.outputPath = outputPath;
          meta = _.extend({}, meta, job);
          _this.trigger('render:init');
          return _this.page.render(outputPath, function() {
            _this.trigger('render:done', meta);
            return deferred.resolve(meta);
          });
        };
      })(this)).fail(deferred.reject);
      return deferred.promise;
    };

    Document.prototype.onResourceRequested = function(request) {
      var _ref;
      if (this.loadingResources.indexOf(request.id) === -1) {
        this.loadingResources.push(request.id);
        clearTimeout(this.timers.resource);
      }
      if ((_ref = this.options.logging) != null ? _ref.pageResources : void 0) {
        return this.trigger('page:resource:requested');
      }
    };

    Document.prototype.onResourceReceived = function(resource) {
      var i, _ref;
      if (resource.stage !== "end" && (resource.redirectURL == null)) {
        return;
      }
      if ((i = this.loadingResources.indexOf(resource.id)) === -1) {
        return;
      }
      this.loadingResources.splice(i, 1);
      if ((_ref = this.options.logging) != null ? _ref.pageResources : void 0) {
        this.trigger('page:resource:received');
      }
      if (this.loadingResources.length === 0) {
        clearTimeout(this.timers.resource);
        return this.timers['resource'] = setTimeout((function(_this) {
          return function() {
            return _this.trigger('page:ready');
          };
        })(this), this.options.template.resourceTimeout);
      }
    };

    Document.prototype.onClientError = function(msg) {
      var _base;
      if (typeof (_base = this.logging).logClientError === "function") {
        _base.logClientError(msg);
      }
      if (this.options.template.errorTimeout != null) {
        this.timers['error'] = setTimeout((function(_this) {
          return function() {
            return _this.trigger('error-timeout', msg);
          };
        })(this), this.options.template.errorTimeout);
        return this.once('all', (function(_this) {
          return function() {
            return clearTimeout(_this.timers['error']);
          };
        })(this));
      }
    };

    Document.prototype.onCallback = function(msg) {
      if (msg.substring(0, 4) === "req:") {
        return this.onRequest(msg.substring(4));
      } else {
        return this.trigger("client:" + msg);
      }
    };

    Document.prototype.onRequest = function(req) {
      if (req === 'build-target') {
        return this.options.template.buildTarget;
      }
    };

    Document.prototype.isReady = function() {
      return this.state === 'page:ready';
    };

    Document.prototype.injectData = function(data) {
      var deferred, inject;
      deferred = Q.defer();
      inject = function(data) {
        return typeof Nota !== "undefined" && Nota !== null ? Nota.injectData(data) : void 0;
      };
      this.page.evaluate(inject, deferred.resolve, data);
      return deferred.promise;
    };

    Document.prototype.setState = function(event) {
      if (this.pagePhases.indexOf(event) > this.pagePhases.indexOf(this.state)) {
        return this.state = event;
      }
    };

    Document.prototype.after = function(event) {
      var deferred;
      deferred = Q.defer();
      if (this.state === event) {
        deferred.resolve();
      } else {
        this.once(event, function() {
          return deferred.resolve();
        });
      }
      return deferred.promise;
    };

    Document.prototype.close = function() {
      this.page.close();
      return this.phantomInstance.exit();
    };

    return Document;

  })();

}).call(this);

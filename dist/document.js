(function() {
  var Backbone, Document, Handlebars, Path, Q, TemplateHelper, chalk, fs, phantom, _,
    __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };

  Q = require('q');

  fs = require('fs');

  Path = require('path');

  chalk = require('chalk');

  phantom = require('phantom');

  _ = require('underscore')._;

  Backbone = require('backbone');

  Handlebars = require('handlebars');

  TemplateHelper = require('./template_helper');

  module.exports = Document = (function() {
    Document.prototype.pagePhases = ['page:init:start', 'page:init:opening', 'page:resouces:loading', 'page:resouces:loaded', 'client:init:start', 'client:init:done', 'template:init:start', 'template:init:done', 'client:page:init:done', 'template:render:start', 'template:render:done', 'page:capture:start', 'page:capture:done'];

    function Document(templateUrl, logging, options) {
      this.templateUrl = templateUrl;
      this.logging = logging;
      this.options = options;
      this.onRequest = __bind(this.onRequest, this);
      this.onCallback = __bind(this.onCallback, this);
      this.onClientError = __bind(this.onClientError, this);
      this.onResourcesLoaded = __bind(this.onResourcesLoaded, this);
      this.onResourceReceived = __bind(this.onResourceReceived, this);
      this.onResourceRequested = __bind(this.onResourceRequested, this);
      this.setFooter = __bind(this.setFooter, this);
      if (this.options.template.type == null) {
        throw new Error("Template type not defined. Must be either static or scripted.");
      }
      _.extend(this, Backbone.Events);
      this.helper = new TemplateHelper(this.logging);
      this.on('all', this.setState, this);
      this.init = Q.defer();
      phantom.create((function(_this) {
        return function(phantomInstance) {
          _this.phantomInstance = phantomInstance;
          return _this.phantomInstance.createPage(function(page) {
            _this.page = page;
            _this.timers = {
              'resourcesLoaded': null,
              'templateInitSlow': null,
              'templateInitSlow': null,
              'templateRenderSlow': null,
              'templateRenderDead': null,
              'errorAbort': null
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
            _this.trigger('page:init:start');
            return _this.page.open(_this.templateUrl, function(status) {
              if (status === 'success') {
                _this.trigger('page:init:opened');
                return _this.listen();
              } else {
                _this.close();
                return _this.abortInit("Unable to load page URL: " + status);
              }
            });
          });
        };
      })(this));
      return this;
    }

    Document.prototype.listen = function() {
      switch (this.options.template.type) {
        case 'static':
          return this.listenStatic();
        case 'scripted':
          return this.listenScripted();
        default:
          throw new Error("Unsupported template type '" + this.options.template.type + "'");
      }
    };

    Document.prototype.listenStatic = function() {
      if (this.options.template.type === 'static') {
        return this.on('page:resources:loaded', (function(_this) {
          return function() {
            _this.trigger('page:init:done');
            return _this.init.resolve();
          };
        })(this));
      }
    };

    Document.prototype.listenScripted = function() {
      this.on('page:resources:loaded', this.init.resolve, this.init);
      this.once('template:init:start', (function(_this) {
        return function() {
          var onDeadTimeout, onSlowTimeout;
          _this.off('page:resources:loaded', _this.init.resolve, _this.init);
          onSlowTimeout = function() {
            var _base;
            return typeof (_base = _this.logging).logWarning === "function" ? _base.logWarning("Still waiting to receive " + (chalk.cyan('template:init:done')) + " after " + (_this.options.template.timeouts.templateInitSlow / 1000) + "s. Perhaps it crashed?") : void 0;
          };
          _this.timers.templateInitSlow = setTimeout(onSlowTimeout, _this.options.template.timeouts.templateInitSlow);
          onDeadTimeout = function() {
            var reason;
            reason = "Template still hasn't signaled " + (chalk.cyan('template:init:done')) + " event after " + (_this.options.template.timeouts.templateInitDead / 1000) + "s. Assuming it crashed during initialization. Marking document as unusable for capture.";
            return _this.abortInit(reason);
          };
          return _this.timers.templateInitDead = setTimeout(onDeadTimeout, _this.options.template.timeouts.templateInitDead);
        };
      })(this));
      return this.once('template:init:done', (function(_this) {
        return function() {
          clearTimeout(_this.timers.resourcesLoaded);
          clearTimeout(_this.timers.templateInitSlow);
          clearTimeout(_this.timers.templateInitDead);
          _this.init.resolve();
          _this.on('template:render:start', function() {
            var onDeadTimeout, onSlowTimeout, timeToDead, timeToSlow;
            onSlowTimeout = function() {
              var _base;
              return typeof (_base = _this.logging).logWarning === "function" ? _base.logWarning("Still waiting for template to finish rendering after " + (_this.options.template.timeouts.templateRenderSlow / 1000) + "s. Perhaps it crashed?") : void 0;
            };
            timeToSlow = _this.options.template.timeouts.templateRenderSlow;
            _this.timers.templateRenderSlow = setTimeout(onSlowTimeout, timeToSlow);
            onDeadTimeout = function() {
              var reason, _base;
              reason = "Template still hasn't signaled " + (chalk.cyan('template:render:done')) + " after " + (_this.options.template.timeouts.templateRenderDead / 1000) + "s. Assuming it crashed during rendering. Aborting job to continue with rest of job queue.";
              if (typeof (_base = _this.logging).logError === "function") {
                _base.logError(reason);
              }
              return _this.jobAbort(reason);
            };
            timeToDead = _this.options.template.timeouts.templateRenderDead;
            return _this.timers.templateRenderDead = setTimeout(onDeadTimeout, timeToDead);
          });
          return _this.on('template:render:done', function() {
            clearTimeout(_this.timers.templateRenderSlow);
            clearTimeout(_this.timers.templateRenderDead);
            return _this.renderJob.resolve();
          });
        };
      })(this));
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

    Document.prototype.sampleStyles = function(html) {
      var elements, host, i;
      host = document.createElement('div');
      host.setAttribute('style', 'display:none;');
      host.innerHTML = html;
      document.body.appendChild(host);
      elements = host.getElementsByTagName('*');
      i = elements.length - 1;
      while (i >= 0) {
        elements[i].setAttribute('style', window.getComputedStyle(elements[i], null).cssText);
        i = i - 1;
      }
      document.body.removeChild(host);
      return host.innerHTML;
    };

    Document.prototype.setFooter = function(footer) {
      var paperSizeOptions, renderFooter;
      if (footer == null) {
        return;
      }
      paperSizeOptions = _.extend({}, this.options.template.paperSize);
      renderFooter = function(pageNum, numPages) {
        return "<span style=\"float:right; font-family: 'DINPro', 'Roboto', sans-serif;\n  color:#8D9699 !important; padding-right: 21mm;\"> " + pageNum + " /\n  " + numPages + " </span>";
      };
      footer.contents = this.phantomInstance.callback(renderFooter);
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
      this.captureJob = Q.defer();
      job = _.extend({}, job);
      this.page.evaluate(function() {
        if (typeof $ !== "undefined" && $ !== null) {
          return $('a').each(function(idx, a) {
            return $(a).replaceWith($('<span class="hyperlink">' + $(a).text() + '</span>')[0]);
          });
        }
      });
      this.getDocumentProperty('footer').then(this.setFooter).fail(this.captureJob.reject);
      this.getDocumentProperty('meta').then((function(_this) {
        return function(meta) {
          var buildTarget, error, outputPath;
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
          if (job.buildTarget != null) {
            buildTarget = job.buildTarget;
          } else {
            try {
              buildTarget = _this.helper.buildTarget(outputPath);
            } catch (_error) {
              error = _error;
              throw new Error("Build target could not be established. " + error + ". Please have your template specify one in it's proposed filename, or specify one with the job.");
            }
          }
          _this.trigger('page:capture:init');
          switch (buildTarget) {
            case 'pdf':
              return _this.capturePDF(outputPath, meta, job);
            case 'html':
              return _this.captureHTML(outputPath, meta, job);
          }
        };
      })(this)).fail(this.captureJob.reject);
      return this.captureJob.promise;
    };

    Document.prototype.capturePDF = function(outputPath, meta, job) {
      if (this.helper.extension(outputPath) !== 'pdf') {
        outputPath = outputPath + '.pdf';
      }
      return this.page.render(outputPath, (function(_this) {
        return function() {
          if (_this.helper.isFile(outputPath)) {
            job.outputPath = outputPath;
            meta = _.extend({}, meta, job);
            _this.trigger('page:capture:done', meta);
            return _this.captureJob.resolve(meta);
          } else {
            return _this.captureJob.reject(new Error("PhantomJS didn't render. Cause not available (due to bug: https://github.com/sgentle/phantomjs-node/issues/290)"));
          }
        };
      })(this));
    };

    Document.prototype.captureHTML = function(outputPath, meta, job) {
      var Inliner, cheerio;
      if (typeof cheerio === "undefined" || cheerio === null) {
        cheerio = require('cheerio');
      }
      if (typeof Inliner === "undefined" || Inliner === null) {
        Inliner = require('inliner');
      }
      if (this.helper.extension(outputPath) !== 'html') {
        outputPath = outputPath + '.html';
      }
      return this.page.get('content', (function(_this) {
        return function(html) {
          var $, attributePrefix, protocolRegex;
          $ = cheerio.load(html);
          $('script').remove();
          protocolRegex = /\w*(\-\w*)*:/;
          attributePrefix = function(attribute) {
            var element, _i, _len, _ref, _results;
            _ref = $('[' + attribute + ']');
            _results = [];
            for (_i = 0, _len = _ref.length; _i < _len; _i++) {
              element = _ref[_i];
              element = $(element);
              if (!(element.attr(attribute).search(protocolRegex) === 0)) {
                _results.push(element.attr(attribute, _this.templateUrl + element.attr(attribute)));
              } else {
                _results.push(void 0);
              }
            }
            return _results;
          };
          attributePrefix('href');
          attributePrefix('src');
          html = $.html();
          return new Inliner(html, function(error, html) {
            if (error != null) {
              _this.captureJob.reject(error);
            }
            return fs.writeFile(outputPath, html, function(error) {
              if (error) {
                return _this.captureJob.reject(error);
              } else {
                job.outputPath = outputPath;
                meta = _.extend({}, meta, job);
                _this.trigger('page:capture:done', meta);
                return _this.captureJob.resolve(meta);
              }
            });
          });
        };
      })(this));
    };

    Document.prototype.onResourceRequested = function(request) {
      var _ref;
      if (this.loadingResources == null) {
        this.loadingResources = [];
        this.trigger('page:resources:loading');
      }
      if (this.loadingResources.indexOf(request.id) === -1) {
        this.loadingResources.push(request.id);
        clearTimeout(this.timers.resourcesLoaded);
      }
      if ((_ref = this.options.logging) != null ? _ref.pageResources : void 0) {
        return this.trigger('page:resource:requested', request);
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
        this.trigger('page:resource:received', resource);
      }
      if (this.loadingResources.length === 0) {
        clearTimeout(this.timers.resourcesLoaded);
        return this.timers.resourcesLoaded = setTimeout(this.onResourcesLoaded, this.options.template.timeouts.resourcesLoaded);
      }
    };

    Document.prototype.onResourcesLoaded = function() {
      return this.trigger('page:resources:loaded');
    };

    Document.prototype.onClientError = function(errorMsg) {
      var abortAfter, abortWithMessage, _base;
      if (typeof (_base = this.logging).logClientError === "function") {
        _base.logClientError(errorMsg);
      }
      if (this.options.template.timeouts.errorAbort != null) {
        abortWithMessage = (function(_this) {
          return function() {
            return _this.abortAll(("Aborting " + (_this.currentPhase()) + " due to template error. ") + errorMsg);
          };
        })(this);
        abortAfter = this.options.template.timeouts.errorAbort;
        this.timers.errorAbort = setTimeout(abortWithMessage, abortAfter);
        this.once('client:', (function(_this) {
          return function() {
            return clearTimeout(_this.timers.errorAbort);
          };
        })(this));
        return this.once('template:', (function(_this) {
          return function() {
            return clearTimeout(_this.timers.errorAbort);
          };
        })(this));
      }
    };

    Document.prototype.abortAll = function(reason) {
      switch (this.currentPhase()) {
        case 'init':
          return this.abortInit(reason);
        case 'render':
          return this.abortRenderJob(reason);
        case 'capture':
          return this.abortCaptureJob(reason);
      }
    };

    Document.prototype.abortInit = function(reason) {
      clearTimeout(this.timers.resourcesLoaded);
      clearTimeout(this.timers.templateInitSlow);
      clearTimeout(this.timers.templateInitDead);
      this.trigger('page:init:abort', reason);
      return this.init.reject(reason);
    };

    Document.prototype.abortRenderJob = function(reason) {
      if (this.renderJob != null) {
        clearTimeout(this.timers.templateRenderSlow);
        clearTimeout(this.timers.templateRenderDead);
        this.trigger('template:render:abort', reason);
        return this.renderJob.reject(reason);
      }
    };

    Document.prototype.abortCaptureJob = function(reason) {
      if (this.captureJob != null) {
        this.trigger('page:capture:abort', reason);
        return this.captureJob.reject(reason);
      }
    };

    Document.prototype.onCallback = function(msg) {
      if (msg.substring(0, 4) === "req:") {
        return this.onRequest(msg.substring(4));
      } else {
        return this.trigger(msg);
      }
    };

    Document.prototype.onRequest = function(req) {
      if (req === 'build-target') {
        return this.options.template.buildTarget;
      }
    };

    Document.prototype.isReady = function() {
      this.init.isResolved() && ((this.renderJob == null) || this.renderJob.isResolved());
      return (this.captureJob == null) || this.captureJob.isResolved();
    };

    Document.prototype.renderData = function(data) {
      var inject;
      this.renderJob = Q.defer();
      inject = function(data) {
        return typeof Nota !== "undefined" && Nota !== null ? Nota.injectData(data) : void 0;
      };
      this.page.evaluate(inject, null, data);
      return this.renderJob.promise;
    };

    Document.prototype.setState = function(event) {
      if (this.pagePhases.indexOf(event) > this.pagePhases.indexOf(this.state)) {
        return this.state = event;
      }
    };

    Document.prototype.currentPhase = function() {
      var _ref, _ref1;
      if (this.init.promise.isPending()) {
        return 'init';
      }
      if ((_ref = this.renderJob) != null ? _ref.promise.isPending() : void 0) {
        return 'render';
      }
      if ((_ref1 = this.captureJob) != null ? _ref1.promise.isPending() : void 0) {
        return 'capture';
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

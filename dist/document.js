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
    Document.prototype.pagePhases = ['page:init', 'page:opened', 'client:init', 'client:loaded', 'client:template:init', 'client:template:loaded', 'page:ready', 'client:template:render:init', 'client:template:render:done', 'page:rendered'];

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
      this.initPhantom().then((function(_this) {
        return function() {
          _this.loadingResources = [];
          _this.timers = {
            'resourcesLoaded': null,
            'templateInit': null,
            'render': null,
            'extrender': null,
            'error': null
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
          return _this.page.open(_this.templateUrl, function(status) {
            if (status === 'success') {
              _this.trigger('page:opened');
              return _this.listen();
            } else {
              throw new Error("Unable to load page: " + status);
              _this.trigger('page:fail');
              return _this.close();
            }
          });
        };
      })(this));
    }

    Document.prototype.initPhantom = function() {
      var deferred;
      deferred = Q.defer();
      phantom.create((function(_this) {
        return function(phantomInstance) {
          _this.phantomInstance = phantomInstance;
          return _this.phantomInstance.createPage(function(page) {
            _this.page = page;
            return deferred.resolve();
          });
        };
      })(this));
      return deferred.promise;
    };

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
        return this.on('page:ready', (function(_this) {
          return function() {
            return _this.trigger('page:rendered');
          };
        })(this));
      }
    };

    Document.prototype.listenScripted = function() {
      this.on('client:template:init', (function(_this) {
        return function() {
          var onDeadTimeout, onSlowTimeout;
          clearTimeout(_this.timers.resourcesLoaded);
          onSlowTimeout = function() {
            var _base;
            return typeof (_base = _this.logging).logWarning === "function" ? _base.logWarning("Still waiting to receive " + (chalk.cyan('client:template:loaded')) + " after " + (_this.options.template.timeouts.templateInit / 1000) + "s. Perhaps it crashed?") : void 0;
          };
          _this.timers.templateInitSlow = setTimeout(onSlowTimeout, _this.options.template.timeouts.templateInitSlow);
          onDeadTimeout = function() {
            var _base;
            if (typeof (_base = _this.logging).logWarning === "function") {
              _base.logWarning("Template still hasn't signaled " + (chalk.cyan('client:template:loaded')) + " event after " + (_this.options.template.timeouts.templateInit / 1000) + "s. Assuming it crashed during initialization. Marking document as unusable for capture.");
            }
            return _this.logging.log("TODO: handling crashed template event");
          };
          return _this.timers.templateInitDead = setTimeout(onDeadTimeout, _this.options.template.timeouts.templateInitDead);
        };
      })(this));
      this.on('client:template:loaded', (function(_this) {
        return function() {
          clearTimeout(_this.timers.resourcesLoaded);
          clearTimeout(_this.timers.templateInitSlow);
          clearTimeout(_this.timers.templateInitDead);
          return _this.trigger('page:ready');
        };
      })(this));
      return this.on('page:ready', (function(_this) {
        return function() {
          _this.on('client:template:render:init', function() {
            var onDeadTimeout, onSlowTimeout, timeToDead, timeToSlow;
            onSlowTimeout = function() {
              var _base;
              return typeof (_base = _this.logging).logWarning === "function" ? _base.logWarning("Still waiting for template to finish rendering after " + (_this.options.template.timeouts.templateRenderSlow / 1000) + "s. Perhaps it crashed?") : void 0;
            };
            timeToSlow = _this.options.template.timeouts.templateRenderSlow;
            _this.timers.templateRenderSlow = setTimeout(onSlowTimeout, timeToSlow);
            onDeadTimeout = function() {
              var reason, _base;
              reason = "Template still hasn't signaled " + (chalk.cyan('client:template:render:done')) + " after " + (_this.options.template.timeouts.templateRenderDead / 1000) + "s. Assuming it crashed during rendering. Aborting job to continue with rest of job queue.";
              if (typeof (_base = _this.logging).logError === "function") {
                _base.logError(reason);
              }
              return _this.jobAbort(reason);
            };
            timeToDead = _this.options.template.timeouts.templateRenderDead;
            return _this.timers.templateRenderDead = setTimeout(onDeadTimeout, timeToDead);
          });
          return _this.on('client:template:render:done', function() {
            clearTimeout(_this.timers.templateRenderSlow);
            clearTimeout(_this.timers.templateRenderDead);
            return _this.trigger('page:rendered');
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
      this.currentJob = Q.defer();
      job = _.extend({}, job);
      this.page.evaluate(function() {
        if (typeof $ !== "undefined" && $ !== null) {
          return $('a').each(function(idx, a) {
            return $(a).replaceWith($('<span class="hyperlink">' + $(a).text() + '</span>')[0]);
          });
        }
      });
      this.getDocumentProperty('footer').then(this.setFooter).fail(this.currentJob.reject);
      this.getDocumentProperty('meta').then((function(_this) {
        return function(meta) {
          var Inliner, buildTarget, cheerio, error, outputPath;
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
          _this.trigger('render:init');
          switch (buildTarget) {
            case 'pdf':
              if (_this.helper.extension(outputPath) !== 'pdf') {
                outputPath = outputPath + '.pdf';
              }
              return _this.page.render(outputPath, function() {
                if (_this.helper.isFile(outputPath)) {
                  job.outputPath = outputPath;
                  meta = _.extend({}, meta, job);
                  _this.trigger('render:done', meta);
                  return _this.currentJob.resolve(meta);
                } else {
                  return _this.currentJob.reject(new Error("PhantomJS didn't render. Cause not available: https://github.com/sgentle/phantomjs-node/issues/290"));
                }
              });
            case 'html':
              if (typeof cheerio === "undefined" || cheerio === null) {
                cheerio = require('cheerio');
              }
              if (typeof Inliner === "undefined" || Inliner === null) {
                Inliner = require('inliner');
              }
              if (_this.helper.extension(outputPath) !== 'html') {
                outputPath = outputPath + '.html';
              }
              return _this.page.get('content', function(html) {
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
                    _this.currentJob.reject(error);
                  }
                  return fs.writeFile(outputPath, html, function(error) {
                    if (error) {
                      return _this.currentJob.reject(error);
                    } else {
                      job.outputPath = outputPath;
                      meta = _.extend({}, meta, job);
                      _this.trigger('render:done', meta);
                      return _this.currentJob.resolve(meta);
                    }
                  });
                });
              });
          }
        };
      })(this)).fail(this.currentJob.reject);
      return this.currentJob.promise;
    };

    Document.prototype.onResourceRequested = function(request) {
      var _ref;
      if (this.loadingResources.indexOf(request.id) === -1) {
        this.loadingResources.push(request.id);
        clearTimeout(this.timers.resourcesLoaded);
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
        clearTimeout(this.timers.resourcesLoaded);
        return this.timers.resourcesLoaded = setTimeout(this.onResourcesLoaded, this.options.template.timeouts.resourcesLoaded);
      }
    };

    Document.prototype.onResourcesLoaded = function() {
      if (this.options.template.type === 'static') {
        return this.trigger('page:ready');
      }
    };

    Document.prototype.onClientError = function(msg) {
      var abortJobAfter, abortJobWithMessage, _base;
      if (typeof (_base = this.logging).logClientError === "function") {
        _base.logClientError(msg);
      }
      if (this.options.template.timeouts.errorJobAbort != null) {
        abortJobWithMessage = (function(_this) {
          return function() {
            return _this.abortJob(msg);
          };
        })(this);
        abortJobAfter = this.options.template.timeouts.errorJobAbort;
        this.timers.error = setTimeout(abortJobWithMessage, abortJobAfter);
        return this.once('all', (function(_this) {
          return function() {
            return clearTimeout(_this.timers.error);
          };
        })(this));
      }
    };

    Document.prototype.abortJob = function(reason) {
      if (this.currentJob != null) {
        this.trigger('job:abort', reason);
        return this.currentJob.reject(reason);
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

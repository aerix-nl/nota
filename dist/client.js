(function() {
  requirejs.config({
    paths: {
      'backbone': '/nota/vendor/backbone/backbone',
      'jquery': '/nota/vendor/jquery/dist/jquery',
      'underscore': '/nota/vendor/underscore/underscore',
      'json': '/nota/vendor/requirejs-plugins/src/json',
      'text': '/nota/vendor/requirejs-text/text',
      'requirejs': '/nota/vendor/requirejs/require'
    }
  });

  define(['backbone', 'underscore', 'json'], function(Backbone, _) {
    var NotaClient;
    requirejs.config({});
    NotaClient = (function() {
      NotaClient.prototype.phantomRuntime = window._phantom != null;

      NotaClient.prototype.document = {};

      function NotaClient() {
        _.extend(this, Backbone.Events);
        this.on("all", this.logEvent, this);
        this.trigger('init');
        if (this.phantomRuntime) {
          $('body').addClass('phantomRuntime');
        } else {
          $('body').addClass('browserRuntime');
        }
        this.trigger('loaded');
        this;
      }

      NotaClient.prototype.logEvent = function(message) {
        if (this.phantomRuntime) {
          return window.callPhantom(message);
        } else {
          return console.info(message);
        }
      };

      NotaClient.prototype.logError = function(error, contextMessage) {
        if (this.phantomRuntime) {
          error.message = "" + contextMessage + "\n" + error.message + "\n" + error.stack;
        } else {
          console.error(contextMessage);
        }
        throw error;
      };

      NotaClient.prototype.documentIsMultipage = function() {
        return this.documentPages() > 1;
      };

      NotaClient.prototype.documentPages = function() {
        var pages, toMMconversion;
        toMMconversion = 3.187864111498258;
        return pages = ($('body').height() / toMMconversion) / 287;
      };

      NotaClient.prototype.setDocument = function(property, value) {
        if (property == null) {
          throw new Error("Document property to set is not defined");
        }
        if (value == null) {
          throw new Error("Document property value is not defined");
        }
        return this.document[property] = value;
      };

      NotaClient.prototype.getDocument = function(property) {
        if (property == null) {
          throw new Error("Document property is not defined");
        }
        return this.document[property];
      };

      NotaClient.prototype.setDocumentMeta = function(data, context) {
        if (typeof data === "function") {
          data = data.call(context);
        }
        return this.setDocument('meta', data);
      };

      NotaClient.prototype.getDocumentMeta = function() {
        return this.getDocument('meta');
      };

      NotaClient.prototype.getData = function(callback) {
        var err;
        if (callback == null) {
          throw new Error("Callback that receives the data is required when using this method.");
        }
        try {
          this.trigger('data:fetching');
          return require(['json!/nota/data'], (function(_this) {
            return function(data) {
              _this.data = data;
              _this.trigger('data:loaded');
              return callback(_this.data);
            };
          })(this));
        } catch (_error) {
          err = _error;
          return console.log(err.stack);
        }
      };

      NotaClient.prototype.injectData = function(data) {
        this.data = data;
        return this.trigger('data:injected', this.data);
      };

      NotaClient.prototype.buildTarget = function() {
        if (this.phantomRuntime) {
          return window.callPhantom('req:build-target');
        }
      };

      return NotaClient;

    })();
    return this.Nota = new NotaClient();
  });

}).call(this);

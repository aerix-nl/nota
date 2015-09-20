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

  define(['backbone', 'json'], function() {
    var NotaClient;
    requirejs.config({});
    NotaClient = (function() {
      NotaClient.prototype.phantomRuntime = window._phantom != null;

      NotaClient.prototype.documentMeta = {
        data: null,
        fn: null,
        context: null
      };

      function NotaClient() {
        _.extend(this, Backbone.Events);
        this.on("all", this.logEvent, this);
        this.trigger('init');
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

      NotaClient.prototype.setDocumentMeta = function(documentMeta, context) {
        if (documentMeta == null) {
          throw new Error("Document meta not defined");
        }
        if (typeof documentMeta === 'function') {
          this.documentMeta.fn = documentMeta;
          if (context != null) {
            return this.documentMeta.context = context;
          }
        } else {
          return this.documentMeta.data = documentMeta;
        }
      };

      NotaClient.prototype.getDocumentMeta = function() {
        var ctx;
        if (this.documentMeta.fn != null) {
          ctx = this.documentMeta.context;
          if (ctx != null) {
            return this.documentMeta.fn.call(ctx);
          } else {
            return this.documentMeta.fn();
          }
        } else {
          return this.documentMeta.data;
        }
      };

      NotaClient.prototype.getData = function(callback, force) {
        var err;
        if (force == null) {
          force = true;
        }
        if (!force && (this.data != null)) {
          return typeof callback === "function" ? callback(this.data) : void 0;
        }
        try {
          this.trigger('data:fetching');
          return require(['json!/nota/data'], (function(_this) {
            return function(data) {
              _this.data = data;
              _this.trigger('data:loaded');
              return typeof callback === "function" ? callback(_this.data) : void 0;
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

      return NotaClient;

    })();
    return this.Nota = new NotaClient();
  });

}).call(this);

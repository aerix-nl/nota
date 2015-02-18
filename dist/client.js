(function() {
  define('nota-client', ['backbone', 'json'], function() {
    var NotaClient;
    require.config({});
    NotaClient = (function() {
      function NotaClient() {}

      NotaClient.prototype.phantomRuntime = window._phantom != null;

      NotaClient.prototype.documentMeta = {
        data: {}
      };

      NotaClient.prototype.init = function() {
        _.extend(this, Backbone.Events);
        this.on("all", this.msgServer, this);
        this.trigger('init');
        this.trigger('loaded');
        return this;
      };

      NotaClient.prototype.msgServer = function(msg) {
        if (this.phantomRuntime) {
          return window.callPhantom(msg);
        }
      };

      NotaClient.prototype.setDocumentMeta = function(documentMeta, context) {
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

      NotaClient.prototype.getData = function(callback) {
        if (this.data == null) {
          return require(['json!/data.json'], function(data) {
            this.data = data;
            return callback(this.data);
          });
        } else {
          return callback(this.data);
        }
      };

      NotaClient.prototype.injectData = function(data) {
        this.data = data;
        return this.trigger('data:injected', this.data);
      };

      return NotaClient;

    })();
    this.Nota = new NotaClient();
    return Nota.init();
  });

}).call(this);

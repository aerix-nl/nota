(function() {
  var dependencies;

  this.TemplateApp = {};

  requirejs.config({
    baseUrl: '../bower_components/',
    paths: {
      'bootstrap': 'bootstrap/dist/js/bootstrap',
      'underscore.string': 'underscore.string/dist/underscore.string.min',
      'jed': 'jed/jed',
      'backbone': 'backbone/backbone',
      'jquery': 'vendor/jquery/dist/jquery',
      'underscore': 'vendor/underscore/underscore',
      'react': 'react/react-with-addons',
      'JSXTransformer': 'jsx/JSXTransformer',
      'jsx': 'jsx/js/jsx',
      'text': 'requirejs-text/text',
      'view': '/javascript/invoice-view',
      'model': '/javascript/invoice-model'
    }
  });

  dependencies = ['/nota.js', 'view', 'model'];

  define(dependencies, function(Nota, InvoiceView, InvoiceModel) {
    Nota.trigger('template:init');
    TemplateApp.model = new TemplateApp.InvoiceModel();
    TemplateApp.view = new TemplateApp.InvoiceView({
      model: TemplateApp.model
    });
    Nota.setDocumentMeta(function() {
      var ctx, fn;
      ctx = TemplateApp.view;
      fn = ctx.documentMeta;
      return fn.apply(ctx, arguments);
    });
    if (Nota.phantomRuntime) {
      Nota.on('data:injected', function(data) {
        return TemplateApp.model.set(data, {
          validate: true
        });
      });
    } else {
      Nota.getData(function(data) {
        return TemplateApp.model.set(data, {
          validate: true
        });
      });
    }
    'render:done';
    Nota.trigger('template:loaded');
    return TemplateApp;
  });

}).call(this);

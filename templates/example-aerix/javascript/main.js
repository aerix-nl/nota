(function() {
  var dependencies;

  this.TemplateApp = {};

  requirejs.config({
    baseUrl: '../bower_components/',
    paths: {
      'bootstrap': 'bootstrap/dist/js/bootstrap',
      'underscore.string': 'underscore.string/dist/underscore.string',
      'rivets': 'rivets/dist/rivets.bundled',
      'view': '/javascript/invoice-view',
      'model': '/javascript/invoice-model'
    }
  });

  dependencies = ['bootstrap', 'view', 'model'];

  define('template', dependencies, function(InvoiceView, InvoiceModel) {
    Nota.trigger('template:init');
    TemplateApp.model = new TemplateApp.InvoiceModel();
    TemplateApp.view = new TemplateApp.InvoiceView({
      model: TemplateApp.model
    });
    Nota.setDocumentMeta(TemplateApp.view.documentMeta, TemplateApp.view);
    Nota.on('data:injected', function(data) {
      return TemplateApp.model.set(data, {
        validate: true
      });
    });
    if (!Nota.phantomRuntime) {
      Nota.getData(function(data) {
        return TemplateApp.model.set(data, {
          validate: true
        });
      });
    }
    TemplateApp.view.on('all', function(e) {
      return Nota.trigger("template:" + e);
    });
    Nota.trigger('template:loaded');
    return TemplateApp;
  });

}).call(this);

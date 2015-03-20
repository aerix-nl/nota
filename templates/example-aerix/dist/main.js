(function() {
  var dependencies;

  requirejs.config({
    baseUrl: '../bower_components/',
    paths: {
      'jquery': 'jquery/dist/jquery',
      'bootstrap': 'bootstrap/dist/js/bootstrap',
      'underscore': 'underscore/underscore',
      'underscore.string': 'underscore.string/dist/underscore.string.min',
      'jed': 'jed/jed',
      'rivets': 'rivets/dist/rivets',
      'sightglass': 'sightglass/index',
      'moment': 'momentjs/moment',
      'moment_nl': 'momentjs/locale/nl',
      'i18next': 'i18next/i18next.amd.withJQuery',
      'json': 'requirejs-plugins/src/json',
      'text': 'requirejs-text/text',
      'requirejs': 'requirejs/require',
      'invoice': '/dist/invoice',
      'translation_nl': '/json/locales/nl.json',
      'translation_en': '/json/locales/en.json'
    },
    shim: {
      rivets: {
        deps: ['sightglass']
      }
    }
  });

  dependencies = ['/nota.js', 'invoice', 'rivets', 'underscore.string', 'moment', 'moment_nl'];

  define(dependencies, function(Nota, Invoice, rivets, s, moment) {
    var render;
    Nota.trigger('template:init');
    _.extend(rivets.formatters, Invoice.formatters);
    _.extend(rivets.formatters, Invoice.predicates);
    rivets.formatters.i18n = Invoice.i18n;
    render = function(data) {
      var language;
      language = Invoice.predicates.isInternational(data.country) ? 'en' : 'nl';
      Invoice.i18next.setLng(language);
      Nota.trigger('render:start');
      rivets.bind(document.body, data);
      rivets.bind(document.head, data);
      return Nota.trigger('render:done');
    };
    Nota.setDocumentMeta(Invoice.formatters.documentMeta);
    if (Nota.phantomRuntime) {
      Nota.on('data:injected', render);
    } else {
      Nota.getData(render);
    }
    Nota.trigger('template:loaded');
    return Invoice;
  });

}).call(this);

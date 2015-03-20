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

  dependencies = ['/nota.js', 'invoice', 'rivets', 'underscore.string', 'i18next', 'json!translation_nl', 'json!translation_en', 'moment', 'moment_nl'];

  define(dependencies, function(Nota, Invoice, rivets, s, i18n, nl, en, moment) {
    var localisations, render;
    Nota.trigger('template:init');
    return;
    _.extend(rivets.formatters, Invoice.formatters);
    _.extend(rivets.formatters, Invoice.predicates);
    localisations = {
      en: {
        translation: en
      },
      nl: {
        translation: nl
      }
    };
    render = function(data) {
      var lang;
      Nota.trigger('render:start');
      rivets.bind(document.body, data);
      rivets.bind(document.head, data);
      lang = Invoice.predicates.isInternational(data.country) ? 'en' : 'nl';
      i18n.init({
        lng: lang,
        resStore: localisations
      }, function(t) {
        $('div#invoice-meta').i18n();
        return $('div#invoice-meta').i18n();
      });
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

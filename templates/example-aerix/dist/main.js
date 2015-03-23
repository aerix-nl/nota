(function() {
  var base, dependencies;

  (base = Function.prototype).bind || (base.bind = function(_this) {
    return (function(_this) {
      return function() {
        return _this.apply(_this, arguments);
      };
    })(this);
  });

  requirejs.config({
    baseUrl: '../bower_components/',
    paths: {
      'jquery': 'jquery/dist/jquery',
      'bootstrap': 'bootstrap/dist/bootstrap',
      'backbone': 'backbone/backbone',
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

  'use strict';

  dependencies = ['/nota.js', 'invoice', 'rivets', 'underscore.string', 'i18next', 'json!translation_nl', 'json!translation_en', 'moment', 'moment_nl'];

  define(dependencies, function(Nota, Invoice, rivets, s, i18n, nl, en, moment) {
    var invoice, render;
    Nota.trigger('template:init');
    invoice = new Invoice();
    i18n.init({
      resStore: {
        en: {
          translation: en
        },
        nl: {
          translation: nl
        }
      },
      missingKeyHandler: function(lng, ns, key, defaultValue, lngs) {
        throw new Error(arguments);
      }
    });
    rivets.formatters.i18n = function(key, count, readout) {
      if (count != null) {
        if (readout != null) {
          count = count['length'];
        }
        return i18n.t(key, {
          count: count
        });
      } else {
        return i18n.t(key);
      }
    };
    _.extend(rivets.formatters, invoice);
    render = function(data) {
      invoice.set(data, {
        validate: true
      });
      i18n.setLng(invoice.language());
      Nota.trigger('render:start');
      rivets.bind(document.body, data);
      rivets.bind(document.head, data);
      return Nota.trigger('render:done');
    };
    Nota.setDocumentMeta(invoice.documentMeta);
    if (Nota.phantomRuntime) {
      Nota.on('data:injected', render);
    } else {
      Nota.getData(render);
    }
    Nota.trigger('template:loaded');
    this.invoice = invoice;
    return invoice;
  });

}).call(this);

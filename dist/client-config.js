(function() {
  requirejs.config({
    paths: {
      'nota-client': '/lib/client',
      'template': '/javascript/main',
      'backbone': '/vendor/backbone/backbone',
      'jquery': '/vendor/jquery/dist/jquery',
      'underscore': '/vendor/underscore/underscore',
      'json': '/vendor/requirejs-plugins/src/json',
      'text': '/vendor/requirejs-text/text',
      'requirejs': '/vendor/requirejs/require',
      'data': 'json!/data.json'
    },
    shim: {
      'template': {
        deps: ['nota-client']
      }
    }
  });

  require(['nota-client', 'json!/bower.json'], function(NotaClient, bower) {
    if (bower.main != null) {
      requirejs.config({
        paths: {
          'template': bower.main
        }
      });
    }
    require(['template'], function(TemplateApp) {});
    if (typeof TemplateApp !== "undefined" && TemplateApp !== null) {
      return NotaClient.TemplateApp = TemplateApp;
    }
  });

}).call(this);

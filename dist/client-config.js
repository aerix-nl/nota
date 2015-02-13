(function() {
  requirejs.config({
    baseUrl: '/vendor/',
    paths: {
      'nota-client': '/lib/client',
      'template': '/javascript/main',
      'backbone': 'backbone/backbone',
      'jquery': 'jquery/dist/jquery',
      'underscore': 'underscore/underscore',
      'json': 'requirejs-plugins/src/json',
      'text': 'requirejs-text/text',
      'requirejs': 'requirejs/require'
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

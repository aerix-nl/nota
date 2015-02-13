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

}).call(this);

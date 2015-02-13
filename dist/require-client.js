(function() {
  requirejs.config({
    baseUrl: '/vendor/',
    paths: {
      'jquery': 'jquery/dist/jquery',
      'underscore': 'underscore/underscore',
      'backbone': 'backbone/backbone',
      'requirejs': 'requirejs/require',
      'text': 'requirejs-text/text',
      'json': 'requirejs-plugins/src/json',
      'nota-client': '/lib/client'
    }
  });

  require(['nota-client'], function(NotaClient) {
    return NotaClient.getData(function(data) {
      return console.log(data);
    });
  });

}).call(this);

# We user RequireJS to load the client and it's dependencies
requirejs.config {
  baseUrl: '/vendor/'
  # The following are 
  paths:
    # Nota client itself
    'nota-client': '/lib/client'
    # And the entry point for template code
    'template': '/javascript/main'

    # Backbone deps
    'backbone': 'backbone/backbone'
    'jquery': 'jquery/dist/jquery'
    'underscore': 'underscore/underscore'

    # RequireJS json! deps
    'json': 'requirejs-plugins/src/json'
    'text': 'requirejs-text/text'
    'requirejs': 'requirejs/require'

  shim:
    'template':
      deps: ['nota-client']
}
require ['nota-client', 'json!/bower.json'], (NotaClient, bower)->
  if bower.main?
    requirejs.config {
      paths: 'template': bower.main
    }
  require ['template'], (TemplateApp)->
  NotaClient.TemplateApp = TemplateApp if TemplateApp?

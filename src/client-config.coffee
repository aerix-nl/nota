# We user RequireJS to load the client and it's dependencies
requirejs.config {

  # The following are
  paths:
    # Nota client itself
    'nota-client': '/lib/client'
    # And the entry point for template code
    'template': '/javascript/main'

    # Common dependencies
    'backbone':   '/vendor/backbone/backbone'
    'jquery':     '/vendor/jquery/dist/jquery'
    'underscore': '/vendor/underscore/underscore'

    # RequireJS json! deps
    'json':      '/vendor/requirejs-plugins/src/json'
    'text':      '/vendor/requirejs-text/text'
    'requirejs': '/vendor/requirejs/require'

    # Data
    'data': 'json!/data.json'

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

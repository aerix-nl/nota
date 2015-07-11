
# We user RequireJS to load the dependencies
requirejs.config {
  paths:
    # Common dependencies
    'backbone':   '/vendor/backbone/backbone'
    'jquery':     '/vendor/jquery/dist/jquery'
    'underscore': '/vendor/underscore/underscore'

    # RequireJS json! deps
    'json':      '/vendor/requirejs-plugins/src/json'
    'text':      '/vendor/requirejs-text/text'
    'requirejs': '/vendor/requirejs/require'
}

define ['backbone', 'json'], ->

  console.log 44
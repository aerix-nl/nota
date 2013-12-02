requirejs.config {
  baseUrl: "../../" # Navigate out of the template directory to the application root
  paths: {
    "jquery":             "bower_components/jquery/jquery"
    "underscore":         "bower_components/underscore/underscore"
    "underscore.string":  "bower_components/underscore.string/lib/underscore.string"
    "backbone":           "bower_components/backbone/backbone"
    "nota-client":        "javascript/nota-client"
    "nota-view":          "javascript/nota-view"
    "nota-model":         "javascript/nota-model"
  }
  shim: {
    'underscore': {
      exports: '_'
    }
    'underscore.string': {
      deps: ['underscore']
    }
    'backbone': {
      # These script dependencies should be loaded before loading
      # backbone.js
      deps: ['underscore', 'jquery']
      # Once loaded, use the global 'Backbone' as the module value.
      exports: 'Backbone'
    }
    'nota-view': {
      deps: ['nota-client', 'backbone', 'underscore.string']
    }
    'nota-model': {
      deps: ['nota-client', 'backbone']
    }
    'nota-client': {
      exports: 'Nota'
    }
  }
}

# First we'll need nota basics
require ['nota-client', 'nota-view', 'nota-model'], ->
  # Then we try to load the template definition

  # But first we'll set up some error handling so you can develop and Nota
  # playing along nicely when you haven't set up your template yet fully.
  require.config
    catchError: true
    baseUrl: 'javascript' # Switch back to the template javascript directory
  require.onError = (requireType, requireModules)->
    console.log 'requireType'
    console.log requireType
    console.log 'requireModules'
    console.log requireModules
    alert("Template load error (see console)")
  # Attempt to load the template javascript object
  require ['define-template']

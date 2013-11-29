requirejs.config {
  baseUrl: "../../" # Navigate out of the template directory to the application root
  paths: {
    "jquery":             "bower_components/jquery/jquery"
    "underscore":         "bower_components/underscore/underscore"
    "underscore.string":  "bower_components/underscore.string/lib/underscore.string"
    "backbone":           "bower_components/backbone/backbone"
    "nota-core":          "javascript/nota-core"
    "nota-view":          "javascript/nota-view"
  }
  shim: {
    'underscore': {
      exports: '_'
    }
    'backbone': {
      # These script dependencies should be loaded before loading
      # backbone.js
      deps: ['underscore', 'jquery']
      # Once loaded, use the global 'Backbone' as the module value.
      exports: 'Backbone'
    }
    'nota-core': {
      deps: ['backbone', 'underscore' 'jquery', 'nota-view']
      exports: 'Nota'
    }
    'nota-view': {
      deps: ['nota-core', 'backbone']
    }
    'nota': {
      deps: ['nota-core', 'nota-view']
    }
  }
}
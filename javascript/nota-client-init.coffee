# Navigate out of the template javascript directory to the application root:
root = "../../../"
bowerRoot = root + "bower_components/"
notaClient = root + "javascript/"

requirejs.config {
  baseUrl: 'javascript'
  paths: {
    "jquery":             bowerRoot+"jquery/jquery"
    "underscore":         bowerRoot+"underscore/underscore"
    "underscore.string":  bowerRoot+"underscore.string/lib/underscore.string"
    "backbone":           bowerRoot+"backbone/backbone"
    "text":               bowerRoot+"requirejs-text/text"
    "nota-client":        notaClient+"nota-client"
    "nota-view":          notaClient+"nota-view"
    "nota-model":         notaClient+"nota-model"
    # Stub of a future GUI, but because of XHR restrictions I need server
    # "nota-system.html":   root+"templates/nota-system.html"
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
      deps: ['underscore', 'jquery']
      exports: 'Nota'
    }
  }
}
# First we'll need nota basics
require ['nota-client'], (Nota)->
  # Then we try to load the template definition
  # But first we'll set up some error handling so you can develop with Nota
  # client playing along nicely, even when you haven't set up your template
  # yet fully.
  require.onError = (requireType, requireModules)->
    console.log 'requireType:'
    console.log requireType
    console.log 'requireModules:'
    console.log requireModules
    #alert("Template load error (see console)")
  # Attempt to load the template javascript object
  require ['text!define-template.json'], (template)->
    template = JSON.parse template
    # If we got here the template definition is available and we proceeed by
    # loading the template (and it's dependencies) and starting it up.
    dependencies = if Nota.phantomRutime
      template.dependencies
    else 
      # If the Nota god is not present, we'll have to fix our own data. For
      # nice previewing and development ease in your browser we also load the
      # preview/test data so we can show of Nota clientside's functioning.
      template.dependencies.concat(template.previewDependencies)
    # In case you have a more complex dependency tree; all fine with us, just
    # give us the RequireJS with shim, paths, baseURL, and whatever you like.
    if template.requireJSconfig? then requirejs.config requireJSconfig
    require dependencies, ->
      # 'unpack' the view, model and test data from the arguments that this
      # require yielded.
      testJSON = JSON.parse arguments[dependencies.length-1]
      template.view = arguments[dependencies.indexOf(template.view)]
      template.model = arguments[dependencies.indexOf(template.model)]
      # Start nota with this template
      try
        Nota.init
          withTemplate: template
          withData: testJSON #if not Nota.phantomRutime 
      catch error
        console.log error

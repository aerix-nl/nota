toRoot = "../../../"
bowerRoot = toRoot + "bower_components/"
notaClientJavascript = toRoot + "javascript/"

requirejs.config {
  baseUrl: 'javascript'
  # Navigate out of the template directory to the application root using "../../"
  paths: {
    "jquery":             bowerRoot+"jquery/jquery"
    "underscore":         bowerRoot+"underscore/underscore"
    "underscore.string":  bowerRoot+"underscore.string/lib/underscore.string"
    "backbone":           bowerRoot+"backbone/backbone"
    "nota-client":        notaClientJavascript+"nota-client"
    "nota-view":          notaClientJavascript+"nota-view"
    "nota-model":         notaClientJavascript+"nota-model"
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
  require ['define-template'], (template)->
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
      testJSON = arguments[dependencies.length-1]
      template.view = arguments[dependencies.indexOf(template.view)]
      template.model = arguments[dependencies.indexOf(template.model)]
      # Start nota with this template
      try
        Nota.init
          withTemplate: template
          withData: testJSON #if not Nota.phantomRutime 
      catch error
        console.log error

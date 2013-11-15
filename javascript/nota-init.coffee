# Init namespace
@Nota = {
  # This is the namespace where you should append your template class, and Nota will use it as an index
  Templates: {}
  # Probe for the existence of PhantomJS ... signs that we're running in a simulation
  phantomRuntime: window._phantom?
  # Synchronous order in which dependencies must be resolved (array after array)
  dependencies: [
    [
      # Base dependencies
      "../../bower_components/jquery/jquery.js",
      "../../bower_components/underscore/underscore.js"
    ],
      # Underscore.string needs Underscore to be initialized to intergrate
    [ "../../bower_components/underscore.string/lib/underscore.string.js" ],
      # Backbone needs jQuery dependencies
    [ "../../bower_components/backbone/backbone.js"],
    [
      # Core needs Backbone
      "../../javascript/nota-core.js",
      "../../javascript/nota-view.js",
      # Aerix template model and view logic
      "javascript/invoice-view.js",
      "javascript/invoice-model.js"
    ]
  ]
}

# If god ... eh, PhantomJS is not present also load these two for development and template preview purposes
if not @Nota.phantomRuntime then @Nota.dependencies.push(
  ["../../javascript/test-data.js"])

@dependencyStage = -1
# Recursively solve dependencies and then start
initNota = (testModel)=>
  @dependencyStage = @dependencyStage+1
  # If there is more to resolve, continue recursively
  if @dependencyStage < @Nota.dependencies.length then require @Nota.dependencies[@dependencyStage], initNota
  else # We're done
    # Now let's start
    @Nota.initView()
    # If PhantomJS is not present we load the defaults, else the page will sit and wiat for a call from 'above'
    @Nota.update(testModel) unless @Nota.phantomRuntime
    if @Nota.phantomRuntime then window.callPhantom 'nota:ready'

initNota()
# Hook in global namespace so that dependencies can place
# their class definition in the template namespace.
this.TemplateApp = {}

requirejs.config {
  baseUrl: '../bower_components/'
  paths:
    # Vendor goodies this template depends on
    'bootstrap':          'bootstrap/dist/js/bootstrap'
    'underscore.string':  'underscore.string/dist/underscore.string.min'
    'jed':                'jed/jed'
    'backbone':           'backbone/backbone'
    'jquery':             'vendor/jquery/dist/jquery'
    'underscore':         'vendor/underscore/underscore'

    # Template stuff
    'view': '/dist/invoice-view'
    'model': '/dist/invoice-model'
}

# In the above config not all dependencies are declared because
# some of them which this template depends on (e.g. Backbone, _)
# have already been made available by Nota client earlier.
dependencies = ['/nota.js', 'view', 'model']

# We receive the dependencies as args in the same order as they are in the array
define dependencies, (Nota, InvoiceView, InvoiceModel) ->
  Nota.trigger 'template:init'

  TemplateApp.model = new TemplateApp.InvoiceModel
  TemplateApp.view = new TemplateApp.InvoiceView
    model: TemplateApp.model

  # Provide Nota client with a function to aquire meta data
  Nota.setDocumentMeta ->
    # In this case the documentMeta function depends on the TemplateApp.View
    # context so we closure wrap that context in
    ctx = TemplateApp.view
    fn  = ctx.documentMeta
    fn.apply(ctx, arguments)

  if Nota.phantomRuntime
    # Listen and wait for the server to inject data
    Nota.on 'data:injected', (data)->
      TemplateApp.model.set(data, {validate: true}) # This will trigger a render
  # Unless we're not running in PhantomJS and we'll never receive an
  # injection and we'll have to fetch it ourselves
  else Nota.getData (data)->
    TemplateApp.model.set(data, {validate: true})

  # Forward all view events to Nota client under a seperate namespace
  TemplateApp.view.on 'all', Nota.logEvent, Nota

  # We're done with setup
  Nota.trigger 'template:loaded'

  # Export TemplateApp var for use in other modules
  return TemplateApp

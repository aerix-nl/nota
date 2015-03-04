# Hook in global namespace so that dependencies can place
# their class definition in the template namespace.
this.TemplateApp = {}

requirejs.config {
  baseUrl: '../bower_components/'
  paths:
    # Vendor goodies
    'bootstrap': 'bootstrap/dist/js/bootstrap'
    'underscore.string': 'underscore.string/dist/underscore.string.min'
    'rivets': 'rivets/dist/rivets.bundled'
    # Template stuff
    'view': '/javascript/invoice-view'
    'model': '/javascript/invoice-model'
}

# In the above config not all dependencies are declared because
# some of them which this template depends on (e.g. Backbone, _)
# have already been made available by Nota client earlier.
dependencies = ['bootstrap', 'view', 'model']

define 'template', dependencies, (InvoiceView, InvoiceModel) ->

  Nota.trigger 'template:init'

  TemplateApp.model = new TemplateApp.InvoiceModel()
  TemplateApp.view = new TemplateApp.InvoiceView({ model: TemplateApp.model })

  # Provide Nota client with a function to aquire meta data
  Nota.setDocumentMeta TemplateApp.view.documentMeta, TemplateApp.view

  # Listen and wait for the server to inject data
  Nota.on 'data:injected', (data)->
    TemplateApp.model.set(data, {validate: true}) # This will trigger a render

  # Unless we're not running in PhantomJS and we'll never receive an
  # injection and we'll have to fetch it ourselves
  unless Nota.phantomRuntime then Nota.getData (data)->
    TemplateApp.model.set(data, {validate: true})

  # Forward all view events to Nota client under a seperate namespace
  TemplateApp.view.on 'all', (e)-> Nota.trigger "template:#{e}"

  # We're done with setup
  Nota.trigger 'template:loaded'

  # Export TemplateApp var for use in other modules
  return TemplateApp

requirejs.config {
  baseUrl: '../bower_components/'
  paths:
    # Vendor goodies this template depends on
    'jquery':             'jquery/dist/jquery'
    'bootstrap':          'bootstrap/dist/js/bootstrap'
    'underscore':         'underscore/underscore'
    'underscore.string':  'underscore.string/dist/underscore.string.min'
    'jed':                'jed/jed'
    'rivets':             'rivets/dist/rivets'
    'sightglass':         'sightglass/index'
    'moment':             'momentjs/moment'
    'moment_nl':          'momentjs/locale/nl'
    'i18next':            'i18next/i18next.amd.withJQuery'

    # RequireJS json! deps
    'json':               'requirejs-plugins/src/json'
    'text':               'requirejs-text/text'
    'requirejs':          'requirejs/require'

    # Template stuff
    'invoice':            '/dist/invoice'
    'translation_nl':     '/json/locales/nl.json'
    'translation_en':     '/json/locales/en.json'

  shim:
    rivets:
      deps: ['sightglass']
}

# In the above config not all dependencies are declared because
# some of them which this template depends on (e.g. Backbone, _)
# have already been made available by Nota client earlier.
dependencies = [
  '/nota.js',
  'invoice',
  'rivets',
  'underscore.string',
  'moment',
  'moment_nl'
]

# We receive the dependencies as args in the same order as they are in the array
define dependencies, (Nota, Invoice, rivets, s, moment) ->
  Nota.trigger 'template:init'

  _.extend rivets.formatters, Invoice.formatters
  _.extend rivets.formatters, Invoice.predicates
  rivets.formatters.i18n = Invoice.i18n

  render = (data)->
    language = if Invoice.isInternational(data) then 'en' else 'nl'
    Invoice.i18next.setLng language
    Nota.trigger 'render:start'
    rivets.bind document.body, data
    rivets.bind document.head, data
    Nota.trigger 'render:done'

  # Provide Nota client with a function to aquire meta data
  Nota.setDocumentMeta Invoice.formatters.documentMeta

  if Nota.phantomRuntime
    # Listen and wait for the server to inject data
    Nota.on 'data:injected', render
  # Unless we're not running in PhantomJS and we'll never receive an
  # injection and we'll have to fetch it ourselves
  else Nota.getData render

  # We're done with setup
  Nota.trigger 'template:loaded'

  # Export Invoice var for use in other modules
  return Invoice

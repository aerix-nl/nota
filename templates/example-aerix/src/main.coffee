Function.prototype.bind ||= ( _this ) -> => @apply(_this, arguments)

requirejs.config {
  baseUrl: '../bower_components/'
  paths:
    # Vendor goodies this template depends on
    'jquery':             'jquery/dist/jquery'
    'bootstrap':          'bootstrap/dist/bootstrap'
    'backbone':           'backbone/backbone'
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

'use strict'
# In the above config not all dependencies are declared because
# some of them which this template depends on (e.g. Backbone, _)
# have already been made available by Nota client earlier.
dependencies = [
  '/nota.js',
  'invoice',
  'rivets',
  'underscore.string',
  'i18next',
  'json!translation_nl',
  'json!translation_en',
  'moment',
  'moment_nl'
]

# We receive the dependencies as args in the same order as they are in the array
define dependencies, (Nota, Invoice, rivets, s, i18n, nl, en, moment) ->
  Nota.trigger 'template:init'

  invoice = new Invoice()
   
  i18n.init {
    resStore:
      en: { translation: en }
      nl: { translation: nl }

    missingKeyHandler: (lng, ns, key, defaultValue, lngs) ->
      throw new Error arguments
  }

  rivets.formatters.i18n = (key, count, readout)->
    if count?
      if readout? then count = count['length']
      i18n.t key, count: count
    else i18n.t key

  _.extend rivets.formatters, invoice

  render = (data)->
    invoice.set(data, validate: true)
    i18n.setLng invoice.language()
    Nota.trigger 'render:start'
    rivets.bind document.body, data
    rivets.bind document.head, data
    Nota.trigger 'render:done'

  # Provide Nota client with a function to aquire meta data
  Nota.setDocumentMeta -> invoice.documentMeta.apply(invoice, arguments)

  if Nota.phantomRuntime
    # Listen and wait for the server to inject data
    Nota.on 'data:injected', render
  # Unless we're not running in PhantomJS and we'll never receive an
  # injection and we'll have to fetch it ourselves
  else Nota.getData render

  # We're done with setup
  Nota.trigger 'template:loaded'

  # Export invoice var for use in other modules
  @invoice = invoice
  return invoice

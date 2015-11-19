

# We user RequireJS to load the dependencies
requirejs.config {
  paths:
    # Common dependencies
    'backbone':   '/nota/vendor/backbone/backbone'
    'jquery':     '/nota/vendor/jquery/dist/jquery'
    'underscore': '/nota/vendor/underscore/underscore'
    'bluebird':   '/nota/vendor/bluebird/js/browser/bluebird'

    # RequireJS json! deps
    'json':       '/nota/vendor/requirejs-plugins/src/json'
    'text':       '/nota/vendor/requirejs-text/text'
    'requirejs':  '/nota/vendor/requirejs/require'
}

define ['backbone', 'underscore', 'bluebird', 'json'], (Backbone, _, Promise)->
  # Reset require.js because we're done loading our dependencies
  # And so that any use hereafter require has a clean slate.
  # In this case the template will load after Nota client, which
  # we want to allow to be written as if require wasn't configured
  # before, so the template author doesn't have to worry about
  # unexpected side effects from the config Nota set earlier.
  requirejs.config({})

  class NotaClient
    # window._phatom is defined it we're running in PhantomJS
    phantomRuntime: window._phantom?

    # key/value store for the backend to retrieve data from like document meta data (used for
    # proposing filename), page header and footer template, etc.
    document: {}

    constructor: ->
      _.extend(@, Backbone.Events)

      # Forward all nota client related messages to the server
      @on "all", @logEvent, @
      @trigger 'init'

      # So that stylists can condition on running in PhantomJS or browser
      if @phantomRuntime then $('body').addClass 'phantomRuntime'
      else $('body').addClass 'browserRuntime'

      @trigger 'loaded'
      @

    logEvent: (message) ->
      if @phantomRuntime then window.callPhantom(message)
      else console.info(message)

    # Call with either a message and the original error, or only the error (as the first argument)
    logError: (error, contextMessage)->

      if @phantomRuntime
        # From here on it's upwards through the PhantomJS's layer. Though
        # errors get caught by PhantomJS and processed (even incorrectly as
        # "onConsoleError" events), it sadly only keeps the error message. The
        # valuable stack trace information is lost. So we'll have to compose a
        # comprehensive error message with a stack trace ourselves.
        error.message = """
        #{contextMessage}
        #{error.message}
        #{error.stack}
        """

      else # we're just running in the browser
        # Console.error is only valuable when running in the browser. Only then does it really get
        # handled by the console error channel. Sadly, PhantomJS seems to ignore the channel
        # categories and just fires everything like a "onConsoleLog" event, instead of an
        # "onConsoleError". Only thrown errors get fired as an "onConsoleEror" event.
        console.error contextMessage

      console.log 44
      throw error

    documentIsMultipage: ->
      @documentPages() > 1

    # Caculates to how many pages this document will be captured in PDF
    documentPages: ->
      toMMconversion = 3.187864111498258 # 1mm is 3.187864111498258px

      # TODO:
      # Find out why PhantomJS doesn't comply with the standard ISO216 A4
      # height, where a single page is 297mm. Somehow a 297mm page overflows
      # to 2 pages during capture, due to what seems like either a zoom factor
      # applied, or an unwanted change in page size settings. Apparently 287mm
      # is what PhantomJS considers A4 :/ try find fix ...
      pages = ($('body').height() / toMMconversion) / 287

    # Key-value store for the backend (PhantomJS) to retreive data from
    setDocument: (property, value)->
      if not property? then throw new Error("Document property to set is not defined")
      if not value?    then throw new Error("Document property value is not defined")

      @document[property] = value

    getDocument: (property)->
      if not property? then throw new Error("Document property is not defined")

      @document[property]


    # DEPRECATED:
    # Legacy API support. Use `setDocument('meta', value)` or
    # `getDocument('meta')` instead. Will be removed in 3.0
    setDocumentMeta: (data, context)->
      if typeof data is "function" then data = data.call(context)
      @setDocument('meta', data)

    getDocumentMeta: ->
      @getDocument('meta')


    # Active:
    # Force the client to probe the server for data
    # (used when previewing/developing templates in the browser)
    getData: (callback)->
      if not callback?
        throw new Error "Callback that receives the data is required when using this method."

      try
        @trigger 'data:fetching'
        # Else we continue and get the data from the server
        require ['json!/nota/data'], (@data) =>
          @trigger 'data:loaded'
          callback(@data)
      catch err
        console.log err.stack

    # Passive:
    # Wait on this entry point for Nota server to inject the data
    # (used by PhantomJS during .PDF production)
    injectData: (@data)->
      @trigger 'data:injected', @data


    setBuildTarget: (target)->
      @buildTarget = target

    # Request what we're going to build to (if rendering in PhantomJS), what
    # the build target is (e.g. PDF, email, standalone-HTML).
    getBuildTarget: ->
      if @buildTarget?
        @buildTarget
      else if @phantomRuntime
        # TODO: FIXME: https://github.com/sgentle/phantomjs-node/issues/292
        window.callPhantom('req:build-target')

    promiseTemplateInit: ->
      @trigger 'template:init'
      new Promise()
      .then (value)=>
        @trigger 'template:loaded', value
      .catch (error)=>
        @trigger 'template:error', error

    promiseTempalteRender: ->
      @trigger 'template:render:start'
      new Promise()
      .then (value)=>
        @trigger 'template:render:done', value
      .catch (error)=>
        @trigger 'template:render:error', error

  # Hook ourself into the global namespace so we can be interfaced with
  this.Nota = new NotaClient()




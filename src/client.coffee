define 'nota-client', ['backbone', 'json'], ->
  # Reset require.js because we're done loading our dependencies
  # And so that any use hereafter require has a clean slate.
  # In this case the template will load after Nota client, which
  # we want to allow to be written as if require wasn't configured
  # before, so the template author doesn't have to worry about
  # unexpected side effects from the config Nota set earlier.
  require.config({})

  class NotaClient
    # window._phatom is defined it we're running in PhantomJS
    phantomRuntime: window._phantom?

    # Document meta is where the template can provide Nota with
    # meta data of the document. This read used by Nota server
    # before a .PDF capture to 'ask' if there are suggestions
    # for e.g. the .PDF filename. The variable can be either a hash
    # or a function that yields an equivalently formatted hash.
    #
    # meta hash example = {
    #   id: '44'
    #   documentName: 'Invoice 2013.0044'
    #   filesystemName: 'Invoice_2014.0044-Client_Name.pdf'
    # }
    documentMeta:
      data: {}

    init: ->
      _.extend(@, Backbone.Events)
      # Forward all nota client related messages to the server
      @on "all", @msgServer, @

      @trigger 'init'
      # Future init code goes here
      @trigger 'loaded'
      @

    msgServer: (msg)-> if @phantomRuntime then window.callPhantom(msg)

    setDocumentMeta: (documentMeta, context)->
      if typeof documentMeta is 'function'
        @documentMeta.fn = documentMeta

        # The document meta function will often depend on the template as it's context
        if context? then @documentMeta.context = context

      else @documentMeta.data = documentMeta

    getDocumentMeta: ->
      if @documentMeta.fn?
        ctx = @documentMeta.context
        if ctx? then @documentMeta.fn.call(ctx)
        else @documentMeta.fn()
      else @documentMeta.data

    # Active:
    # Force the client to probe the server for data
    # (used when previewing/developing templates in the browser)
    getData: (callback)->
      # If we don't have a chache of the data yet, get it and save it
      if not @data? then require ['json!/data.json'], (@data)-> callback(@data)
      else callback(@data)

    # Passive:
    # Wait on this entry point for Nota server to inject the data
    # (used by PhantomJS during .PDF production)
    injectData: (@data)->
      @trigger 'data:injected', @data

  # Hook ourself into the global namespace so we can be interfaced with
  this.Nota = new NotaClient()
  Nota.init()



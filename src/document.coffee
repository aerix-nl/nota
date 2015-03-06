fs            = require('fs')
Q             = require('q')
path          = require('path')
phantom       = require('phantom')
_             = require('underscore')._
Backbone      = require('backbone')

NotaHelper = require('./helper')

# This class is basically a wrapper of a PhantomJS instance
class Document

  timeout: 1500

  constructor: ( @server, @options ) ->
    _.extend(@, Backbone.Events)

    phantom.create ( @phantomInstance ) =>
      phantomInstance.createPage ( @page ) =>
        # Keep track of resources
        @counter = []
        @timer = null

        # TODO: Get this stuff from the template definition (extend bower.json?)
        @page.set 'paperSize', @options.paperSize

        @page.onConsoleMessage  ( msg ) -> console.log   msg
        @page.set 'onError',    ( msg ) -> console.error msg
        @page.set 'onCallback', ( msg ) => @trigger("client:#{msg}")
        @page.set 'onResourceRequested', @onResourceRequested
        @page.set 'onResourceReceived',  @onResourceReceived

        @trigger 'page:init'

        @page.open @serverUrl, ( status ) =>
        
          if status is 'success'
            @emit 'page:opened'

            @on 'client:template:loaded',      @injectData,     @
            @on 'client:template:render:done', @onDataRendered, @
        
          else
            throw new Error "Unable to load page: #{status}"
            @close()
            @emit 'page:fail'

  # The callback will receive the meta data as it's argument when done
  getMeta: (callback)->
    getFn = -> Nota.getDocumentMeta()
    @page.evaluate getFn, (meta = {})->
      if meta is {} then @emit 'page:no-meta' else @emit 'page:meta-fetched', meta
      callback(meta)

  capture: (options = {})->
    @emit 'render:init'
    { outputPath } = options

    @geMeta (meta)=>
      # If the explicitly defined output path is merely an output directory,
      # then it still leaves open the question of the final render filename,
      # which in this case we'll check with the meta data provided from the
      # template, if there is any.
      if NotaHelper.isDir(outputPath)
        if meta.filesystemName?
          outputPath = path.join(outputPath, meta.filesystemName)
        else
          # Else we have no suggestion from the template, and we resort to the
          # default filename as provided in the config, which isn't a very
          # meaningful or unique one :(
          outputPath = path.join(outputPath, @options.defaultFilename)

      # Now we'll have an output path and filename, do a check if it's already
      # occupied.
      if NotaHelper.fileExists(outputPath) and not options.preserve
        @emit 'render:overwrite', outputPath

      # Update the meta data with the final output path and options passed to
      # this render call
      options.outputPath = outputPath
      _.extend meta, options

      # This is where the real PDF making magic happens. Credits to PhantomJS
      @page.render outputPath, ( ) =>
        @emit 'render:done', meta

  # render: ( outputPath, callback, options = {} ) ->
  #   doRender = =>
  #     @trigger "render:init"

  #     @page.open @server.url(), ( status ) =>
  #       @trigger "page:init"

  #       if status is 'success' then @once "page:ready", =>
  #         @page.render outputPath, callback
  #       else throw new Error "Unable to load page: #{status}"

  #   unless @page?
  #     @once "document:ready", doRender
  #   else doRender()

  onResourceRequested: ( request ) =>
    @trigger "page:resource:requested"
    if @counter.indexOf(request.id) == -1
      @counter.push(request.id)
      clearTimeout(@timer)

  onResourceReceived: ( resource ) =>
    @trigger "page:resource:received"
    return if resource.stage isnt "end" and not resource.redirectURL?
    return if (i = @counter.indexOf resource.id) is -1

    @counter.splice(i, 1)

    if @counter.length is 0
      @timer = setTimeout =>
        @trigger "page:loaded"
      , @timeout

  injectData: (data)->
    @rendered = false
    inject = (data)->
      Nota.injectData(data)
    @page.evaluate inject, null, data

  onDataRendered: ->
    @rendered = true
    @emit 'page:ready'

  close: ->
    @page.close()
    @phantomInstance.exit()

module.exports = Document


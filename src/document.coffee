fs            = require('fs')
Q             = require('q')
path          = require('path')
phantom       = require('phantom')
_             = require('underscore')._
Backbone      = require('backbone')

NotaHelper = require('./helper')

# This class is basically a wrapper of a PhantomJS instance
class Document

  constructor: ( @server, @options ) ->
    _.extend(@, Backbone.Events)

    phantom.create ( @phantomInstance ) =>
      phantomInstance.createPage ( @page ) =>
        # Keep track of resources
        @counter = []
        @timer = null

        # TODO: Get this stuff from the template definition (extend bower.json?)
        @page.set 'paperSize', @options.paperSize
        # TODO: Find for a fix that makes the zoomFactor work again, and after
        # find a real fix for this workaround to counter a strange zoom factor.
        # @page.zoomFactor = 0.9360

        @page.onConsoleMessage  ( msg ) -> console.log   msg
        @page.set 'onError',    ( msg ) -> console.error msg
        @page.set 'onCallback', ( msg ) => @trigger("client:#{msg}")
        @page.set 'onResourceRequested', @onResourceRequested
        @page.set 'onResourceReceived',  @onResourceReceived

        @trigger 'page:init'

        @page.open @server.url(), ( status ) =>
        
          if status is 'success'
            @trigger 'page:opened'

            # @on 'client:template:loaded',      @injectData,     @
            # TODO: this render:done event is critical and kinda clumsy imo
            @on 'client:template:render:done', @onDataRendered, @
        
          else
            throw new Error "Unable to load page: #{status}"
            @trigger 'page:fail'
            @close()

  # The callback will receive the meta data as it's argument when done
  getMeta: (callback)->
    getFn = -> Nota.getDocumentMeta()
    @page.evaluate getFn, (meta = {})=>
      if meta is {} then @trigger 'page:no-meta' else @trigger 'page:meta-fetched', meta
      callback(meta)

  capture: (captureOptions = {})->
    @trigger 'render:init'
    { outputPath } = captureOptions # For shorter code we unpack this var

    # TODO: Remove this fix when hyperlinks are being rendered properly:
    # https://github.com/ariya/phantomjs/issues/10196
    @page.evaluate ->
      $('a').each (idx, a)->
        $(a).replaceWith $('<span class="hyperlink">'+$(a).text()+'</span>')[0]

    @getMeta (meta)=>
      # If the explicitly defined output path is merely an output directory,
      # then it still leaves open the question of the actual filename, which
      # in this case we'll check with the meta data provided by the template,
      # if there is any suggestion from it's side. If so, then we use that
      # one. If the output path is not defined at atl, we just give it the
      # default filename.
      if outputPath?
        if NotaHelper.isDirectory(outputPath)
          if meta.filesystemName?
            outputPath = path.join(outputPath, meta.filesystemName)
          else
            # Else we have no suggestion from the template, and we resort to the
            # default filename as provided in the config, which isn't a very
            # meaningful or unique one :(
            outputPath = path.join(outputPath, @options.defaultFilename)

        # Now that we have an output path and filename, do a check if it's
        # already occupied.
        if NotaHelper.isFile(outputPath) and not captureOptions.preserve
          @trigger 'render:overwrite', outputPath

      else
        if meta.filesystemName?
          outputPath = meta.filesystemName
        else
          outputPath = @options.defaultFilename

      # Update the meta data with the final output path and options passed to
      # this render call
      captureOptions.outputPath = outputPath
      _.extend meta, captureOptions

      # This is where the real PDF making magic happens. Credits to PhantomJS
      @page.render outputPath, ( ) =>
        @trigger 'render:done', meta

  onResourceRequested: ( request ) =>
    @trigger "page:resource:requested"
    if @counter.indexOf(request.id) is -1
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
      , @options.timeout

  injectData: (data)->
    @rendered = false
    inject = (data)->
      Nota.injectData(data)
    @page.evaluate inject, null, data

  onDataRendered: ->
    @rendered = true
    @trigger 'page:ready'

  close: ->
    @page.close()
    @phantomInstance.exit()

module.exports = Document


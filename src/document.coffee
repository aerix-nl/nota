Q             = require('q')
Path          = require('path')
phantom       = require('phantom')
_             = require('underscore')._
Backbone      = require('backbone')

TemplateUtils = require('./template_utils')

# This class is basically a wrapper of a PhantomJS instance
module.exports = class Document

  pagePhases: [
    'page:opened',
    'page:loaded',
    'client:init',
    'client:loaded',
    'client:template:init',
    'client:template:loaded'
  ]

  constructor: ( @server, @options ) ->
    _.extend(@, Backbone.Events)
    @helper = new TemplateUtils()
    @on 'all', @setState, @

    phantom.create ( @phantomInstance ) =>
      phantomInstance.createPage ( @page ) =>
        # Keep track of resources
        @counter = []
        @timer = null

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

            @on 'page:loaded', =>
              # If static, then after loading HTML+CSS+images etc we're done
              @trigger 'page:rendered' if @options.templateType is 'static'
            @on 'client:template:render:done', =>
              # If scripted, we also need to then wait till the template webapp
              # has finished rendering the page.
              @trigger "page:rendered" if @options.templateType is 'scripted'

          else
            throw new Error "Unable to load page: #{status}"
            @trigger 'page:fail'
            @close()

  # The callback will receive the meta data as it's argument when done
  getMeta: ->
    deferred = Q.defer()
    metaRequest = -> Nota?.getDocumentMeta()
    @page.evaluate metaRequest, deferred.resolve
    deferred.promise

  capture: (captureOptions = {})->

    # TODO: Remove this fix when hyperlinks are being rendered properly:
    # https://github.com/ariya/phantomjs/issues/10196
    @page.evaluate ->
      if $? then $('a').each (idx, a)->
        $(a).replaceWith $('<span class="hyperlink">'+$(a).text()+'</span>')[0]

    metaPromise = @getMeta()
    metaPromise.then (meta)=>
      if meta?
        @trigger 'page:meta-fetched', meta
      else
        @trigger 'page:no-meta'

      outputPath = @helper.findOutputPath
        path:             captureOptions.outputPath
        meta:             meta
        preserve:         captureOptions.preserve
        defaultFilename:  @options.defaultFilename
      
      # Update the meta data with the final output path and options passed to
      # this render call.
      captureOptions.outputPath = outputPath
      meta = _.extend {}, meta, captureOptions

      @trigger 'render:init'
      # This is where the real PDF making magic happens. Credits to PhantomJS
      @page.render outputPath, ( ) =>
        @trigger 'render:done', meta

  onResourceRequested: ( request ) =>
    @trigger 'page:resource:requested'
    if @counter.indexOf(request.id) is -1
      @counter.push(request.id)
      clearTimeout(@timer)

  onResourceReceived: ( resource ) =>
    @trigger 'page:resource:received'
    return if resource.stage isnt "end" and not resource.redirectURL?
    return if (i = @counter.indexOf resource.id) is -1

    @counter.splice(i, 1)

    if @counter.length is 0
      @timer = setTimeout =>
        @trigger 'page:loaded'
      , @options.resourceTimeout

  isReady: ->
    @document.state is 'client:template:loaded' or @document.state is 'page:loaded'
    
  injectData: (data)->
    deferred = Q.defer()
    inject = (data)->
      Nota.injectData(data)
    @page.evaluate inject, deferred.resolve, data
    deferred.promise

  setState: (event)->
    if _(@pagePhases).contains event then @state = event

  close: ->
    @page.close()
    @phantomInstance.exit()
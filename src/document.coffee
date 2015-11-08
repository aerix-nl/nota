Q             = require('q')
Path          = require('path')
chalk         = require('chalk')
phantom       = require('phantom')
_             = require('underscore')._
Backbone      = require('backbone')
Handlebars    = require('handlebars')

TemplateHelper = require('./template_helper')

# This class is basically a wrapper of a PhantomJS instance
module.exports = class Document

  pagePhases: [
    'page:init'
    'page:opened'
    'client:init'
    'client:loaded'
    'client:template:init'
    'client:template:loaded'
    'page:ready'
    'client:template:render:init'
    'client:template:render:done'
    'page:rendered'
  ]

  constructor: ( templateUrl, @logging, @options ) ->
    _.extend(@, Backbone.Events)
    @helper = new TemplateHelper(@logging)

    @on 'all', @setState, @

    phantom.create ( @phantomInstance ) =>
      @phantomInstance.createPage ( @page ) =>
        # Keep track of all currently loading resources
        @loadingResources = []
        @timers = {
          'resource':  null
          'template':  null
          'render':    null
          'extrender': null
        }

        @page.set 'paperSize',  @options.template.paperSize
        @page.set 'zoomFactor', @options.template.zoomFactor

        # TODO: Find for a fix that makes the zoomFactor work again, and after
        # find a real fix for this workaround to counter a strange zoom factor.
        # @page.zoomFactor = 0.9360

        @page.onConsoleMessage  ( msg ) => @logging.logClient msg
        @page.set 'onError',    ( msg ) => @onClientError msg
        @page.set 'onCallback', ( msg ) => @trigger("client:#{msg}")
        @page.set 'onResourceRequested', @onResourceRequested
        @page.set 'onResourceReceived',  @onResourceReceived
        @page.set 'onTemplateInit',      @onTemplateInit

        @trigger 'page:init'

        @page.open templateUrl, ( status ) =>

          if status is 'success'
            @trigger 'page:opened'
            @listen()

          else
            throw new Error "Unable to load page: #{status}"
            @trigger 'page:fail'
            @close()

  listen: ->
    # If static, then after loading HTML+CSS+images and other resources we're
    # done, there's no other rendering to wait for because there's no
    # scripting. We're ready for capture.
    if @options.template.type is 'static' then @on 'page:ready', =>
      @trigger 'page:rendered'

    # If scripted, we wait for the resource timeout to determine if the page
    # is ready. But if the template trigger an init event we cancel that
    # timeout and wait for it's 'template:loaded' event to signal it's ready.
    @on 'client:template:init', =>
      clearTimeout(@timers.resource)
      @timers['template'] = setTimeout =>
        @logging.logWarning? "Still waiting to receive #{chalk.cyan 'client:template:loaded'}
        event after #{@options.template.templateTimeout/1000}s. Perhaps it crashed?"
      , @options.template.templateTimeout

    @on 'client:template:loaded', =>
      clearTimeout(@timers.resource)
      clearTimeout(@timers.template)
      @trigger 'page:ready'

    # If scripted, we then also need to wait till either the render timeout
    # has passed or the the template webapp has signaled it has finished
    # rendering the page. Similarly, it can cancel the timeout by triggering
    # the 'render:init' event, and skip it trigging the 'render:done' event.
    if @options.template.type is 'scripted' then @on 'page:ready', =>
      # @timers['render'] = setTimeout =>
      #   @trigger 'page:rendered'
      # , @options.template.renderTimeout

      @on 'client:template:render:init', =>
        clearTimeout(@timers.render)
        @timers['extrender'] = setTimeout =>
          @logging.logWarning? "Still waiting for template to finish rendering
          after #{@options.template.extRenderTimeout/1000}s. Perhaps it crashed?"
        , @options.template.extRenderTimeout

      @on 'client:template:render:done', =>
        clearTimeout(@timers.render)
        clearTimeout(@timers.extrender)
        @trigger 'page:rendered'

  # The callback will receive the meta data as it's argument when done
  getDocumentProperty: (property)->
    if not property? then throw new Error "Document property to get is not set"

    deferred = Q.defer()

    propertyValueRequest = (property)->
      # Try and get document data if Nota client is present (i.e. template loaded it)
      Nota?.getDocument property

    @page.evaluate propertyValueRequest, deferred.resolve, property
    deferred.promise

  setFooter: (footer)=>
    if not footer? then return

    # Make a object clone that we can safely extend it with the current capture value
    paperSizeOptions = _.extend( {}, @options.template.paperSize )

    # Compfile the footer template
    footerTemplate = Handlebars.compile(footer.contents)

    # The function that receives the page parameters and renders them in using Handlebars.js
    renderFooter = (pageNum, numPages)->
      # TODO: Wait for fix so we can use non-local variables
      # See: https://github.com/ariya/phantomjs/issues/13644#issuecomment-149048161
      # Which would enable use of tempates like this:
      # footerTemplate({pageNum: pagenum, numPages: numPages})
      """
      <span style="float:right; font-family: 'DINPro', 'Roboto', sans-serif; color:#8D9699 !important; padding-right: 21mm;">
        #{pageNum} / #{numPages}
      </span>
      """

    # Place the rendering function that yields the footer HTML content
    # (wrapped in a phantomInstance.callback as required)
    footer.contents = @phantomInstance.callback renderFooter, footer.content

    paperSizeOptions.footer = footer

    # Time to set the new config of the PhantomJS page
    @page.set 'paperSize', paperSizeOptions

  capture: (job = {})->
    deferred = Q.defer()

    # We're going to augment the job object into the job meta data object, better make a
    # copy to prevent side effects.
    job = _.extend {}, job

    # TODO: Remove this fix when hyperlinks are being rendered properly:
    # https://github.com/ariya/phantomjs/issues/10196
    @page.evaluate ->
      if $? then $('a').each (idx, a)->
        $(a).replaceWith $('<span class="hyperlink">'+$(a).text()+'</span>')[0]

    # Optionally enable page numbering if configured by template
    @getDocumentProperty('footer')
    .then @setFooter
    .fail deferred.reject

    @getDocumentProperty('meta')
    .then (meta)=>
      if meta?
        @trigger 'page:meta-fetched', meta
      else
        @trigger 'page:no-meta'

      outputPath = @helper.findOutputPath
        defaultFilename:  @options.template.defaultFilename
        preserve:         job.preserve
        outputPath:       job.outputPath
        meta:             meta

      # Update the meta data with the final output path and options passed to
      # this render call.
      job.outputPath = outputPath
      meta = _.extend {}, meta, job

      @trigger 'render:init'
      # This is where the real PDF making magic happens. Credits to PhantomJS
      @page.render outputPath, ( ) =>
        @trigger 'render:done', meta
        deferred.resolve meta

    .fail deferred.reject

    deferred.promise

  onResourceRequested: ( request ) =>
    if @loadingResources.indexOf(request.id) is -1
      @loadingResources.push(request.id)
      clearTimeout(@timers.resource)

    # To prevent the output being spammed full of resource log events we allow supressing it
    @trigger 'page:resource:requested' if @options.logging?.pageResources

  onResourceReceived: ( resource ) =>
    return if resource.stage isnt "end" and not resource.redirectURL?
    # If it already got received earlier
    return if (i = @loadingResources.indexOf resource.id) is -1

    @loadingResources.splice(i, 1)

    # To prevent the output being spammed full of resource log events we allow supressing it
    @trigger 'page:resource:received' if @options.logging?.pageResources

    if @loadingResources.length is 0
      # We're done loading all resources. Set a new timer to wait if any new
      # resource requests start. If it runs out we take that as a no and that
      # the page has finished loading and the template has has enough time to
      # initialize. The template can trigger 'template:init' to cancel these
      # assumptions and take as long as it needs untill it triggers
      # 'template:loaded' to signal Nota can proceed.
      clearTimeout(@timers.resource)
      @timers['resource'] = setTimeout =>
        @trigger 'page:ready'
      , @options.template.resourceTimeout

  onClientError: (msg)->
    @logging.logClientError? msg
    if @options.template.errorTimeout?
      # After the error timeout we trigger an event to signal that the job
      # has crashed.
      @timers['error'] = setTimeout =>
        @trigger 'error-timeout', msg
      , @options.template.errorTimeout

      # On any sign of progress, cancel the timeout, because the job might
      # continue after all.
      @once 'all', => clearTimeout(@timers['error'])

  isReady: ->
    # Which ever comes first
    @state is 'page:ready'

  injectData: (data)->
    deferred = Q.defer()
    inject = (data)->
      # Try and inject data if Nota client is present (i.e. template loaded it)
      Nota?.injectData(data)
    @page.evaluate inject, deferred.resolve, data
    deferred.promise

  setState: (event)->
    if @pagePhases.indexOf(event) > @pagePhases.indexOf(@state)
      @state = event

  # Postcondition: promises to resolve after the document has reached the
  # given state
  after: (event)->
    deferred = Q.defer()

    if @state is event
      deferred.resolve()
    else @once event, ->
      deferred.resolve()

    deferred.promise

  close: ->
    @page.close()
    @phantomInstance.exit()

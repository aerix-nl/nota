Q             = require('q')
fs            = require('fs')
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
    'page:init:start'
    'page:init:opening'
    'page:resouces:loading'
    'page:resouces:loaded'
    'client:init:start'
    'client:init:done'
    'template:init:start'
    'template:init:done'
    'client:page:init:done'
    'template:render:start'
    'template:render:done'
    'page:capture:start'
    'page:capture:done'
  ]

  constructor: ( @templateUrl, @logging, @options ) ->
    if not @options.template.type?
      throw new Error "Template type not defined. Must be either static or scripted."

    _.extend(@, Backbone.Events)
    @helper = new TemplateHelper(@logging)

    @on 'all', @setState, @

    # Create a promise on the initialization of PhantomJS, the loading of the
    # template URL, and the initialization of the template (if we're hosting a
    # scripted one).
    @init = Q.defer()

    phantom.create ( @phantomInstance ) =>
      @phantomInstance.createPage ( @page ) =>
        @timers = {
          'resourcesLoaded':    null
          'templateInitSlow':   null
          'templateInitSlow':   null
          'templateRenderSlow': null
          'templateRenderDead': null
          'errorAbort':         null
        }

        @options.template.paperSize = @parsePaper(@options.template.paperSize)

        @page.set 'paperSize',  @options.template.paperSize
        @page.set 'zoomFactor', @options.template.zoomFactor

        # FIXME: TODO: Find for a fix that makes the zoomFactor work again, and after
        # find a real fix for this workaround to counter a strange zoom factor.
        # @page.zoomFactor = 0.9360

        @page.onConsoleMessage ( msg ) => @logging.logClient msg
        @page.set 'onError',              @onClientError
        @page.set 'onCallback',           @onCallback
        @page.set 'onResourceRequested',  @onResourceRequested
        @page.set 'onResourceReceived',   @onResourceReceived
        @page.set 'onTemplateInit',       @onTemplateInit

        @trigger 'page:init:start'

        @page.open @templateUrl, ( status ) =>

          if status is 'success'
            @trigger 'page:init:opened'
            @listen()

          else
            @close()
            @abortInit("Unable to load page URL: #{status}")

    return @

  listen: ->
    switch @options.template.type
      when 'static' then @listenStatic()
      when 'scripted' then @listenScripted()
      else throw new Error "Unsupported template type '#{@options.template.type}'"

  listenStatic: ->
    # If static, then after loading HTML+CSS+images and other resources we're
    # done, there's no other rendering to wait for because there's no
    # scripting. We're ready for capture.
    if @options.template.type is 'static' then @on 'page:resources:loaded', =>
      @trigger 'page:init:done'
      @init.resolve()

  listenScripted: ->
    # If scripted, we wait for the resources to have laoded (determined by the
    # resources loaded imeout), and use that as the arbiter to 'decide' that
    # the template has had enough time to be loaded and any scripting to have
    # initialized.
    @on 'page:resources:loaded', @init.resolve, @init

    # But if the template triggers an init event we cancel that timeout and
    # wait for it's 'template:init:done' event to signal it's ready.
    @once 'template:init:start', =>
      @off 'page:resources:loaded', @init.resolve, @init

      onSlowTimeout = ( )=>
        @logging.logWarning? "Still waiting to receive #{chalk.cyan 'template:init:done'}
        after #{@options.template.timeouts.templateInitSlow/1000}s. Perhaps it crashed?"
      @timers.templateInitSlow = setTimeout onSlowTimeout, @options.template.timeouts.templateInitSlow

      onDeadTimeout = ( )=>
        reason = "Template still hasn't signaled #{chalk.cyan 'template:init:done'}
        event after #{@options.template.timeouts.templateInitDead/1000}s. Assuming it crashed during
        initialization. Marking document as unusable for capture."
        @abortInit(reason)
      @timers.templateInitDead = setTimeout onDeadTimeout, @options.template.timeouts.templateInitDead

    @once 'template:init:done', =>
      clearTimeout(@timers.resourcesLoaded)
      clearTimeout(@timers.templateInitSlow)
      clearTimeout(@timers.templateInitDead)
      @init.resolve()

      # We also need to wait till either the render timeout has passed or the
      # the template webapp has signaled it has finished rendering the page.
      # Similarly, it can cancel the timeout by triggering the 'render:init'
      # event, and skip it trigging the 'render:done' event.
      @on 'template:render:start', =>
        onSlowTimeout = ( )=>
          @logging.logWarning? "Still waiting for template to finish rendering
          after #{@options.template.timeouts.templateRenderSlow/1000}s. Perhaps it crashed?"
        timeToSlow = @options.template.timeouts.templateRenderSlow
        @timers.templateRenderSlow = setTimeout onSlowTimeout, timeToSlow

        onDeadTimeout = ( )=>
          reason = "Template still hasn't signaled #{chalk.cyan 'template:render:done'}
          after #{@options.template.timeouts.templateRenderDead/1000}s. Assuming it crashed during
          rendering. Aborting job to continue with rest of job queue."
          @logging.logError? reason
          @jobAbort(reason)
        timeToDead = @options.template.timeouts.templateRenderDead
        @timers.templateRenderDead = setTimeout onDeadTimeout, timeToDead

      @on 'template:render:done', =>
        clearTimeout(@timers.templateRenderSlow)
        clearTimeout(@timers.templateRenderDead)
        @renderJob.resolve()

  # The callback will receive the meta data as it's argument when done
  getDocumentProperty: (property)->
    if not property? then throw new Error "Document property to get is not set"

    deferred = Q.defer()

    propertyValueRequest = (property)->
      # Try and get document data if Nota client is present (i.e. template loaded it)
      Nota?.getDocument(property)

    @page.evaluate propertyValueRequest, deferred.resolve, property
    deferred.promise

  # Place HTML in the parent document, convert CSS styles to fixed computed
  # style declarations, and return HTML. (required for headers/footers, which
  # exist outside of the HTML document, and have trouble getting styling
  # otherwise)
  sampleStyles: (html)->
    host = document.createElement('div')
    # Silly hack, or PhantomJS will 'blank' the main document for some reason
    host.setAttribute('style', 'display:none;')
    host.innerHTML = html

    # Append to get styling of parent page
    document.body.appendChild(host)

    elements = host.getElementsByTagName('*')
    # Iterate in reverse order (depth first) so that styles do not impact eachother
    i = elements.length - 1
    while i >= 0
      elements[i].setAttribute('style', window.getComputedStyle(elements[i], null).cssText)
      i = i - 1

    # Remove from parent page again, so we're clean
    document.body.removeChild(host)
    return host.innerHTML

  setFooter: (footer)=>
    if not footer? then return

    # Make a object clone that we can safely extend it with the current capture value
    paperSizeOptions = _.extend( {}, @options.template.paperSize )

    # Apply template styles to footer HTML
    # unless footer.sampleStyles? is false
    #   template = @page.evaluate(@sampleStyles, footer.contents)

    # The function that receives the page parameters and renders them in
    renderFooter = (pageNum, numPages)->
      # TODO: Wait for fix so we can use non-local variables
      # See: https://github.com/ariya/phantomjs/issues/13644#issuecomment-149048161
      # Which would enable use of tempates like this:
      # footerTemplate({pageNum: pagenum, numPages: numPages})
      """
      <span style="float:right; font-family: 'DINPro', 'Roboto', sans-serif;
        color:#8D9699 !important; padding-right: 21mm;"> #{pageNum} /
        #{numPages} </span>
      """

    # Place the rendering function that yields the footer HTML content
    # (wrapped in a phantomInstance.callback as required)
    footer.contents = @phantomInstance.callback renderFooter

    paperSizeOptions.footer = footer

    # Time to set the new config of the PhantomJS page
    @page.set 'paperSize', paperSizeOptions

  # In some layout/styling cases the template needs access to the full paper
  # width (for example for margin notes or overlays), so we can't use
  # PhantomJS's native margin system for capturing to PDF (which creates hard
  # margins). The template can disable this and take control of the margins
  # using it's own stylesheets. For other usecases, like multipage templates
  # with footers, using PhantomJS' margins is the only way to create
  # consistent top and bottom margins over all PDF pages.
  parsePaper: (paperSize)->
    if paperSize?.margin?.deferHorizontal
      paperSize.margin.left = 0
      paperSize.margin.right = 0

    if paperSize?.margin?.deferVertical
      paperSize.margin.top = 0
      paperSize.margin.bottom = 0

    if paperSize?.margin?.deferHorizontal?
      delete paperSize.margin.deferHorizontal

    if paperSize?.margin?.deferVertical?
      delete paperSize.margin.deferVertical

    paperSize

  capture: (job)->
    @captureJob = Q.defer()

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
    .fail @captureJob.reject

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

      # Do we have a build target specified? If not, try to derive it from the
      # output path file name extension (if it has one).
      if job.buildTarget?
        buildTarget = job.buildTarget
      else
        try
          buildTarget = @helper.buildTarget outputPath
        catch error
          # Couldn't derive buildTarget ('pdf' or 'html') from filename
          # extension apparently, perhaps no filename was provided
          throw new Error "Build target could not be established. #{error}.
          Please have your template specify one in it's proposed filename, or
          specify one with the job."

      @trigger 'page:capture:init'

      switch buildTarget
        when 'pdf'  then @capturePDF(outputPath, meta, job)
        when 'html' then @captureHTML(outputPath, meta, job)

    .fail @captureJob.reject

    @captureJob.promise

  capturePDF: (outputPath, meta, job)->
    # Ensure the extension is .pdf because PhantomJS (or the Node
    # bindings) crash when it isn't.
    if @helper.extension(outputPath) isnt 'pdf'
      outputPath = outputPath + '.pdf'

    # This is where the real PDF making magic happens. Credits to PhantomJS
    @page.render outputPath, ( ) =>
      # TODO: FIXME: https://github.com/sgentle/phantomjs-node/issues/290
      if @helper.isFile outputPath
        # Update the meta data with the final output path and options
        # passed to this render call.
        job.outputPath = outputPath
        meta = _.extend {}, meta, job
        @trigger 'page:capture:done', meta
        @captureJob.resolve meta
      else
        @captureJob.reject new Error "PhantomJS didn't render. Cause not available
        (due to bug: https://github.com/sgentle/phantomjs-node/issues/290)"

  captureHTML: (outputPath, meta, job)->
    # Load some HTML capturing only dependencies
    if not cheerio? then cheerio = require('cheerio')
    if not Inliner? then Inliner = require('inliner')

    if @helper.extension(outputPath) isnt 'html'
      outputPath = outputPath + '.html'

    @page.get 'content', (html)=>
      $ = cheerio.load html

      # Now that we have the pure HTML, we remove all script tags
      # because we're going for a static HTML document anyway. Don't
      # need to include these anymore.
      $('script').remove()

      # Also, we'll have to resolve the relative URL's of all locally
      # served assets so that Inliner will be able to load those from
      # the currently running Nota instance. But we shouldn't touch
      # anything that references or sources something external already
      # (those will start with `http://` or some other protocol)
      protocolRegex = /\w*(\-\w*)*:/

      attributePrefix = (attribute)=>
        for element in $('['+attribute+']')
          element = $(element)
          # If it doesn't start with e.g. https://
          if not (element.attr(attribute).search(protocolRegex) is 0)
            # Then we prefix the URL
            element.attr( attribute, @templateUrl + element.attr(attribute) )

      attributePrefix('href')
      attributePrefix('src')

      html = $.html()

      # Now we just need to embed all the external stylesheets,
      # images and other resources into the HTML file so it's stand
      # alone, can be saved as a single file and viewed offline and.
      # Easy peasy thanks to Inliner!
      new Inliner html, (error, html)=>
        if error? then @captureJob.reject error

        # Overwrite it again, now it's final
        fs.writeFile outputPath, html, (error)=>
          if error
            @captureJob.reject error
          else
            # Update the meta data with the final output path and
            # options passed to this render call.
            job.outputPath = outputPath
            meta = _.extend {}, meta, job
            @trigger 'page:capture:done', meta
            @captureJob.resolve meta

  onResourceRequested: ( request ) =>
    if not @loadingResources?
      # Prepare to keep track of all currently loading resources
      @loadingResources = []
      @trigger 'page:resources:loading'

    if @loadingResources.indexOf(request.id) is -1
      @loadingResources.push(request.id)
      clearTimeout(@timers.resourcesLoaded)

    # To prevent the output being spammed full of resource log events we allow supressing it
    @trigger 'page:resource:requested', request if @options.logging?.pageResources

  onResourceReceived: ( resource ) =>
    return if resource.stage isnt "end" and not resource.redirectURL?
    # If it already got received earlier
    return if (i = @loadingResources.indexOf resource.id) is -1

    @loadingResources.splice(i, 1)

    # To prevent the output being spammed full of resource log events we allow supressing it
    @trigger 'page:resource:received', resource if @options.logging?.pageResources

    if @loadingResources.length is 0
      # We're done loading all resources. Set a new timer to wait if any new
      # resource requests start. If it runs out we take that as a no and that
      # the page has finished loading and the template has has enough time to
      # initialize. The template can trigger 'template:init' to cancel these
      # assumptions and take as long as it needs untill it triggers
      # 'template:loaded' to signal Nota can proceed.
      clearTimeout(@timers.resourcesLoaded)
      @timers.resourcesLoaded = setTimeout @onResourcesLoaded, @options.template.timeouts.resourcesLoaded

  onResourcesLoaded: =>
    @trigger 'page:resources:loaded'

  onClientError: (errorMsg)=>
    @logging.logClientError? errorMsg

    # An error from the template ... doesn't look good. Give it some time, but
    # it might have crashed. So after a timeout we abort any job in progress.
    if @options.template.timeouts.errorAbort?
      abortWithMessage = ( )=>
        @abortAll "Aborting #{@currentPhase()} due to template error. " + errorMsg
      abortAfter = @options.template.timeouts.errorAbort
      @timers.errorAbort = setTimeout abortWithMessage, abortAfter

      # On any sign of progress from the client or template, cancel the
      # timeout, because the job might continue after all. Only forgive so
      # once (untill the next error).
      @once 'client:', => clearTimeout(@timers.errorAbort)
      @once 'template:', => clearTimeout(@timers.errorAbort)

  abortAll: (reason)->
    switch @currentPhase()
      when 'init' then @abortInit(reason)
      when 'render' then @abortRenderJob(reason)
      when 'capture' then @abortCaptureJob(reason)

  abortInit: (reason)->
    clearTimeout(@timers.resourcesLoaded)
    clearTimeout(@timers.templateInitSlow)
    clearTimeout(@timers.templateInitDead)
    @trigger 'page:init:abort', reason
    @init.reject(reason)

  abortRenderJob: (reason)->
    if @renderJob?
      clearTimeout(@timers.templateRenderSlow)
      clearTimeout(@timers.templateRenderDead)
      @trigger 'template:render:abort', reason
      @renderJob.reject(reason)

  abortCaptureJob: (reason)->
    if @captureJob?
      @trigger 'page:capture:abort', reason
      @captureJob.reject(reason)

  onCallback: ( msg )=>
    if msg.substring(0,4) is "req:" then @onRequest msg.substring(4)
    else @trigger msg

  onRequest: (req)=>
    if req is 'build-target'
      # TODO: FIXME: https://github.com/sgentle/phantomjs-node/issues/292
      @options.template.buildTarget

  isReady: ->
    # We're ready if initialization has completed and either no job is
    # running, or if one has ran before, it has already completed.
    @init.isResolved() and
    ( not @renderJob? or @renderJob.isResolved() )
    ( not @captureJob? or @captureJob.isResolved() )

  renderData: (data)->
    # This promise is longer lasting than just the injection of the data. It
    # waits for resolving by the template or a timer that should give the
    # template enough time to render.
    @renderJob = Q.defer()
    inject = (data)->
      # Try and inject data if Nota client is present (i.e. template loaded it)
      Nota?.injectData(data)
    @page.evaluate inject, null, data
    # Create a new promise which can be tracked for progress of the template
    # on rendering this data.
    @renderJob.promise

  setState: (event)->
    if @pagePhases.indexOf(event) > @pagePhases.indexOf(@state)
      @state = event

  currentPhase: ->
    if @init.promise.isPending()        then return 'init'
    if @renderJob?.promise.isPending()  then return 'render'
    if @captureJob?.promise.isPending() then return 'capture'

  # Postcondition: promises to resolve after the document has reached the
  # given state or if the document has already reached the given state.
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

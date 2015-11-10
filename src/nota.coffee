Path            = require('path')
Q               = require('q')
fs              = require('fs')
_               = require('underscore')

module.exports = class Nota
  # Bind in some of the subclasses that compose Nota
  @Server:            require( Path.join __dirname, 'server' )
  @Document:          require( Path.join __dirname, 'document' )
  @Webrender:         require( Path.join __dirname, 'webrender_server' )
  @JobQueue:          require( Path.join __dirname, 'queue' )
  @TemplateHelper:    require( Path.join __dirname, 'template_helper' )
  @LoggingChannels:   require( Path.join __dirname, 'logging' )

  # Load the (default) configuration
  @defaults:          require( Path.join __dirname, '../config-default.json' )

  # Load the package definition so we may know ourselves (version etc.)
  @meta:              require( Path.join __dirname, '../package.json' )

  constructor: ( @options, @logging )->
    # Allow for overriding of default settings
    if not @options? then @options = @defaults

    # Allow redirecting of logging output to channels through dependency injection
    if not @logging? then @logging = require('./logging')(@options)

    @helper = new Nota.TemplateHelper( @logging )

    # The webserver will respond with the template webpage to whoever come who
    # may (perhaps a developer looking for a preview of the template, perhaps
    # a phantom looking to capture it as a PDF).
    @server = new Nota.Server( @options, @logging )

  start: (apis, @template)->
    # The APIs hash determines which parts of the Nota API needs to be
    # exposed, and hence which modules need to be started. We always start the
    # server and provide serving of the template and it's data.
    apis = _.extend { server: true }, apis

    if apis.webrender
      # If we also want the webrender service, then we also inject the
      # webrenderer middelware into the server so it can intercept webrender
      # REST API calls and server the webrender interface. After that we're
      # ready to start it up.
      @webrender = new Nota.Webrender( @queue, @options, @logging )
      @server.use @webrender

    if @template? then @setTemplate @template
    @server.start()

  # Postcondition: if a template was loaded, it has been closed, and it's
  # ensured that with the next job the correct template will open.
  setTemplate: (template)->
    if not template?.path? then throw new Error "No template path provided."

    @server.setTemplate template

    if @webrender?
      @webrender.setTemplate template

    if @document? and (@document.options.template.path isnt template.path)
      @document.close()
      delete @document

  # Postcondition: a document with the current template has been loaded
  openDocument: ->
    deferred = Q.defer()

    if not @document?
      @document = new Nota.Document(@server.url(), @logging, @options)
      @document.on 'all', @logging.logEvent, @logging
      @document.after('page:ready').then ->
        deferred.resolve()
    else
      deferred.resolve()

    deferred.promise

  setData: (data)->
    @server.setData data
    @document?.injectData data

  # Call with either a JobQueue instance or
  # with (jobs , template) where
  #
  #   jobs = [{
  #       dataPath:   dataPath
  #       data:       obj (alternatively)
  #       outputPath: outputPath
  #       preserve:   true | false
  #     }]
  #
  #   template = {
  #     path: <path to template dir>
  #    }
  queue: ( ) =>
    deferred = Q.defer()

    try
      # Extract or construct the job queue from the call
      @jobQueue = @parseQueueArgs(arguments, deferred)
    catch err
      deferred.reject err

    # Ensure the document is loaded and ready
    @setTemplate(@jobQueue.template, true)

    # Start rendering
    switch @jobQueue.template.type
      when 'static'   then @renderStatic(@jobQueue)
      when 'scripted' then @renderScripted(@jobQueue)

    deferred.promise

  # Parses the arguments of the queue call. Which could be either a single
  # queue argument, and array of jobs with and options hash, or a single job
  # object with an options hash.
  parseQueueArgs: (args, deferred)->
    templateRequiredError = new Error "No template loaded yet. Please provide a template with the
      initial job queue call. Subsequent jobs on the same template can omit the template
      specification."

    if args[0] instanceof Nota.JobQueue
      jobQueue = args[0]

      if not jobQueue.length > 0
        throw new Error "Empty job queue provided"

      if not jobQueue.template.path? and not @document?.options.template.path
        throw templateRequiredError

    else
      if args[0] instanceof Array
        jobs  = args[0]
      else if args[0] instanceof Object and ( args[0].data? or args[0].dataPath? )
        jobs  = [ args[0] ] # Create new jobs array of the provided job object

      template = args[1] or {}

      if not @document?.options.template.path and not template.path?
        throw templateRequiredError

      template.type = @helper.getTemplateType template.path

      jobQueue = new Nota.JobQueue(jobs, template, deferred)

  renderStatic: (queue)->
    # Dequeue the next job
    job = queue.nextJob()
    start = new Date()

    @openDocument()
    .then => @document.capture(job)
    .then (meta)=>
      finished = new Date()
      meta.duration = finished-start

      # Mark this one as completed.
      queue.jobCompleted(meta)

      # Recursively continue rendering what's left of the job queue untill
      # it's empty, then we're finished.
      unless queue.isFinished() then @renderStatic queue
    .fail @logging.logError

  renderScripted: (queue)->
    if (inProgressJobs = queue.inProgress())
      @logging.logWarning? """
      Attempting to render while already occupied with jobs:

      #{inProgressJobs}

      Rejecting this render call.

      For multithreaded rendering of a queue please create another server
      instance (don't forget to provide it with an unoccupied port).
      """
      return

    # Dequeue the next job
    job = queue.nextJob()
    start = new Date()

    renderJob = (job)=>
      deferred = Q.defer()

      @document.after('page:rendered')
      .then =>
        @document.capture(job)
      .then (meta)->
        deferred.resolve meta
      .fail @logging.logError

      @document.once 'error-timeout', (err)->
        meta = _.extend {}, job, { fail: err }
        deferred.reject meta

      deferred.promise

    postRender = (meta)=>
      finished = new Date()
      meta.duration = (finished - start)

      if meta.fail?
        queue.jobFailed     job, meta
      else
        queue.jobCompleted  job, meta

      @logging.log? "Job duration: #{(meta.duration / 1000).toFixed(2)} seconds"
      @logging.log? "Output path: #{Path.resolve meta.outputPath}"

      # Recursively continue rendering what's left of the job queue untill
      # it's empty, then we're finished.
      unless queue.isFinished() then @renderScripted queue

    error = (err)=>
      @logging.logError err

    # First we need to set the data, and then open the template. This is to
    # avoid a race condition that we get when opening the template when
    # setting the template. In that case the template might have opened and
    # started requesting the data before the job data has been set. Then it'll
    # either receive no data, or possibly the example data of a template.
    @setData(job.data or job.dataPath)

    # Call the promise and wait for it to finish, then do some post-render
    # administration of render meta data and see if we're done or can continue
    # with the rest of the job queue.
    @openDocument()
    .then -> renderJob(job)
    .then postRender
    .fail error



Path            = require('path')
Q               = require('q')

module.exports = class Nota
  # Bind in some of the subclasses that compose Nota
  @Server:            require( Path.join __dirname, 'server' )
  @Webrender:         require( Path.join __dirname, 'webrender_server' )
  @JobQueue:          require( Path.join __dirname, 'queue' )
  @TemplateHelper:    require( Path.join __dirname, 'template_helper' )
  @LoggingChannels:   require( Path.join __dirname, 'logging' )

  # Load the (default) configuration
  @defaults:          require( Path.join __dirname, '../config-default.json' )

  # Load the package definition so we may know ourselves (version etc.)
  @meta:              require( Path.join __dirname, '../package.json' )

  constructor: ( @options, @logging )->

    if not @options? then throw new Error "Server requires an Nota options
    hash. See `/config-default.json` and the NotaCLI parseOptions function."

    # Allow redirecting of logging output to channels through dependency injection
    if not @logging? then @logging = require('./logging')(@options)


  start: ->
    deferred = Q.defer()

    # The webserver will respond with the template webpage to whoever come who
    # may (perhaps a developer looking for a preview of the template, perhaps
    # a phantom looking to capture it as a PDF).
    @server = new Server( @options, @logging )

    # If we also want the webrender service, then we also inject up the
    # webrenderer middelware into the server so it can intercept webrender
    # REST API calls and server the webrender interface. After that we're
    # ready to start it up.
    if @options.listen
      @webrender = new Webrender( @server.app, @options, @logging )
      @webrender.start()

    # Time to fire her up.
    @server.start()

    # First phase complete. Let's see if we also need to start a
    # Nota.Document, which is basically a wrapper of a Phantom instance.
    if @options.preview
      deferred.resolve()
    else
      @document = new Nota.Document(@, @options.document)
      @document.on 'all', @logging.logEvent
      @document.once 'page:ready', =>
        deferred.resolve()

    deferred.promise

  # Call with either a JobQueue instance or
  # with (jobs , options) where
  #
  #   jobs = [{
  #       dataPath:   dataPath
  #       data:       obj (alternatively)
  #       outputPath: outputPath
  #       preserve:   true | false
  #     }]
  #
  #   options = {
  #     deferFinish:  deferred
  #     templateType: 'static' | 'scripted'
  #   }
  queue: ( ) ->
    deferred = Q.defer()

    @jobQueue = @parseQueueArgs(arguments, deferred)

    switch @jobQueue.options.templateType
      when 'static'   then @after 'page:rendered', => @renderStatic(@jobQueue)
      when 'scripted' then @after 'page:ready', =>  @renderScripted(@jobQueue)

    deferred.promise

  # Parses the arguments of the queue call. Which could be either a single
  # queue argument, and array of jobs with and options hash, or a single job
  # object with an options hash.
  parseQueueArgs: (args, deferred)->
    if args[0] instanceof JobQueue
      jobQueue = args[0]
    else

      if args[0] instanceof Array
        jobs  = args[0]
      else if args[0] instanceof Object and ( args[0].data? or args[0].dataPath? )
        jobs  = [ args[0] ] # Create new jobs array of the provided job object

      options = args[1] or {}

      _.extend options, {
        deferFinish:  deferred
        templateType: @document.options.templateType
      }

      _.extend options.document, templateType: @helper.getTemplateType(@templatePath)

      jobQueue = new Nota.JobQueue(jobs, options)

  renderStatic: (queue)->
    # Dequeue the next job
    job = queue.nextJob()
    start = new Date()

    @document.capture(job).then (meta)=>
      finished = new Date()
      meta.duration = finished-start

      # Mark this one as completed.
      queue.jobCompleted(meta)

      # Recursively continue rendering what's left of the job queue untill
      # it's empty, then we're finished.
      unless queue.isFinished() then @renderStatic queue

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

    @document.on 'error-timeout', (err)->
      meta = _.extend {}, job, { fail: err }
      postRender meta

    offerData = (job)=>
      deferred = Q.defer()

      data = job.data or JSON.parse fs.readFileSync(job.dataPath, encoding: 'utf8')
      @document.injectData(data).then -> deferred.resolve job

      deferred.promise

    renderJob = (job)=>
      deferred = Q.defer()

      @after 'page:rendered', => @document.capture job
      @document.once 'render:done', deferred.resolve

      deferred.promise

    postRender = (meta)=>
      finished = new Date()
      meta.duration = finished-start

      if meta.fail?
        queue.jobFailed     job, meta
      else
        queue.jobCompleted  job, meta

      @logging.log? "Job duration: #{(meta.duration / 1000).toFixed(2)} seconds"

      # Recursively continue rendering what's left of the job queue untill
      # it's empty, then we're finished.
      unless queue.isFinished() then @renderScripted queue

    error = (err)->
      @logging.logError err


    # Call the promise and wait for it to finish, then do some post-render
    # administration of render meta data and see if we're done or can continue
    # with the rest of the job queue.
    if job.dataPath? or job.data?
      offerData(job)
      .then renderJob
      .then postRender
      .catch error
    else
      renderJob(job)
      .then postRender
      .catch error

  after: (event, callback, context)->
    if @document.state is event then callback.apply(context or @)
    else @document.once event, callback, context

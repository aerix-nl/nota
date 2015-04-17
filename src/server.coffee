_             = require('underscore')._
_.str         = require('underscore.string')
http          = require('http')
express       = require('express')
phantom       = require('phantom')
fs            = require('fs')
Q             = require('q')
open          = require("open")
Backbone      = require('backbone')

Document      = require('./document')
TemplateUtils = require('./template_utils')
JobQueue      = require('./queue')

module.exports = class NotaServer

  constructor: ( @options, logging ) ->
    _.extend(@, Backbone.Events)
    @helper = new TemplateUtils()
    { @logEvent, @logError, @logWarning } = logging
    { @serverAddress, @serverPort, @templatePath, @dataPath } = @options
    _.extend @options.document, templateType: @helper.getTemplateType(@templatePath)

  start: ->
    @trigger "server:init"

    # Start express server to serve dependencies from a unified namespaces
    @app = express()
    @server = http.createServer(@app)

    # Open the server with servering the template path as root
    @app.use express.static(@templatePath)

    # TODO: Why does this line not work instead:
    # @app.get '/', express.static("#{@templatePath}/template.html")

    # Serve 'template.html' by default (instead of index.html default behaviour)
    @app.get '/',         (req, res)-> res.redirect("/template.html")
    # Expose some extras at the first specified subpaths
    @app.use '/lib/',     express.static("#{__dirname}/")
    @app.use '/vendor/',  express.static("#{__dirname}/../bower_components/")
    @app.use '/nota.js',  express.static("#{__dirname}/client.js")

    @app.get '/data', ( req, res ) =>
      res.send fs.readFileSync(@dataPath, encoding: 'utf8')

    @server.listen(@serverPort)
    @trigger "server:running"

    return @ if @options.preview
    @document = new Document(@, @options.document)

  url: =>
    "http://#{@serverAddress}:#{@serverPort}/"

  serve: ( @dataPath )->

  queue: ( jobs, options ) ->
    @queue = new JobQueue(jobs, options)
    switch @queue.options.type
      when 'static'
        @document.once "page:rendered", =>
          @renderStatic(@queue)
      when 'scripted'
        # Wait till the page finished opening
        @document.once 'page:opened', =>
          @renderScripted(@queue)
          
  renderStatic: (queue)->
    while job = queue.nextJob()
      do (job) =>
        @document.capture job
        @document.once 'render:done', queue.completeJob, queue

  renderScripted: (queue)->
    # Dequeue the next job
    currentJob = queue.nextJob()

    queueJob = (job)=>
      deferred = Q.defer()
      # If we're in an N+1 iteration and the template has already loaded
      if @document.state is 'client:template:loaded'
        deferred.resolve job
      else
        # Else we way for that
        @document.once 'client:template:loaded', =>
          deferred.resolve job
        # Or unless the template doesn't decide to use our API, just wait till
        # the page has loaded and the timeout fired. Assume that enough time
        # for the template to get it's stuff in order.
        @document.once 'page:loaded', =>
          deferred.resolve job
      deferred.promise

    offerData = (job)=>
      deferred = Q.defer()

      # TODO: kinda indecisive about whether to inject data or set the data
      # here and "notify" the template to get the new data. The latter is
      # more HTTP-ish, but way more convoluted/complex than injecting it. So
      # for now we'll just use that, and set the data as well, in case you
      # want to monitor the job rendering progress with your browser. By
      # refreshing the page you can get the data of the current job being
      # rendered in your browser.
      # @serve job.dataPath
      data = JSON.parse fs.readFileSync(job.dataPath, encoding: 'utf8')

      if @document.state is 'client:template:loaded'
        @document.injectData data
        deferred.resolve job

      else
        @document.once 'client:template:loaded', =>
          @document.injectData data
          deferred.resolve job

        @document.once 'page:loaded', =>
          if @document.state is 'page:loaded'
            deferred.resolve job
          else if @document.state is 'client:init'
            deferred.reject 'client-loading'
          else if @document.state is 'client:loaded'
            deferred.reject 'template-unregistered'
          else if @document.state is 'client:template:init'
            deferred.reject 'template-loading'
      deferred.promise

    # Define render job as a promise
    renderJob = (job)=>
      deferred = Q.defer()
      @document.once 'page:rendered', => @document.capture job
      @document.once 'render:done', deferred.resolve
      deferred.promise

    postRender = (meta)=>
      queue.completeJob(meta)
      # Recursively continue rendering what's left of the job queue untill
      # it's empty, then we're finished.
      unless queue.isFinished() then @renderScripted queue

    error = (err)->
      @logError "Page loaded but still in state: #{clst} (if it's a loading
          state, consider increasing the timeout in default-config.json)"

    # Call the promise and wait for it to finish, then do some post-render
    # administration of render meta data and see if we're done or can continue
    # with the rest of the job queue.
    if currentJob.dataPath?
      queueJob(currentJob)
      .then offerData
      .then renderJob
      .then postRender
      .catch error
    else
      queueJob(currentJob)
      .then renderJob
      .then postRender
      .catch error

  close: ->
    @trigger 'server:closing'
    @document.close()
    @server.close()
    process.exit()


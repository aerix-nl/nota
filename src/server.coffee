_             = require('underscore')._
s             = require('underscore.string')
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
    { @log, @logEvent, @logError, @logWarning } = logging
    { @serverAddress, @serverPort, @templatePath, @dataPath } = @options

    @helper = new TemplateUtils(@logWarning)
    _.extend @options.document, templateType: @helper.getTemplateType(@templatePath)


  start: ->
    @on 'all', @logEvent, @
    @trigger "server:init"

    # Start express server to serve dependencies from a unified namespaces
    @app = express()
    @server = http.createServer(@app)

    # Open the server with servering the template path as root
    @app.use express.static(@templatePath)

    # Serve 'template.html' by default (instead of index.html default behaviour)
    # TODO: Why does this line not work instead:
    # @app.get '/', express.static("#{@templatePath}/template.html")
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
    @document.on 'all', @logEvent

  url: =>
    "http://#{@serverAddress}:#{@serverPort}/"

  serve: ( @dataPath )->

  # Call with either a JobQueue instance or
  # with (jobs , options) where
  #
  #   jobs = [
  #     {
  #       dataPath:   options.dataPath
  #       outputPath: options.outputPath
  #       preserve:   options.preserve
  #     }]
  #
  #   options = {
  #     callback: ->
  #   }
  queue: ( ) ->
    deferred = Q.defer()

    if arguments[0] instanceof JobQueue
      @queue = arguments[0]
    else
      jobs    = arguments[0]
      options = arguments[1] or {}
      _.extend options, {
        deferFinish: deferred
        templateType: @document.options.templateType
      }
      @queue = new JobQueue(jobs, options)

    switch @queue.options.templateType
      when 'static'   then @document.once 'page:rendered', => @renderStatic(@queue)
      when 'scripted' then @document.once 'page:ready', =>  @renderScripted(@queue)

    deferred.promise
          
  renderStatic: (queue)->
    # Dequeue the next job
    job = queue.nextJob()
    start = new Date()

    @document.capture(job).then (meta)=>
      finished = new Date()
      meta.duration = finished-start

      # Mark this one as completed.
      queue.completeJob(meta)

      # Recursively continue rendering what's left of the job queue untill
      # it's empty, then we're finished.
      unless queue.isFinished() then @renderStatic queue

  renderScripted: (queue)->
    # Dequeue the next job
    job = queue.nextJob()
    start = new Date()

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
      @document.injectData(data).then -> deferred.resolve job

      deferred.promise

    # Define render job as a promise
    renderJob = (job)=>
      deferred = Q.defer()

      if @document.state is 'page:rendered' then @document.capture job
      else @document.once 'page:rendered', => @document.capture job
      @document.once 'render:done', deferred.resolve

      deferred.promise

    postRender = (meta)=>
      finished = new Date()
      meta.duration = finished-start

      queue.completeJob(meta)
      @log? "Job duration: #{(meta.duration / 1000).toFixed(2)} seconds"

      # Recursively continue rendering what's left of the job queue untill
      # it's empty, then we're finished.
      unless queue.isFinished() then @renderScripted queue

    error = (err)->
      @logError err

    # Call the promise and wait for it to finish, then do some post-render
    # administration of render meta data and see if we're done or can continue
    # with the rest of the job queue.
    if job.dataPath?
      offerData(job)
      .then renderJob
      .then postRender
      .catch error
    else
      renderJob(job)
      .then postRender
      .catch error

  close: ->
    @trigger 'server:closing'
    @document.close()
    @server.close()
    @server.off 'all', @logEvent, @


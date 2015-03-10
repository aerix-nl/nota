_        = require('underscore')._
_.str    = require('underscore.string')
http     = require('http')
express  = require('express')
phantom  = require('phantom')
fs       = require('fs')
open     = require("open")
Backbone = require('backbone')

Document = require('./document')

class NotaServer

  constructor: ( @options ) ->
    _.extend(@, Backbone.Events)
    { @serverAddress, @serverPort, @templatePath, @data } = @options

  start: ->
    @trigger "server:init"

    # Start express server to serve dependencies from a unified namespaces
    @app = express()
    @server = http.createServer(@app)

    # Open the server with servering the template path as root
    @app.use express.static(@templatePath)

    # Expose some extras at the first specified subpaths
    # Serve 'template.html' by default (instead of index.html default behaviour)
    @app.get '/',        express.static("#{@templatePath}/template.html")
    @app.use '/lib/',    express.static("#{__dirname}/")
    @app.use '/vendor/', express.static("#{__dirname}/../bower_components/")
    @app.use '/nota.js', express.static("#{__dirname}/client.js")

    @app.get '/data', ( req, res ) =>
      res.send JSON.stringify(@data)

    @server.listen(@serverPort)
    @trigger "server:running"

    return @ if @options.preview
    @document = new Document(@, @options.document)

  url: =>
    "http://#{@serverAddress}:#{@serverPort}/"

  serve: ( data ) ->
    @data = data

  render: ( jobs, options ) ->
    # TODO: use q here, because code kinda marches faster to the right than down
    rendered = 0
    for job in jobs
      do (job, options) =>
        # TODO: kinda indecisive about whether to inject data or set the data
        # here and "notify" the template to get the new data. The latter is
        # more HTTP-ish, but way more convoluted/complex than injecting it. So
        # for now we'll just use that, and set the data as well, in case you
        # want to monitor the job rendering progress with your browser. By
        # refreshing the page you can get the data of the current job being
        # rendered in your browser.
        @data = job.data
        @document.injectData(job.data)
        @document.once "page:ready", =>
          options.outputPath = job.outputPath
          @document.capture options

    @document.on 'render:done', ->
      rendered += 1
      if rendered is jobs.length
        options.callback()

  close: ->
    @trigger 'server:closing'
    @document.close()
    @server.close()
    process.exit()

module.exports = NotaServer


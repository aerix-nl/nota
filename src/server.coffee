_               = require('underscore')._
s               = require('underscore.string')
chalk           = require('chalk')
http            = require('http')
Express         = require('express')
phantom         = require('phantom')
fs              = require('fs')
Q               = require('q')
Path            = require('path')
open            = require("open")
Backbone        = require('backbone')

Document        = require('./document')
TemplateHelper  = require('./template_helper')
JobQueue        = require('./queue')

module.exports  = class NotaServer

  constructor: ( @options, @logging ) ->

    if not @options? then throw new Error "Server requires an Nota options
    hash. See `/config-default.json` and the NotaCLI parseOptions function."

    # Allow redirecting of logging output to channels through dependency injection
    if not @logging? then @logging = require('./logging')(@options)

    _.extend(@, Backbone.Events)

    { @serverAddress, @serverPort, @templatePath, @dataPath } = @options

    @helper = new Nota.TemplateHelper(@logWarning)

    @on 'all', @logEvent, @

    @app = Express()

  start: ->
    @trigger "server:init"

    # Open the server with servering the template path as root
    @app.use Express.static(@templatePath)

    # Serve 'template.html' by default (instead of index.html default behaviour)
    # TODO: Why does this line not work instead:
    # @app.get '/', express.static("#{@templatePath}/template.html")
    @app.get '/',         (req, res)-> res.redirect("/template.html")
    # Expose some extras at the first specified subpaths
    @app.use '/lib/',     Express.static("#{__dirname}/")
    @app.use '/assets/',  Express.static("#{__dirname}/../assets/")
    @app.use '/vendor/',  Express.static("#{__dirname}/../bower_components/")
    @app.use '/nota.js',  Express.static("#{__dirname}/client.js")

    @app.get '/data', ( req, res ) =>
      res.setHeader 'Content-Type', 'application/json'
      res.send fs.readFileSync(@dataPath, encoding: 'utf8')

    @app.listen @serverPort

    @trigger "server:running"

  url: =>
    "http://#{@serverAddress}:#{@serverPort}/"

  close: ->
    @trigger 'server:closing'
    @document.close()
    @server.close()
    @server.off 'all', @logEvent, @


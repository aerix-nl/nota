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

TemplateHelper  = require('./template_helper')

module.exports  = class NotaServer

  constructor: ( @options, @logging ) ->

    if not @options? then throw new Error "Server requires an Nota options
    hash. See `/config-default.json` and the NotaCLI parseOptions function."

    _.extend(@, Backbone.Events)

    { @serverAddress, @serverPort } = @options

    @helper = new TemplateHelper(@logging)

    @on 'all', @logging.logEvent, @logging

    @app = Express()

    # Nota middlewares. Similar to Express middlewares, but more high level
    # and with different conventions and API's. Kind of like plugins.
    @middlewares = []

  start: ->
    @trigger "server:init"

    # Serve 'template.html' by default (instead of index.html default behaviour)
    # TODO: Why does this line not work instead:
    # @app.get '/', express.static("#{@template.path}/template.html")
    @app.get '/',         (req, res)-> res.redirect("/template.html")
    # Expose some extras at the first specified subpaths
    @app.use '/nota/lib/',     Express.static("#{__dirname}/")
    @app.use '/nota/assets/',  Express.static("#{__dirname}/../assets/")
    @app.use '/nota/vendor/',  Express.static("#{__dirname}/../bower_components/")

    @app.listen @serverPort

    middleware.start() for middleware in @middlewares

    @trigger "server:running"

  use: (middleware)->
    middleware.bind(@app)
    @middlewares.push middleware

  setTemplate: (@template)->
    # Open the server with servering the template path as root
    @app.use Express.static(@template.path)

  setData: (@dataPath)->
    @app.get '/nota/data', ( req, res ) =>
      res.setHeader 'Content-Type', 'application/json'
      res.send fs.readFileSync(@dataPath, encoding: 'utf8')

  url: =>
    "http://#{@serverAddress}:#{@serverPort}/"

  close: ->
    @trigger 'server:closing'
    @server.close()
    @server.off 'all', @logging.logEvent, @


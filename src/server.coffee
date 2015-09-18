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

    @app.get '/nota/data', @serveData

    @app.listen @serverPort

    middleware.start() for middleware in @middlewares

    @trigger "server:running"

  use: (middleware)->
    middleware.bind(@app)
    @middlewares.push middleware

  setTemplate: (@template)->
    # Open the server with servering the template path as root
    @app.use Express.static(@template.path)

  setData: (data)->
    unless (typeof data is 'object' or typeof data is 'string')
      throw new Error "Set data with either a string path to the data file or JSON object"

    if typeof @currentData is 'string'
      if not @helper.isFile(@currentData)
        throw new Error "Provided data path doesn't exist. Please provide a path to a data file."
      else

        try
          _data = JSON.parse fs.readFileSync(@currentData, encoding: 'utf8')
        catch e
          throw new Error chalk.gray("Error parsing data file #{@currentData} :") + e

        if _.keys(_data).length is 0 or _data.length is 0
          throw new Error "Provided data file is empty"

    @currentData = data

  getData: ->
    if not @currentData?
      throw new Error 'Currently no data set on server'

    if typeof @currentData is 'string' and @helper.isData @currentData
      JSON.parse fs.readFileSync(@currentData, encoding: 'utf8')

    else if typeof @currentData is 'object'
      @currentData

    else
      throw new Error "Please set the data on server with either a JSON data object or a path
      that resolves to a data file"

  serveData: ( req, res ) =>
    try
      data = @getData()
    catch e
      res.status(500).send e

    console.log 'blah', data.blah

    res.setHeader 'Content-Type', 'application/json'
    # {null, 2} is for newlines and indentation of 2 spaces: beautify output format
    res.send JSON.stringify data, null, 2

  url: =>
    "http://#{@serverAddress}:#{@serverPort}/"

  close: ->
    @trigger 'server:closing'
    @server.close()
    @server.off 'all', @logging.logEvent, @


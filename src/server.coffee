_       = require('underscore')._
_.str   = require('underscore.string')
http    = require('http')
express = require('express')
phantom = require('phantom')
fs      = require('fs')
open    = require("open")
Page    = require('./page')

class NotaServer
  constructor: ( templatePath, dataPath, outputPath, serverAddress, serverPort ) ->

    # Start express server to serve dependencies from a unified namespaces
    @app = express()
    @server = http.createServer(@app)

    # Open the server with servering the template path as root
    @app.use express.static(templatePath)
    # Serve 'template.html' by default (instead of index.html default behaviour)
    @app.get '/', (req, res)-> res.redirect('/template.html')
    # Expose some extras at the first specified subpaths
    @app.use '/lib/', express.static("#{__dirname}/")
    @app.use '/vendor/', express.static("#{__dirname}/../bower_components/")
    @app.use '/data.json', express.static(dataPath)

    @server.listen(serverPort)

    data = JSON.parse(fs.readFileSync(dataPath, encoding: 'utf8'))
    pageConfig =
      serverAddress: serverAddress
      serverPort:    serverPort
      outputPath:    outputPath
      initData:      data

    @page = new Page(pageConfig)
    @page.on 'ready',        => @page.capture()
    @page.on 'capture:done',    @captured, @
    @page.on 'fail',            @close,    @
    @page.onAny                 @logPage,  @

  logPage: ->
    if _.str.startsWith 'client:' then console.log @event
    else console.log "page:#{@event}"

  captured: (meta) ->
    console.log "Output written: #{meta.filesystemName}"
    process.exit()
    # TODO: why u no work @close()?
    @close()

  close: ->
    console.log 44
    @page.close()
    @server.close()
    process.exit()

  @isFile: ( path ) ->
    fs.existsSync(path) and fs.statSync(path).isFile()

  @isDirectory: ( path ) ->
    fs.existsSync(path) and fs.statSync(path).isDirectory()

  @isData: ( path ) ->
    NotaServer.isFile(path)

  @isTemplate: ( path ) ->
    NotaServer.isDirectory(path)

module.exports = NotaServer


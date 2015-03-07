_        = require('underscore')._
_.str    = require('underscore.string')
http     = require('http')
express  = require('express')
phantom  = require('phantom')
fs       = require('fs')
open     = require("open")

Document = require('./document')

class NotaServer

  constructor: ( @options ) ->
    { @serverAddress, @serverPort, @templatePath, @data } = @options

    # Start express server to serve dependencies from a unified namespaces
    @app = express()
    @server = http.createServer(@app)

    # Open the server with servering the template path as root
    @app.use express.static(@templatePath)
    # Serve 'template.html' by default (instead of index.html default behaviour)
    @app.get '/', ( req, res ) =>
      # Load template.html as index
      fs.readFile "#{@templatePath}/template.html", "utf8", ( err, html ) ->
        # Do a little check for malfolmed HTML
        insertionRegex = /(<head[s\S]*>)([\s\S]*<\/head>)/
        unless html.match(insertionRegex)?.length = 3
          throw new Error "No encapsulating <head></head> tags found in template"

        # Insert the Nota client loader in the head tag
        scriptTag = "<script data-main='nota' src='vendor/requirejs/require.js'></script>"
        res.send html.replace(insertionRegex, "$1\n\t#{scriptTag}$2")

    # Expose some extras at the first specified subpaths
    @app.use '/lib/',    express.static("#{__dirname}/")
    @app.use '/vendor/', express.static("#{__dirname}/../bower_components/")
    @app.use '/nota.js', express.static("#{__dirname}/client-config.js")

    @app.get '/data', ( req, res ) =>
      res.send JSON.stringify(@data)

    @server.listen(@serverPort)

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
        @document.injectData(job.data)
        @document.once "page:ready", =>
          options.outputPath = job.outputPath
          @document.capture options

    @document.on 'render:done', ->
      rendered = rendered + 1
      if rendered is jobs.length
        options.callback()

  close: ->
    @document.close()
    @server.close()
    process.exit()

module.exports = NotaServer


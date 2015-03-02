_        = require('underscore')._
_.str    = require('underscore.string')
http     = require('http')
express  = require('express')
phantom  = require('phantom')
fs       = require('fs')
open     = require("open")

Document = require('./document')

class NotaServer
  constructor: ( defaults, @templatePath, @data ) ->
    { @serverAddress, @serverPort } = defaults
    
    # Start express server to serve dependencies from a unified namespaces
    @app = express()
    @server = http.createServer(@app)

    # Open the server with servering the template path as root
    @app.use express.static(templatePath)
    # Serve 'template.html' by default (instead of index.html default behaviour)
    @app.get '/', ( req, res ) =>
      # Load template.html as index
      fs.readFile "#{@templatePath}/template.html", "utf8", ( err, html ) ->
        # Insert the nota loader in the head tag
        scriptTag = "<script data-main='nota' src='vendor/requirejs/require.js'>"
        res.send html.replace(/(<head[s\S]*>)([\s\S]*<\/head>)/, "$1\n#{scriptTag}</script>$2")

    # Expose some extras at the first specified subpaths
    @app.use '/lib/', express.static("#{__dirname}/")
    @app.use '/vendor/', express.static("#{__dirname}/../bower_components/")
    @app.use '/nota.js', express.static("#{__dirname}/client-config.js")

    @app.get '/data', ( req, res ) =>
      res.send JSON.stringify(@data)

    @server.listen(@serverPort)

    @document = new Document(@, defaults.document)

  url: =>
    "http://#{@serverAddress}:#{@serverPort}/"

  serve: ( data ) ->
    @data = data

  render: ( outputPath, callback, data ) ->
    @serve(data) if data?
    @document.render(outputPath, callback)

  close: ->
    @document.close()
    @server.close()
    process.exit()

module.exports = NotaServer


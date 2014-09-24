_       = require('underscore')._
http    = require('http')
express = require('express')
phantom = require('phantom')
fs      = require('fs')
argv    = require('optimist').argv
Page    = require('./page')

class Nota

  serverAddress: 'localhost'
  serverPort: 7483

  constructor: ( argv ) ->
    dataPath = argv.data
    templatePath = argv.template

    # Exit unless the --template or --list arguments are passed
    unless (argv.template? and argv.data?) or argv.list?
      throw new Error("Please provide a template and data.")

    # Check if the data and template path exist
    unless fs.existsSync(templatePath) and fs.statSync(templatePath).isDirectory()
      throw Error("Failed to load template #{templatePath}.")

    unless fs.existsSync(dataPath) and fs.statSync(dataPath).isFile()
      throw Error("Failed to load data #{dataPath}.")

    # Start express server to serve dependencies from a unified namespaces
    @app = express()
    @server = http.createServer(@app)

    @app.use(express.static(templatePath))
    @app.use('/lib/', express.static("#{__dirname}/"))
    @app.use('/vendor/', express.static("#{__dirname}/../bower_components/"))
    @app.use('/data.json', express.static(dataPath))

    @server.listen(@serverPort)

    @data = fs.readFileSync(dataPath, encoding: 'utf8')

    # Render the page
    @page = new Page(@serverAddress, @serverPort, @data)
    @page.on 'render', =>  @server.close()
    @page.on 'fail',   =>  @server.close()

nota = new Nota(argv)

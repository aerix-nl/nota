_       = require('underscore')._
http    = require('http')
express = require('express')
phantom = require('phantom')
fs      = require('fs')
argv    = require('optimist').argv
Page    = require('./page')

class Nota
  # Some defaults
  serverAddress: 'localhost'
  serverPort: 7483
  templatesPath: 'templates'

  constructor: ( argv ) ->
    dataPath = argv.data
    templatePath = argv.template

    outputPath = "output.pdf"
    outputPath = argv.output if argv.output

    @serverPort = argv.port if argv.port

    # Exit unless the --template or --list arguments are passed
    unless (argv.template? and argv.data?) or argv.list?
      throw new Error("Please provide a template and data.")

    # If --list output an index of all the templates found in the template directory
    if argv.list?
      console.log "#{definition.dir} '#{name}'" for name, definition of @getTemplatesIndex(true)
      return

    # Check if the --template and --data paths exist
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

    data = JSON.parse(fs.readFileSync(dataPath, encoding: 'utf8'))

    # Render the page
    @page = new Page(@serverAddress, @serverPort, data, outputPath)
    @page.on 'render', =>  @server.close()
    @page.on 'fail',   =>  @server.close()

  getTemplatesIndex: (forceRebuild)->
    return @index if @index? and not forceRebuild

    if not fs.existsSync(@templatesPath) then throw Error("Templates path '#{@templatesPath}' doesn't exist.")
    # Get an array of filenames (excluding '.' and '..')
    templateDirs = fs.readdirSync(@templatesPath)
    # Filter out all the directories
    templateDirs = _.filter templateDirs, (dir)=>
      fs.statSync(@templatesPath+'/'+dir).isDirectory()
    
    index = {}
    for dir in templateDirs
      # Get the template definition
      defined = fs.existsSync(@templatesPath+"/#{dir}/javascript/define-template.json")
      if not defined
        console.warn "Template without definition found: '#{dir}'"
        templateDefinition = { name: dir, definition: 'not found' }
      else
        definitionPath = @templatesPath+"/#{dir}/javascript/define-template.json"
        templateDefinition = JSON.parse fs.readFileSync definitionPath
        templateDefinition.definition = 'read'
        # TODO: check template definition against scheme for reuiqre properties
        # (and throw warnings otherwise) and set .defintion = 'valid' if sufficient

      # Check requirements for tempalte
      if not fs.existsSync("templates/"+dir+"/template.html")
        console.warn "Template #{templateDefinition.name} has no mandatory 'template.html' file (omitting)"
        continue 

      # Supplement the definition with some meta data that is now available
      templateDefinition.dir = dir
      # Save the definition in the index with it's name as the key
      index[templateDefinition.name] = templateDefinition

    # Save the index
    @index = index
    return index

nota = new Nota(argv)

_       = require('underscore')._
_.str   = require('underscore.string')
http    = require('http')
express = require('express')
phantom = require('phantom')
fs      = require('fs')
argv    = require('optimist').argv
open    = require("open")
Page    = require('./page')

class NotaServer
  # Some defaults
  serverAddress: 'localhost'
  serverPort: 7483
  templatesPath: 'templates'
  defaultFilename: 'output.pdf'

  constructor: ( argv ) ->
    # TODO: get server config from .json file
    dataPath       = argv.data
    templatePath   = argv.template
    preview        = argv.show
    outputPath     = argv.output

    @serverPort    = argv.port if argv.port?

    # If --list output an index of all the templates found in the template directory
    if argv.list?
      return @listTemplatesIndex()

    # Exit unless the --template and --data are passed
    unless argv.template?
      throw new Error("Please provide a template directory with '--template=<dir>'.")
    unless argv.data?
      throw new Error("Please provide a data JSON file with '--data=<file>'.")

    # Check if the template paths is absolute
    if not _.str.startsWith(templatePath, '/')
      # If not we interpret it as relative to the templates directory from here on
      templatePath = @templatesPath + '/' + templatePath

    # Check if the template paths exist
    unless fs.existsSync(templatePath) and fs.statSync(templatePath).isDirectory()
      throw new Error("Failed to find template '#{templatePath}'.")

    # Check if the data path is absolute 
    if not _.str.startsWith(dataPath, '/')
      # If not we interpret it as relative to the selected template directory from here on
      dataPath = templatePath + '/' + dataPath

    # Check if the data path exists
    unless @fileExists(dataPath)

      # Check if is has the .json extension suffixed and try again
      if not _.str.endsWith(dataPath, '.json')

        dataPath = dataPath + '.json'
        unless @fileExists(dataPath)
          throw new Error("Failed to find data '#{dataPath}'.")

    data = JSON.parse(fs.readFileSync(dataPath, encoding: 'utf8'))

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

    @server.listen(@serverPort)

    pageConfig = {
      serverAddress: @serverAddress
      serverPort: @serverPort
      outputPath: outputPath
      defaultFilename: @defaultFilename
      initData: data
    }

    # Render the page
    @page = new Page(pageConfig)
    @page.on 'ready',        => @page.capture()
    @page.on 'capture:done',    @captured, @
    @page.on 'fail',            @close,    @
    @page.onAny                 @logPage,  @

  logPage: ->
    if _.str.startsWith 'client:' then console.log @event
    else console.log "page:#{@event}"

  fileExists: (path)->
    fs.existsSync(path) and fs.statSync(path).isFile()

  listTemplatesIndex: ->
    index = @getTemplatesIndex()

    if _.size(index) is 0
      throw new Error("No (valid) templates found in templates directory.")
    else
      # List them all in a style of: templates/hello_world 'Hello World' v1.0
      for name, definition of index
        console.log "#{definition.dir} '#{name}' v#{definition.version}" 

  getTemplatesIndex: (forceRebuild)->
    # Exit if cache has already been built or force rebuild flag is set
    return @index if @index? and not forceRebuild

    if not fs.existsSync(@templatesPath)
      throw Error("Templates path '#{@templatesPath}' doesn't exist.")

    # Get an array of filenames (excluding '.' and '..')
    templateDirs = fs.readdirSync(@templatesPath)
    # Filter out all the directories
    templateDirs = _.filter templateDirs, (dir)=>
      fs.statSync(@templatesPath+'/'+dir).isDirectory()
    
    index = {}

    for dir in templateDirs
      # Get the template definition
      isDefined = fs.existsSync(@templatesPath+"/#{dir}/bower.json")

      if not isDefined
        templateDefinition =
          name: dir
          definition: 'not found'
      else
        definitionPath = @templatesPath+"/#{dir}/bower.json"
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

  captured: (meta)->
    console.log "Output written: #{meta.filesystemName}"
    process.exit()
    # TODO: why u no work @close()?
    @close()

  close: ->
    console.log 44
    @page.close()
    @server.close()
    process.exit()


Nota = new NotaServer(argv)

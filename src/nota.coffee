nomnom  = require('nomnom')
fs      = require('fs')
_       = require('underscore')._
_.str   = require('underscore.string')
open    = require('open')

NotaServer = require('./server')

class Nota

  @version: '1337.0.1'

  # Some defaults
  @defaults:
    serverAddress: 'localhost'
    serverPort:    7483
    templatesPath: 'templates'
    outputPath:    'output.pdf'

  constructor: ( ) ->

    nomnom.options
      template:
        position: 0
        help:     'The template path'
      data:
        position: 1
        help:    'The data path'
      output:
        position: 2
        help:    'The output file'

      preview:
        abbr: 'p'
        flag: true
        help: 'Preview in the browser'

      list:
        abbr: 'l'
        flag: true
        help: 'List all templates'
        callback: @listTemplatesIndex

      version:
        abbr: 'v'
        flag: true
        help: 'Print version'
        callback: @version

    args = nomnom.nom()

    # TODO: get server config from .json file
    templatePath  = args.template
    dataPath      = args.data
    outputPath    = args.output or Nota.defaults.outputPath
    serverAddress = Nota.defaults.serverAddress
    serverPort    = args.port   or Nota.defaults.serverPort

    # Exit unless the --template and --data are passed
    unless templatePath?
      throw new Error("Please provide a template.")

    unless dataPath?
      throw new Error("Please provide data'.")

    # Find the correct template path
    unless NotaServer.isTemplate(templatePath)
      if NotaServer.isTemplate(_templatePath = "#{process.cwd()}/#{templatePath}")
        templatePath = _templatePath
      else if NotaServer.isTemplate(_templatePath = "#{Nota.defaults.templatesPath}/#{templatePath}")
        templatePath = _templatePath
      else throw new Error("Failed to find template '#{templatePath}'.")

    # Find the correct data path
    unless NotaServer.isData(dataPath)
      if NotaServer.isData(_dataPath = "#{process.cwd()}/#{dataPath}")
        dataPath = _dataPath
      else if NotaServer.isData(_dataPath = "#{templatePath}/#{dataPath}")
        dataPath = _dataPath
      else throw new Error("Failed to find data '#{dataPath}'.")

    # Get the data
    data = JSON.parse(fs.readFileSync(dataPath, encoding: 'utf8'))

    # Start the server
    server = new NotaServer(serverAddress, serverPort, templatePath, data)

    # If we want a preview, open the web page
    if args.preview then open(server.url())
    # Else, render the page, and close the server
    else server.render outputPath, -> server.close()


  version: ( ) ->
    return "Nota version #{Nota.version}"

  listTemplatesIndex: ( ) =>
    templates = []
    index = @getTemplatesIndex()

    if _.size(index) is 0
      throw new Error("No (valid) templates found in templates directory.")
    else
      # List them all in a style of: templates/hello_world 'Hello World' v1.0
      templates = for name, definition of index
        "#{definition.dir} '#{name}' v#{definition.version}"

      return templates.join("\n")

    # return templates

  getTemplatesIndex: (forceRebuild) =>
    # Exit if cache has already been built or force rebuild flag is set
    return @index if @index? and not forceRebuild

    if not fs.existsSync(Nota.defaults.templatesPath)
      throw Error("Templates path '#{Nota.defaults.templatesPath}' doesn't exist.")

    # Get an array of filenames (excluding '.' and '..')
    templateDirs = fs.readdirSync(Nota.defaults.templatesPath)
    # Filter out all the directories
    templateDirs = _.filter templateDirs, (dir)=>
      fs.statSync(Nota.defaults.templatesPath+'/'+dir).isDirectory()

    index = {}

    for dir in templateDirs
      # Get the template definition
      isDefined = fs.existsSync(Nota.defaults.templatesPath+"/#{dir}/bower.json")

      if not isDefined
        templateDefinition =
          name: dir
          definition: 'not found'
      else
        definitionPath = Nota.defaults.templatesPath+"/#{dir}/bower.json"
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

Nota = new Nota()

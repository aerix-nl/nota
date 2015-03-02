nomnom  = require('nomnom')
fs      = require('fs')
_       = require('underscore')._
_.str   = require('underscore.string')
open    = require('open')

NotaServer = require('./server')
NotaHelper = require('./helper')

class Nota

  # Load the (default) configuration
  defaults: JSON.parse(fs.readFileSync('config.json', 'utf8'))

  # Load the package definition so we have some meta data available such as
  # version number.
  package: JSON.parse(fs.readFileSync('package.json', 'utf8'))

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
        callback: -> @package.version

    args = nomnom.nom()

    templatePath  = args.template
    dataPath      = args.data
    outputPath    = args.output or @defaults.outputPath
    serverAddress = @defaults.serverAddress
    serverPort    = args.port   or @defaults.serverPort

    # Exit unless the --template and --data are passed
    unless templatePath?
      throw new Error("Please provide a template.")

    unless dataPath?
      throw new Error("Please provide data'.")

    console.log NotaHelper

    # Find the correct template path
    unless NotaHelper.isTemplate(templatePath)

      if NotaHelper.isTemplate(_templatePath =
        "#{process.cwd()}/#{templatePath}")
        templatePath = _templatePath

      else if NotaHelper.isTemplate(_templatePath =
        "#{@defaults.templatesPath}/#{templatePath}")
        templatePath = _templatePath

      else if (match = _(NotaHelper.getTemplatesIndex(@defaults.templatesPath)).findWhere {name: templatePath})?
        throw new Error("No template at
        '#{templatePath}'. We did find a template which declares it's name as
        such. It's path is '#{match.dir}'")

      else throw new Error("Failed to find template '#{templatePath}'.")

    # Find the correct data path
    unless NotaHelper.isData(dataPath)
      if NotaHelper.isData(_dataPath = "#{process.cwd()}/#{dataPath}")
        dataPath = _dataPath
      else if NotaHelper.isData(_dataPath = "#{templatePath}/#{dataPath}")
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

  listTemplatesIndex: ( ) ->
    templates = []
    index = NotaHelper.getTemplatesIndex(@defaults.templatesPath)

    if _.size(index) is 0
      throw new Error("No (valid) templates found in templates directory.")
    else
      # List them all in a format of: templates/hello_world 'Hello World' v1.0
      templates = for name, definition of index
        "#{definition.dir} '#{name}' v#{definition.version}"

      return templates.join("\n")


Nota = new Nota()

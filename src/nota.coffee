nomnom   = require('nomnom')
fs       = require('fs')
path     = require('path')
_        = require('underscore')._
_.str    = require('underscore.string')
open     = require('open')
terminal = require('node-terminal')
notifier = require('node-notifier')

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

      notify:
        abbr: 'n'
        flag: true
        help: 'Notify when render job is finished'

      resources:
        flag: true
        help: 'Show the events of page resource loading in output'

    # Parsing CLI arguments and setting options
    args = nomnom.nom()

    templatePath  = args.template
    dataPath      = args.data
    outputPath    = args.output or @defaults.outputPath

    serverAddress = @defaults.serverAddress
    serverPort    = args.port   or @defaults.serverPort

    @options = _.extend {}, @defaults

    if args.notify?
      @options.notify = args.notify
    if args.resources?
      @options.logging.pageResources = args.resources

    # Exit unless the --template and --data are passed
    unless templatePath?
      throw new Error("Please provide a template.")

    unless dataPath?
      throw new Error("Please provide data'.")

    NotaHelper.on "warning", @logWarning, @
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
    server = new NotaServer(@defaults, templatePath, data)
    server.document.on "all", @logEvent, @
    server.document.on "page:ready", => @notify
      title: "Nota: render job finished"
      message: "One "

    # If we want a preview, open the web page
    if args.preview then open(server.url())
    # Else, render the page, and close the server
    else server.render outputPath, -> server.close()

  listTemplatesIndex: ( ) =>
    NotaHelper.on "warning", @logWarning, @

    templates = []
    index = NotaHelper.getTemplatesIndex(@defaults.templatesPath)

    if _.size(index) is 0
      throw new Error("No (valid) templates found in templates directory.")
    else
      # List them all in a format of: templates/hello_world 'Hello World' v1.0
      templates = for name, definition of index
        "#{definition.dir} '#{name}' v#{definition.version}"

      return templates.join("\n")

  logWarning: (warningMsg)->
    terminal.colorize("nota %3%kWARNING%n #{warningMsg}\n").colorize("%n")

  logError: (warningMsg)->
    terminal.colorize("nota %1%kERROR%n #{warningMsg}\n").colorize("%n")

  logEvent: ( event )->
    # To prevent the output being spammed full of resource log events we allow supressing it
    if _.str.startsWith(event, "page:resource") and not @options.logging.pageResources then return

    terminal.colorize("nota %4%kEVENT%n #{event}\n").colorize("%n")

  notify: ( message )->
    console.log __dirname
    console.log NotaHelper.isFile path.join(__dirname, '../assets/images/icon.svg')

    base =
      title:    'Nota event'
      icon:     path.join(__dirname, '../assets/images/icon.png')
    notifier.notify _.extend base, message

Nota = new Nota()

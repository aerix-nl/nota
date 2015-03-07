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
  defaults: JSON.parse(fs.readFileSync('config-default.json', 'utf8'))

  # Load the package definition so we have some meta data available such as
  # version number.
  meta: JSON.parse(fs.readFileSync('package.json', 'utf8'))

  constructor: ( ) ->
    NotaHelper.on "warning", @logWarning, @

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
        callback: -> @meta.version

      notify:
        abbr: 'n'
        flag: true
        help: 'Notify when a render job is finished'
      resources:
        flag: true
        help: 'Show the events of page resource loading in output'
      preserve:
        flag: true
        help: 'Prevents overwriting when output path is already occupied'

    try
      @options = @settleOptions nomnom.nom(), @defaults
    catch e
      @logError e
      return

    definition = NotaHelper.getTemplateDefinition @options.templatePath
    if definition.meta is "not template"
      @logError "Template %m#{definition.name}%N has no mandatory template.html file"
      return

    @options.data = @getInitData(@options)

    # Start the server
    @server = new NotaServer(@options)
    @server.document.on 'all', @logEvent, @

    # If we want a preview, open the web page
    if @options.preview then open(@server.url())
    # Else, perform the render job and close the server
    else @server.document.on 'client:template:loaded', => @render(@options)

  render: ( options )->
    jobs = [{
      data: options.data
      outputPath: options.outputPath
    }]
    @server.render jobs,
      preserve: options.preserve
      callback: ( succesful) =>
        if options.logging.notify then @notify
          title: "Nota: render job finished"
          message: "#{jobs.length} document captured to .PDF"
        @server.close()

  # Settling options from parsed CLI arguments over defaults
  settleOptions: ( args, defaults ) ->
    options = _.extend {}, defaults
    # Extend with mandatory arguments
    options = _.extend options,
      templatePath: args.template
      dataPath:     args.data
      outputPath:   args.output
    # Extend with optional arguments
    options.preview = args.preview                 if args.preview?
    options.port = args.port                       if args.port?
    options.logging.notify = args.notify           if args.notify?
    options.logging.pageResources = args.resources if args.resources?
    options.preserve = args.preserve               if args.preserve?
    
    options.templatePath =  @findTemplatePath(options)
    options.dataPath =      @findDataPath(options)
    return options

  getInitData: ( options ) ->

    # Little bundle of logic that we can call later if no data has been provided
    # to see if the template specified any example data.
    exampleData = ->
      try
        definition = NotaHelper.getTemplateDefinition options.templatePath
        if definition['example-data']?
          dataPath = path.join options.templatePath, definition['example-data']
          if NotaHelper.isData dataPath
            return JSON.parse fs.readFileSync dataPath, encoding: 'utf8'
      catch e
        return null

    # Get the data
    if options.dataPath?
      data = JSON.parse(fs.readFileSync(options.dataPath, encoding: 'utf8'))
    else if (_data = exampleData())?
      data = _data
    else
      data = {}

  findTemplatePath: ( options ) ->
    { templatePath } = options
    # Exit unless the --template and --data are passed
    unless templatePath?
      throw new Error("Please provide a template.")
        
    # Find the correct template path
    unless NotaHelper.isTemplate(templatePath)

      if NotaHelper.isTemplate(_templatePath =
        "#{process.cwd()}/#{templatePath}")
        templatePath = _templatePath

      else if NotaHelper.isTemplate(_templatePath =
        "#{@defaults.templatesPath}/#{templatePath}")
        templatePath = _templatePath

      else if (match = _(NotaHelper.getTemplatesIndex(@options.templatesPath)).findWhere {name: templatePath})?
        throw new Error("No template at '#{templatePath}'. But we did find a
        template which declares it's name as such. It's path is '#{match.dir}'")

      else throw new Error("Failed to find template '#{templatePath}'.")
    templatePath

  findDataPath: ( options ) ->
    { dataPath, templatePath, preview } = options
    unless dataPath?
      # When previewing we allow for no data to be specified, otherwise it's mandatory
      if preview then return null else throw new Error("Please provide data'.")

    # Find the correct data path
    unless NotaHelper.isData(dataPath)

      if NotaHelper.isData(_dataPath = "#{process.cwd()}/#{dataPath}")
        dataPath = _dataPath

      else if NotaHelper.isData(_dataPath = "#{templatePath}/#{dataPath}")
        dataPath = _dataPath

      else throw new Error("Failed to find data '#{dataPath}'.")

    dataPath

  listTemplatesIndex: ( ) =>
    NotaHelper.on "warning", @logWarning, @

    templates = []
    index = NotaHelper.getTemplatesIndex(@defaults.templatesPath)

    if _.size(index) is 0
      throw new Error("No (valid) templates found in templates directory.")
    else
      headerDir     = 'Template directory:'
      headerName    = 'Template name:'
      headerVersion = 'Template version:'
      
      fold = (memo, str)->
        Math.max(memo, str.length)
      lengths =
        dirName: _.reduce _.keys(index), fold, headerDir.length
        name:    _.reduce _(_(index).values()).pluck('name'), fold, headerName.length

      headerDir     = _.str.pad 'Template directory:',  lengths.dirName, ' ', 'right'
      headerName    = _.str.pad 'Template name:', lengths.name + 8, ' ', 'left'
      # List them all in a format of: templates/hello_world 'Hello World' v1.0

      terminal.colorize("nota %K#{headerDir}#{headerName} #{headerVersion}%n\n").colorize("%n")
      templates = for dir, definition of index
        dir     = _.str.pad definition.dir,  lengths.dirName, ' ', 'right'
        name    = _.str.pad definition.name, lengths.name + 8, ' ', 'left'
        version = if definition.version? then 'v'+definition.version else ''
        terminal.colorize("nota %m#{dir}%g#{name} %K#{version}%n\n").colorize("%n")
    return '' # Somehow needed to make terminal output stop here

  logWarning: ( warningMsg )->
    terminal.colorize("nota %3%kWARNING%n #{warningMsg}\n").colorize("%n")

  logError: ( errorMsg )->
    terminal.colorize("nota %1%kERROR%n #{errorMsg}\n").colorize("%n")

  logEvent: ( event )->
    # To prevent the output being spammed full of resource log events we allow supressing it
    if _.str.startsWith(event, "page:resource") and not @options.logging.pageResources then return

    terminal.colorize("nota %4%kEVENT%n #{event}\n").colorize("%n")

  notify: ( message )->
    base =
      title:    'Nota event'
      icon:     path.join(__dirname, '../assets/images/icon.png')
    notifier.notify _.extend base, message

Nota = new Nota()

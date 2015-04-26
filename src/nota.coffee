nomnom        = require('nomnom')
fs            = require('fs')
Path          = require('path')
_             = require('underscore')._
s             = require('underscore.string')
open          = require('open')
chalk         = require('chalk')
notifier      = require('node-notifier')

NotaServer    = require('./server')
JobQueue      = require('./queue')
TemplateUtils = require('./template_utils')

class Nota

  # Load the (default) configuration
  defaults: require '../config-default.json'

  # Load the package definition so we may know ourselves (version etc.)
  meta: require '../package.json'

  constructor: ( logging ) ->
    # Allow redirecting of logging output through dependency injection
    if logging? then { @log, @logEvent, @logError, @logWarning } = logging

    # Instantiate our thrusty helping hand in template and job tasks
    @helper = new TemplateUtils(@logWarning)

    nomnom.options
      template:
        position: 0
        help:     'The template directory path'
      data:
        position: 1
        help:    'The data file path'
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

      resources:
        flag: true
        help: 'Show the events of page resource loading in output'
      preserve:
        flag: true
        help: 'Prevent overwriting when output path is already occupied'

    try
      @options = @settleOptions nomnom.nom(), @defaults
    catch e
      @logError e
      return

    definition = @helper.getTemplateDefinition @options.templatePath, false
    if definition.meta is "not template"
      @logError "Template #{chalk.cyan(definition.name)} has no mandatory #{chalk.cyan 'template.html'} file"
      return

    logging = {
      log:        @log
      logEvent:   @logEvent
      logWarning: @logWarning
      logError:   @logError
    }
    # Start the server
    @server = new NotaServer @options, logging
    @server.start()
    
    # If we want a preview, open the web page
    if @options.preview then open(@server.url())
    # Else, perform the render job and close the server
    else @render(@options)

  # TODO: refactor this wrapper away. Right now it's an ugly extractor that
  # creates a single job and calls the server queue API, but this should
  # become more general with job arrays in the future.
  render: ( options )->
    job = {
      dataPath:   options.dataPath
      outputPath: options.outputPath
      preserve:   options.preserve
    }
    @server.queue [job]
    .then (meta) =>
      # We're done!

      if options.logging.notify
        # Would be nice if you could click on the notification
        notifier.on 'click', ->
          if meta.length is 1
            open meta[0].outputPath
          else if meta.length > 1
            open Path.dirname Path.resolve meta[0].outputPath
          else # meta = []

        # Send notification
        notifier.notify
          title:    "Nota: render jobs finished"
          message:  "#{meta.length} document(s) captured to .PDF"
          icon:     Path.join(__dirname, '../assets/images/icon.png')
          wait:     true

      @server.close()
      process.exit()

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
    
    # Template
    options.templatePath =          @helper.findTemplatePath(options)
    # Template config
    try _.extend options.document,  @helper.getTemplateDefinition(options.templatePath).nota
    catch e then @logWarning e
    # Data
    options.dataPath =              @helper.findDataPath(options)

    return options


  listTemplatesIndex: ( ) =>
    templates = []
    index = @helper.getTemplatesIndex(@defaults.templatesPath)

    if _.size(index) is 0
      @logError "No (valid) templates found in templates directory."
    else
      headerDir     = 'Directory'
      headerName    = 'Template name'
      headerVersion = 'Version'
      
      fold = (memo, str)->
        Math.max(memo, str.length)
      lengths =
        dirName: _.reduce _.keys(index), fold, headerDir.length
        name:    _.reduce _(_(index).values()).pluck('name'), fold, headerName.length

      headerDir     = s.pad headerDir,  lengths.dirName, ' ', 'right'
      headerName    = s.pad headerName, lengths.name + 8, ' ', 'left'
      # List them all in a format of: templates/hello_world 'Hello World' v1.0

      console.log "nota "+ chalk.gray(headerDir + headerName + ' ' + headerVersion)
      templates = for dir, definition of index
        dir     = s.pad definition.dir,  lengths.dirName, ' ', 'right'
        name    = s.pad definition.name, lengths.name + 8, ' ', 'left'
        version = if definition.version? then 'v'+definition.version else ''
        console.log "nota " + chalk.cyan(dir) + chalk.green(name) + ' ' + chalk.gray(version)
    return '' # Somehow needed to make execution stop here with --list

  log: ( msg )->
    console.log  'nota ' + msg

  logWarning: ( warningMsg )->
    console.warn 'nota ' + chalk.bgYellow.black('WARNG') + ' ' + warningMsg

  logError: ( errorMsg )->
    console.error 'nota ' + chalk.bgRed.black('ERROR') + ' ' + errorMsg

  logEvent: ( event )->
    console.info 'nota ' + chalk.bgBlue.black('EVENT') + ' ' + event

Nota = new Nota()

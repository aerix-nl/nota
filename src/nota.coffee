nomnom   = require('nomnom')
fs       = require('fs')
Path     = require('path')
_        = require('underscore')._
_.str    = require('underscore.string')
open     = require('open')
chalk    = require('chalk')
notifier = require('node-notifier')

NotaServer = require('./server')
NotaHelper = require('./helper')

class Nota

  # Load the (default) configuration
  defaults: require '../config-default.json'

  # Load the package definition so we have some meta data available such as
  # version number.
  meta: require '../package.json'

  constructor: ( ) ->
    @helper = new NotaHelper(@logWarning)

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

    definition = @helper.getTemplateDefinition @options.templatePath
    if definition.meta is "not template"
      @logError "Template #{chalk.magenta(definition.name)} has no mandatory template.html file"
      return

    @options.data = @helper.getInitData(@options)

    # Start the server
    @server = new NotaServer(@options)
    @server.on 'all', @logEvent, @
    @server.start()
    @server.document.on('all', @logEvent, @) unless @options.preview
    
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
      callback: (meta) =>
        if options.logging.notify
          # Would be nice if you could click on the notification
          notifier.on 'click', -> open meta[1].outputPath
          @notify
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
    
    options.templatePath =  @helper.findTemplatePath(options)
    options.dataPath =      @helper.findDataPath(options)
    return options


  listTemplatesIndex: ( ) =>
    templates = []
    index = @helper.getTemplatesIndex(@defaults.templatesPath)

    if _.size(index) is 0
      throw new Error("No (valid) templates found in templates directory.")
    else
      headerDir     = 'Directory'
      headerName    = 'Template name'
      headerVersion = 'Version'
      
      fold = (memo, str)->
        Math.max(memo, str.length)
      lengths =
        dirName: _.reduce _.keys(index), fold, headerDir.length
        name:    _.reduce _(_(index).values()).pluck('name'), fold, headerName.length

      headerDir     = _.str.pad headerDir,  lengths.dirName, ' ', 'right'
      headerName    = _.str.pad headerName, lengths.name + 8, ' ', 'left'
      # List them all in a format of: templates/hello_world 'Hello World' v1.0

      console.log "nota "+ chalk.gray(headerDir + headerName + ' ' + headerVersion)
      templates = for dir, definition of index
        dir     = _.str.pad definition.dir,  lengths.dirName, ' ', 'right'
        name    = _.str.pad definition.name, lengths.name + 8, ' ', 'left'
        version = if definition.version? then 'v'+definition.version else ''
        console.log "nota " + chalk.magenta(dir) + chalk.green(name) + ' ' + chalk.gray(version)
    return '' # Somehow needed to make execution stop here with --list

  logWarning: ( warningMsg )->
    console.warn "nota " + chalk.bgYellow.black('WARNG') + ' ' + warningMsg

  logError: ( errorMsg )->
    console.warn "nota " + chalk.bgRed.black('ERROR') + ' ' + errorMsg

  logEvent: ( event )->
    # To prevent the output being spammed full of resource log events we allow supressing it
    if _.str.startsWith(event, "page:resource") and not @options.logging.pageResources then return
    
    console.warn "nota " + chalk.bgBlue.black('EVENT') + ' ' + event

  notify: ( message )->
    base =
      title:    'Nota event'
      icon:     Path.join(__dirname, '../assets/images/icon.png')
    notifier.notify _.extend base, message

Nota = new Nota()

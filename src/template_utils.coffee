fs            = require('fs')
_             = require('underscore')._
Backbone      = require('backbone')
Path          = require('path')
chalk         = require('chalk')
cheerio       = require('cheerio')

# Utility class to help it with common filesystem and template/data related questiosn
module.exports = class TemplateUtils

  constructor: ( @logWarning )->
    _.extend(@, Backbone.Events)

  isFile: ( path ) ->
    fs.existsSync(path) and fs.statSync(path).isFile()

  isDirectory: ( path ) ->
    fs.existsSync(path) and fs.statSync(path).isDirectory()

  isData: ( path ) ->
    @isFile(path)

  isTemplate: ( path ) ->
    @isDirectory(path)

  getTemplatesIndex: ( basePath, logWarnings = true ) ->
    if not fs.existsSync(basePath)
      throw new Error("Templates basepath '#{basePath}' doesn't exist")

    # Get an array of filenames (excluding '.' and '..')
    templateDirs = fs.readdirSync(basePath)
    # Filter out all the directories
    templateDirs = _.filter templateDirs, (dir)=>
      @isDirectory Path.join basePath, dir

    index = {}

    for dir in templateDirs
      definition = @getTemplateDefinition Path.join(basePath, dir)
      if definition.meta is 'not template'
        warningMsg = "Template #{chalk.magenta(dir)} has no mandatory
        template.html file #{chalk.gray '(omitting template)'}"
        @logWarning? warningMsg if logWarnings
        continue
      # Save the definition in the index with it's name as the key
      index[definition.dir] = definition
    # We're done here
    return index

  getTemplateDefinition: ( dir, logWarnings = true ) ->
    unless @isDirectory dir then throw new Error "Template '#{dir}' not found"
    # Get the template definition
    isDefined = @isFile( dir+"/bower.json")

    if not isDefined
      warningMsg = "Template #{chalk.magenta(dir)} has no 'bower.json' definition
      #{chalk.gray '(optional, but recommended)'}"
      @logWarning? warningMsg if logWarnings
      templateDefinition =
        # Default it's name to it's directory name in absence of an 'official
        # statement' so we at least have some unique identifier.
        name: Path.basename(dir)
        meta: 'not found'
    else
      definitionPath = dir+"/bower.json"
      templateDefinition = JSON.parse fs.readFileSync definitionPath
      templateDefinition.meta = 'read'
      # TODO: check template definition against scheme for reuiqre properties
      # (and throw warnings otherwise) and set .defintion = 'valid' if sufficient

    # Check requirements for template
    if not fs.existsSync(dir+"/template.html")
      templateDefinition.meta = 'not template'

    # Supplement the definition with some meta data that is now available
    templateDefinition.dir = Path.basename(dir)
    return templateDefinition

  # Little bundle of logic that we can call later if no data has been provided
  # to see if the template specified any example data.
  getExampleDataPath: (templatePath)->
    definition = @getTemplateDefinition templatePath
    if definition['nota']?['exampleData']?
      exampleDataPath = Path.join templatePath, definition['nota']['exampleData']
      if @isData exampleDataPath then return exampleDataPath
      else @logWarning? "Example data path declaration found in template
      definition, but file doesn't exist."

  # Inspect the template HTML and see if it contains JavaScript, if it
  # contains none, we assume it's a static template. If it does contain any
  # JavaScript, all bets are off and we assume it to be a dynamic template
  # (even if the JavaScript might not actually modify the DOM). Often a
  # dynamic template will load within the timeout, but it might take
  # considerable time, so we allow it to interface with the client API to tell
  # Nota when it's ready for capture. Also, it might need data to be injected
  # to render.
  getTemplateType: (templatePath)->
    html = fs.readFileSync Path.join(templatePath, 'template.html'), encoding: 'utf8'
    $ = cheerio.load html
    type = if $('script').length is 0 then 'static' else 'dynamic'

  findTemplatePath: ( options ) ->
    { templatePath, templatesPath } = options
    # Exit unless the --template and --data are passed
    unless templatePath?
      throw new Error("Please provide a template with --template=<directory>")
        
    # Find the correct template path
    unless @isTemplate(templatePath)

      if @isTemplate(_templatePath =
        "#{process.cwd()}/#{templatePath}")
        templatePath = _templatePath

      else if @isTemplate(_templatePath =
        "#{templatesPath}/#{templatePath}")
        templatePath = _templatePath

      else if (match = _(@getTemplatesIndex(templatesPath)).findWhere {name: templatePath})?
        throw new Error("No template at '#{templatePath}'. But we did find a
        template which declares it's name as such. It's path is '#{match.dir}'")

      else throw new Error("Failed to find template '#{templatePath}'.")
    templatePath

  findDataPath: ( options ) ->
    { dataPath, templatePath } = options
    if dataPath?
      if @isData(dataPath)
        dataPath
      else if @isData(_dataPath = "#{process.cwd()}/#{dataPath}")
        dataPath = _dataPath
      else if @isData(_dataPath = "#{templatePath}/#{dataPath}")
        dataPath = _dataPath
      else throw new Error("Failed to find data '#{dataPath}'.")
    else if _dataPath = @getExampleDataPath templatePath
      @logWarning? "No data provided. Using example data as found in template definition."
      dataPath = _dataPath
    else
      throw new Error("Please provide data with --data=<file path>")
    dataPath


  # options =
  #   path:     captureOptions.outputPath
  #   meta:     meta
  #   default:  @options.defaultFilename
  findOutputPath: (options)->
    { outputPath, meta, defaultFilename, preserve } = options
    # If the explicitly defined output path is merely an output directory,
    # then it still leaves open the question of the actual filename, which
    # in this case we'll check with the meta data provided by the template,
    # if there is any suggestion from it's side. If so, then we use that
    # one. If the output path is not defined at atl, we just give it the
    # default filename.
    if outputPath?
      if @isDirectory(outputPath)
        if meta?.filesystemName?
          outputPath = Path.join(outputPath, meta.filesystemName)
        else
          # Else we have no suggestion from the template, and we resort to the
          # default filename as provided in the config, which isn't a very
          # meaningful or unique one :(
          outputPath = Path.join(outputPath, defaultFilename)

      # Now that we have an output path and filename, do a check if it's
      # already occupied.
      if @isFile(outputPath) and not preserve
        @logWarning? "Overwriting with current render: #{outputPath}"

    else
      if meta?.filesystemName?
        outputPath = meta.filesystemName
      else
        outputPath = defaultFilename

    outputPath
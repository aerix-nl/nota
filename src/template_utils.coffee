fs            = require('fs')
_             = require('underscore')._
s             = require('underscore.string')
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
      definition = @getTemplateDefinition Path.join(basePath, dir), logWarnings
      if definition.meta is 'not template'
        warningMsg = "Template #{chalk.cyan(dir)} has no mandatory
        #{chalk.cyan 'template.html'} file #{chalk.gray '(omitting template)'}"
        @logWarning? warningMsg if logWarnings
        continue
      # Save the definition in the index with it's name as the key
      index[definition.dir] = definition
    # We're done here
    return index

  getTemplateDefinition: ( dir, logWarnings = true ) ->
    unless @isDirectory dir then throw new Error "Template '#{dir}' not found"
    # Get the template definition
    isDefined = @isFile( Path.join dir, "bower.json" )

    if not isDefined
      warningMsg = "Template #{chalk.cyan(dir)} has no #{chalk.cyan 'bower.json'} definition
      #{chalk.gray '(optional, but recommended)'}"
      @logWarning? warningMsg if logWarnings
      templateDefinition =
        # Default it's name to it's directory name in absence of an 'official
        # statement' so we at least have some unique identifier.
        name: Path.basename(dir)
        meta: 'not found'
    else
      definitionPath = Path.join dir, "bower.json"
      templateDefinition = JSON.parse fs.readFileSync definitionPath
      templateDefinition.meta = 'read'

      # Not essential, but try to give the user a heads up about uninstalled dependencies
      if logWarnings then @checkDependencies(dir)

      # TODO: check template definition against scheme for reuiqre properties
      # (and throw warnings otherwise) and set .defintion = 'valid' if sufficient

    # Check requirements for template
    if not fs.existsSync( Path.join dir, "template.html" )
      templateDefinition.meta = 'not template'

    # Supplement the definition with some meta data that is now available
    templateDefinition.dir = Path.basename(dir)
    return templateDefinition

  # Logging some warnings about uninstalled dependencies when needed
  checkDependencies: (templateDir)->
    checknwarn = (args)=>
      return unless args[2]?
      depsDir = Path.join templateDir, args[0]+'_'+args[1] # e.g 'node_modules'
      defType = s.capitalize args[0] # e.g. 'Bower', 'Node'
      deps    = args[2].dependencies?    and _.keys(args[2].dependencies).length > 0
      devDeps = args[2].devDependencies? and _.keys(args[2].devDependencies).length > 0
      if (deps or devDeps) and not @isDirectory depsDir
        mngr = if args[0] is 'node' then 'npm' else args[0]
        @logWarning? "Template #{chalk.cyan templateDir}
        has #{defType} definition with dependencies, but no #{defType}
        #{args[1]} seem installed yet. Forgot #{chalk.cyan mngr+' install'}?"

    bowerPath = Path.join templateDir, "bower.json"
    if @isFile bowerPath
      bower = JSON.parse fs.readFileSync bowerPath
    
    checknwarn ['bower', 'components', bower]

    nodePath = Path.join templateDir, "package.json"
    if @isFile nodePath
      node = JSON.parse fs.readFileSync nodePath
    
    checknwarn ['node', 'modules', node]

  # Little bundle of logic that we can call later if no data has been provided
  # to see if the template specified any example data.
  getExampleDataPath: (templatePath)->
    definition = @getTemplateDefinition templatePath, false
    if definition['nota']?['exampleData']?
      exampleDataPath = Path.join templatePath, definition['nota']['exampleData']
      if @isData exampleDataPath then return exampleDataPath
      else if logWarnings
        @logWarning? "Example data path declaration found in template
        definition, but file doesn't exist."

  # Inspect the template HTML and see if it contains JavaScript, if it
  # contains none, we assume it's a static template. If it does contain any
  # JavaScript, all bets are off and we assume it to be a scripted template
  # (even if the JavaScript might not actually modify the DOM). Often a
  # scripted template will load within the timeout, but it might take
  # considerable time, so we allow it to interface with the client API to tell
  # Nota when it's ready for capture. Also, it might need data to be injected
  # to render.
  getTemplateType: (templatePath)->
    html = fs.readFileSync Path.join(templatePath, 'template.html'), encoding: 'utf8'
    $ = cheerio.load html
    type = if $('script').length is 0 then 'static' else 'scripted'

  findTemplatePath: ( options ) ->
    { templatePath, templatesPath } = options
    # Exit unless the --template and --data are passed
    unless templatePath?
      throw new Error("Please provide a template with #{chalk.cyan '--template=<directory>'}")
        
    # Find the correct template path
    unless @isTemplate(templatePath)

      if @isTemplate(_templatePath =
        "#{process.cwd()}/#{templatePath}")
        templatePath = _templatePath

      else if @isTemplate(_templatePath =
        "#{templatesPath}/#{templatePath}")
        templatePath = _templatePath

      else if (match = _(@getTemplatesIndex(templatesPath, false)).findWhere {name: templatePath})?
        throw new Error("No template at '#{templatePath}'. But we did find a
        template which declares it's name as such. It's path is '#{match.dir}'")

      else throw new Error("Failed to find template #{chalk.cyan templatePath}.")
    templatePath

  findDataPath: ( options ) ->
    { dataPath, templatePath } = options
    required = options.document?.modelDriven

    if dataPath?
      if @isData(dataPath)
        dataPath
      else if @isData(_dataPath = "#{process.cwd()}/#{dataPath}")
        dataPath = _dataPath
      else if @isData(_dataPath = "#{templatePath}/#{dataPath}")
        dataPath = _dataPath
      else throw new Error("Failed to find data '#{dataPath}'.")
    else if _dataPath = @getExampleDataPath templatePath
      @logWarning? "No data provided. Using example data at #{chalk.cyan _dataPath} as found in template definition."
      dataPath = _dataPath
    else
      if required is true
        throw new Error("Please provide data with #{chalk.cyan '--data=<file path>'}")
      else if not required?
        @logWarning? "No data has been provided or example data found. If your
        template is model driven and requires data, please provide data with
        #{chalk.cyan '--data=<file path>'}"
    dataPath


  # options =
  #   outputPath:       '/root/dir/subdir' | 'dir/force-filename.pdf'
  #   meta:             { filesystemName: 'preferred-name.pdf' }
  #   defaultFilename:  'default.pdf'
  #   preserve:         true | false
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
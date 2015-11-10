fs            = require('fs')
_             = require('underscore')._
s             = require('underscore.string')
Backbone      = require('backbone')
Path          = require('path')
chalk         = require('chalk')
cheerio       = require('cheerio')

# Utility class to help it with common filesystem and template/data related questiosn
module.exports = class TemplateHelper

  constructor: ( @logging )->
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
        @logging?.logWarning? warningMsg if logWarnings
        continue
      # Save the definition in the index with it's name as the key
      index[definition.path] = definition
    # We're done here
    return index

  getTemplateDefinition: ( dir, logWarnings = true ) ->
    unless @isDirectory dir then throw new Error "Template '#{dir}' not found"
    # Get the template definition
    isDefined = @isFile( Path.join dir, "nota.json" )

    if not isDefined
      warningMsg = "Template #{chalk.cyan(dir)} has no #{chalk.cyan 'nota.json'} definition
      #{chalk.gray '(optional, but recommended)'}"
      @logging?.logWarning? warningMsg if logWarnings

      # Cascade of fallbacks
      if @isFile( Path.join dir, "bower.json" )
        bowerPath = Path.join dir, "bower.json"
        bower = JSON.parse fs.readFileSync bowerPath
        definition = _.pick bower, ['name']
        definition.meta = 'fallback'

      else if @isFile( Path.join dir, "package.json" )
        npmPath = Path.join dir, "package.json"
        npm = JSON.parse fs.readFileSync npmPath
        definition = _.pick npm, ['name']
        definition.meta = 'fallback'

      else
        definition = { meta: 'not found' }

    else
      definitionPath = Path.join dir, "nota.json"
      definition = JSON.parse fs.readFileSync definitionPath
      # TODO: check template definition against scheme for reuiqred properties
      # and throw warnings otherwise) and set .defintion = 'valid' if
      # sufficient or 'invalid' otherwise.
      definition.meta = 'read'

      # Not essential, but try to give the user a heads up about uninstalled dependencies
      if logWarnings then @checkDependencies(dir)


    # Default it's name to it's directory name in absence of an 'official
    # statement' so we at least have some unique identifier.
    definition.name = Path.basename(dir) unless definition.name?

    # Attempt to derive build target from default filename, if it has one, and
    # it has a dot to signify an extension.
    if definition.defaultFilename?
      try
        definition.buildTarget = @buildTarget(definition.defaultFilename)
      catch error
        @logging?.logWarning? "Couldn't derive build target from default filename: #{error}"
    else
      @logging?.logWarning? "No default filetype specified with template definition, assuming PDF"

    # Check requirements for template
    if not fs.existsSync( Path.join dir, "template.html" )
      definition.meta = 'not template'

    # Supplement the definition with some meta data that is now available
    definition.path = dir
    return definition

  # Logging some warnings about uninstalled dependencies when needed
  checkDependencies: (templateDir)->
    # Dependency check function that warns the user if they are not installed yet
    checknwarn = (args)=>
      # is there any dependency spec at all?
      return unless args[2]?
      # package manager, e.g. 'Bower', 'Node'
      defType = s.capitalize args[0]
      # directory where package manager keeps installed dependencies, e.g 'node_modules'
      depsDir = Path.join templateDir, args[0]+'_'+args[1]
      # are there any dependencies?
      deps    = args[2].dependencies?    and _.keys(args[2].dependencies).length > 0
      # and any dev dependencies?
      devDeps = args[2].devDependencies? and _.keys(args[2].devDependencies).length > 0
      # if there are dependencies, are is there a sign of the containing directory?
      if (deps or devDeps) and not @isDirectory depsDir
        mngr = if args[0] is 'node' then 'npm' else args[0]
        @logging?.logWarning? "Template #{chalk.cyan templateDir}
        has #{defType} definition with dependencies, but no #{defType}
        #{args[1]} seem installed yet. Forgot #{chalk.cyan mngr+' install'}?"

    # Check Bower dependencies
    bowerPath = Path.join templateDir, "bower.json"
    if @isFile bowerPath
      bower = JSON.parse fs.readFileSync bowerPath

    checknwarn ['bower', 'components', bower]

    # Check NPM dependencies
    nodePath = Path.join templateDir, "package.json"
    if @isFile nodePath
      node = JSON.parse fs.readFileSync nodePath

    checknwarn ['node', 'modules', node]

  # Little bundle of logic that we can call later if no data has been provided
  # to see if the template specified any example data.
  getExampleDataPath: (templatePath)->
    definition = @getTemplateDefinition templatePath, false
    if definition?['exampleData']?
      exampleDataPath = Path.join templatePath, definition['exampleData']
      if @isData exampleDataPath then return exampleDataPath
      else if logWarnings
        @logging?.logWarning? "Example data path declaration found in template
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
    { templatesPath, template } = options
    templatePath = template.path

    # Exit unless the --template and --data are passed
    if not templatePath?
      throw new Error("Please provide a template with #{chalk.cyan '--template=<directory>'}")

    # Find the correct template path
    if not @isTemplate(templatePath)

      if @isTemplate(_templatePath = "#{process.cwd()}/#{templatePath}")
        templatePath = _templatePath

      else if @isTemplate(_templatePath = "#{templatesPath}/#{templatePath}")
        templatePath = _templatePath

      else if (match = _(@getTemplatesIndex(templatesPath, false)).findWhere {name: templatePath})?
        templatePath = match.path

      else throw new Error("Failed to find template #{chalk.cyan templatePath}.
        Try #{chalk.cyan '--list'} for an overview of available templates.")
    templatePath

  findDataPath: ( options ) ->
    { dataPath, template } = options

    if dataPath?
      if @isData(dataPath)
        dataPath
      else if @isData(_dataPath = "#{process.cwd()}/#{dataPath}")
        dataPath = _dataPath
      else if @isData(_dataPath = "#{template.path}/#{dataPath}")
        dataPath = _dataPath
      else throw new Error("Failed to find data '#{dataPath}'.")
    else if _dataPath = @getExampleDataPath template.path
      @logging?.logWarning? "No data provided. Using example data at
      #{chalk.cyan _dataPath} as found in template definition."
      dataPath = _dataPath
    else
      @logging?.logWarning? "No data has been provided or example data found. If your
      template is model driven and requires data, please provide data with
      #{chalk.cyan '--data=<file path>'}"
    dataPath


  # options =
  #   outputPath:       '/root/dir/subdir' | 'dir/force-filename.pdf'
  #   meta:             { filename: 'preferred-name.pdf' }
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
        if meta?.filename?
          outputPath = Path.join(outputPath, meta.filename)
        else
          # Else we have no suggestion from the template, and we resort to the
          # default filename as provided in the config, which isn't a very
          # meaningful or unique one :(
          outputPath = Path.join(outputPath, defaultFilename)

      # Now that we have an output path and filename, do a check if it's
      # already occupied.
      if @isFile(outputPath) and not preserve
        @logging?.logWarning? "Overwriting with current render: #{outputPath}"

    else
      if meta?.filename?
        outputPath = meta.filename
      else
        outputPath = defaultFilename

    outputPath

  buildTarget: (path)->
    idx = path?.lastIndexOf('.')

    if not idx > 0
      throw new Error "Could not derive build target from filename without extension"

    extension = path.substring(idx+1)

    switch extension
      when 'pdf', 'email', 'html'
        extension
      when 'eml'
        'email'
      else
        throw new Error "No known build target for file format #{chalk.cyan '.'+extension}"

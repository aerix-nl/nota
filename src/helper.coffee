fs            = require('fs')
_             = require('underscore')._
Backbone      = require('backbone')
path          = require('path')

# Utility class to help it with common filesystem and template/data related questiosn
class NotaHelper

  constructor: ( )->
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
    templateDirs = _.filter templateDirs, (dir)->
      fs.statSync(basePath+'/'+dir).isDirectory()

    index = {}

    for dir in templateDirs
      definition = @getTemplateDefinition path.join(basePath, dir)
      if definition.meta is 'not template'
        warningMsg = "Template %m#{dir}%N has no mandatory
        template.html file %K(omitting template)"
        @trigger("warning", warningMsg) if logWarnings
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
      warningMsg = "Template %m#{dir}%N has no 'bower.json' definition
      %K(optional, but recommended)"
      @trigger("warning", warningMsg) if logWarnings
      templateDefinition =
        # Default it's name to it's directory name in absence of an 'official
        # statement' so we at least have some unique identifier.
        name: path.basename(dir)
        meta: 'not found'
    else
      definitionPath = dir+"/bower.json"
      templateDefinition = JSON.parse fs.readFileSync definitionPath
      templateDefinition.meta = 'read'
      # TODO: check template definition against scheme for reuiqre properties
      # (and throw warnings otherwise) and set .defintion = 'valid' if sufficient

    # Check requirements for tempalte
    if not fs.existsSync(dir+"/template.html")
      templateDefinition.meta = 'not template'

    # Supplement the definition with some meta data that is now available
    templateDefinition.dir = path.basename(dir)
    return templateDefinition

module.exports = new NotaHelper()
fs = require('fs')
_  = require('underscore')._
# Utility class to help it with common filesystem and template/data related questiosn
class NotaHelper
  @isFile: ( path ) ->
    fs.existsSync(path) and fs.statSync(path).isFile()

  @isDirectory: ( path ) ->
    fs.existsSync(path) and fs.statSync(path).isDirectory()

  @isData: ( path ) ->
    @isFile(path)

  @isTemplate: ( path ) ->
    @isDirectory(path)

  @getTemplatesIndex: ( templatesPath ) ->
    if not fs.existsSync(templatesPath)
      throw Error("Templates path '#{templatesPath}' doesn't exist.")

    # Get an array of filenames (excluding '.' and '..')
    templateDirs = fs.readdirSync(templatesPath)
    # Filter out all the directories
    templateDirs = _.filter templateDirs, (dir)->
      fs.statSync(templatesPath+'/'+dir).isDirectory()

    index = {}

    for dir in templateDirs
      # Get the template definition
      isDefined = fs.existsSync(templatesPath+"/#{dir}/bower.json")

      if not isDefined
        templateDefinition =
          # Default it's name to it's directory name in absence of an 'official
          # statement' so we at least have some unique identifier.
          name: dir
          definition: 'not found'
      else
        definitionPath = templatesPath+"/#{dir}/bower.json"
        templateDefinition = JSON.parse fs.readFileSync definitionPath
        templateDefinition.definition = 'read'
        # TODO: check template definition against scheme for reuiqre properties
        # (and throw warnings otherwise) and set .defintion = 'valid' if sufficient

      # Check requirements for tempalte
      if not fs.existsSync("templates/"+dir+"/template.html")
        console.warn "Template #{templateDefinition.name} has no mandatory
        'template.html' file (omitting)"
        continue

      # Supplement the definition with some meta data that is now available
      templateDefinition.dir = dir
      # Save the definition in the index with it's name as the key
      index[templateDefinition.name] = templateDefinition

    # We're done here
    return index

module.exports = NotaHelper
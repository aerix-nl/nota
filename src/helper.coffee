fs            = require('fs')
_             = require('underscore')._
EventEmitter2 = require('eventemitter2').EventEmitter2

# Utility class to help it with common filesystem and template/data related questiosn
class NotaHelper extends EventEmitter2

  constructor: ( )->

  isFile: ( path ) ->
    fs.existsSync(path) and fs.statSync(path).isFile()

  isDirectory: ( path ) ->
    fs.existsSync(path) and fs.statSync(path).isDirectory()

  isData: ( path ) ->
    @isFile(path)

  isTemplate: ( path ) ->
    @isDirectory(path)

  getTemplatesIndex: ( templatesPath ) ->
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
        warningMsg = "Template %m#{templateDefinition.name}%N has no mandatory
        template.html file %K(omitting template)"
        @emit "warning", warningMsg
        continue

      # Supplement the definition with some meta data that is now available
      templateDefinition.dir = dir
      # Save the definition in the index with it's name as the key
      index[templateDefinition.name] = templateDefinition
    # We're done here
    return index

helper = new NotaHelper()
module.exports = helper
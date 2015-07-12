Path = require('path')

module.exports = class Nota
  @Server:            require( Path.join __dirname, 'server' )
  @JobQueue:          require( Path.join __dirname, 'queue' )
  @TemplateHelper:    require( Path.join __dirname, 'template_helper' )

  # Load the (default) configuration
  @defaults:          require( Path.join __dirname, '../config-default.json' )

  # Load the package definition so we may know ourselves (version etc.)
  @meta:              require( Path.join __dirname, '../package.json' )

  constructor: ->


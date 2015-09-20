chalk         = require('chalk')

module.exports = class LogginChannels

  # Some strings that go before all logChannels (server origin and client origin respectively)
  prefixes:
    nota:     chalk.gray('nota ')
    template: chalk.gray('template ')

  constructor: ( @options, prefixes )->
    if prefixes? then @prefixes = prefixes

  # Server origin logging channels
  log: ( msg )=>
    console.log       @prefixes.nota + msg

  logWarning: ( warningMsg )=>
    console.warn      @prefixes.nota + chalk.bgYellow.black('WARNG') + ' ' + warningMsg

  logError: ( err )=>
    console.error     @prefixes.nota + chalk.bgRed.black('ERROR') + ' ' + err
    if err instanceof Error
      console.error     @prefixes.nota + chalk.gray(err.stack)

  logEvent: ( event )=>
    console.info      @prefixes.nota + chalk.bgBlue.black('EVENT') + ' ' + event

  # Client origin logging channels
  logClient: ( msg )=>
    console.log       @prefixes.template + msg

  logClientError: ( msg )=>
    console.error     @prefixes.template + chalk.bgRed.black('ERROR') + ' ' + msg

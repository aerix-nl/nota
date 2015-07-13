chalk         = require('chalk')

module.exports = class LogginChannels

  # Some strings that go before all logChannels (server origin and client origin respectively)
  prefixes:
    nota:     chalk.gray('nota ')
    tempalte: chalk.gray('template ')

  constructor: (@options, prefixes )->
    if prefixes? then @prefixes = prefixes

  # Server origin logging channels
  log: ( msg )=>
    console.log       @prefixes.nota + msg

  logWarning: ( warningMsg )=>
    console.warn      @prefixes.nota + chalk.bgYellow.black('WARNG') + ' ' + warningMsg

  logError: ( errorMsg )=>
    console.error     @prefixes.nota + chalk.bgRed.black('ERROR') + ' ' + errorMsg
    if @options?.verbose and errorMsg.toSource?
      console.error   @prefixes.nota + errorMsg.toSource()

  logEvent: ( event )=>
    console.info      @prefixes.nota + chalk.bgBlue.black('EVENT') + ' ' + event

  # Client origin logging channels
  logClient: ( msg )=>
    console.log       @prefixes.template + msg

  logClientError: ( msg )=>
    console.error     @prefixes.template + chalk.bgRed.black('ERROR') + ' ' + msg

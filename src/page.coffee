fs           = require('fs')
Q            = require('q')
phantom      = require('phantom')
_            = require('underscore')._
EventEmitter = require('events').EventEmitter

class Page extends EventEmitter

  dependencies: [
    'vendor/jquery/jquery.js'
    'vendor/rivets/dist/rivets.js'
    'vendor/underscore/underscore.js'
    'lib/client.js'
  ]

  constructor: ( @serverAddress, @serverPort, @data ) ->
    @serverUrl = "http://#{@serverAddress}:#{@serverPort}"

    phantom.create ( @phantomInstance ) =>

      phantomInstance.createPage ( @page ) =>
        @page.set 'paperSize',
          format: 'A4'
          orientation: 'portrait'
          border: '0cm'

        # Create callbacks
        @page.onConsoleMessage  ( msg ) => console.log   msg
        @page.set 'onError',    ( msg ) => console.error msg
        @page.set 'onCallback', ( msg ) => @emit(msg)

        @page.open @serverUrl, ( status ) =>

          if status is 'success'
            @injectDependencies().then ( ) =>
              @injectData()
              @page.render 'output.pdf', ( ) =>
                @phantomInstance.exit()
                @emit 'render'

          else
            console.error "Unable to load page: #{status}"
            @phantomInstance.exit()
            @emit 'fail'

  injectDependencies: ( ) ->
    dependencies = @dependencies.slice(0)
    deferred = Q.defer()

    inject = ( src ) ->
      body = document.getElementsByTagName('body')[0]
      script = document.createElement('script')
      script.type = 'text/javascript'
      script.src = src
      script.onload = ( ) -> window.callPhantom "nota:load:#{src}"
      body.appendChild(script)

    injectNext = ( ) =>
      if dependencies.length is 0
        deferred.resolve()
        return

      dependency = dependencies.shift()
      console.log "injecting #{dependency}"
      @page.evaluate inject, null, dependency
      @once "nota:load:#{dependency}", injectNext

    injectNext()
    return deferred.promise

  injectData: ( ) ->

    inject = ( data ) ->
      Nota.addData(data)

    @page.evaluate inject, null, @data

module.exports = Page


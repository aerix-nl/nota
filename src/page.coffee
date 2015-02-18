fs            = require('fs')
Q             = require('q')
phantom       = require('phantom')
_             = require('underscore')._
EventEmitter2 = require('eventemitter2').EventEmitter2

# This class is basically a wrapper of a PhantomJS instance
class Page extends EventEmitter2

  # This signifies whether the template has signaled Nota client
  # that it finished rendering and is ready for capture
  rendered: false

  constructor: ( options ) ->
    { @serverAddress, @serverPort, @outputPath, @defaultFilename, @initData } = options
    @serverUrl = "http://#{@serverAddress}:#{@serverPort}"

    phantom.create ( @phantomInstance ) =>

      @emit "init"

      phantomInstance.createPage ( @page ) =>
        # TODO: Get this stuff from the template definition (extend bower.json?)
        @page.set 'paperSize',
          format: 'A4'
          orientation: 'portrait'
          border: '0cm'

        # Create callbacks
        @page.onConsoleMessage  ( msg ) => console.log   msg
        @page.set 'onError',    ( msg ) => console.error msg
        # Prefix all messages so server can distinguish between server and client messages
        @page.set 'onCallback', ( msg ) => @emit("client:#{msg}")

        @page.open @serverUrl, ( status ) =>

          if status is 'success'
            @emit 'opened'

            @on 'client:template:loaded', -> 
              # For single capture jobs we immediately inject the data
              if @initData? then @injectData()

            @on 'client:template:render:done', ->
              @rendered = true
              @emit 'ready'

          else
            throw new Error "Unable to load page: #{status}"
            @phantomInstance.exit()
            @emit 'fail'

  isDir: (path)->
    fs.existsSync(path) and fs.statSync(path).isDirectory()

  fileExists: (path)->
    fs.existsSync(path) and fs.statSync(path).isFile()

  capture: (options = {})->
    @emit 'capture:init'
    @page.evaluate (-> Nota.getDocumentMeta()), (meta = {})=>
      if @isDir(@outputPath) and meta.filesystemName?
        @outputPath = @outputPath + meta.filesystemName
        meta.filesystemName = @outputPath # And update the filesystem name

      if @fileExists(@outputPath)
        # TODO: implement --preserve CLI switch to not overwrite and exit here
        @emit 'capture:overwrite', @outputPath

      # Unless explicitly defined the clientside (actually template) preference
      # takes precedence over the default filename in the absence of any more 
      # meaningful filename.
      if not @outputPath? then @outputPath = meta.filesystemName || @defaultFilename
      meta.filesystemName = @outputPath

      # This is where the real PDF making magic happens. Credits to PhantomJS
      @page.render @outputPath, ( ) =>
        @emit 'capture:done', meta

  injectClient: ->
    body = document.getElementsByTagName('body')[0]
    script = document.createElement('script')
    script.type = 'text/javascript'
    script.src = '/vendor/requirejs/require.js'
    script.setAttribute( 'data-main', "/lib/client-main" )
    script.onload = ( ) -> window.callPhantom "client:onload"
    body.appendChild(script)

  injectData: (data)->
    if data? then @initData = data
    @rendered = false
    inject = (data)->
      Nota.injectData(data)
    @page.evaluate inject, null, @initData

  close: ->
    @page.close()
    @phantomInstance.exit()

module.exports = Page


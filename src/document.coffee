fs            = require('fs')
Q             = require('q')
phantom       = require('phantom')
_             = require('underscore')._
EventEmitter2 = require('eventemitter2').EventEmitter2

# This class is basically a wrapper of a PhantomJS instance
class Document extends EventEmitter2

  # This signifies whether the template has signaled Nota client
  # that it finished rendering and is ready for capture
  defaults:
    paperSize:
      format:      'A4'
      orientation: 'portrait'
      border:      '0cm'

  timeout: 500

  constructor: ( @server ) ->
    phantom.create ( @phantomInstance ) =>
      phantomInstance.createPage ( @page ) =>
        # Keep track of resources
        @counter = []
        @timer = null

        # TODO: Get this stuff from the template definition (extend bower.json?)
        @page.set 'paperSize', @defaults.paperSize

        @page.onConsoleMessage  ( msg ) => console.log   msg
        @page.set 'onError',    ( msg ) => console.error msg
        @page.set 'onCallback', ( msg ) => @emit("client:#{msg}")
        @page.set 'onResourceRequested', @onResourceRequested
        @page.set 'onResourceReceived',  @onResourceReceived

        @emit "document:ready"

  render: ( outputPath, callback, options = {} ) ->
    doRender = =>
      @emit "render:init"

      @page.open @server.url(), ( status ) =>
        @emit "page:init"

        if status is 'success' then @once "page:ready", =>
          @page.render outputPath, callback
        else throw new Error "Unable to load page: #{status}"

    unless @page?
      @once "document:ready", doRender
    else doRender()

  onResourceRequested: ( request ) =>
    @emit "page:resource:requested"
    if @counter.indexOf(request.id) == -1
      @counter.push(request.id)
      clearTimeout(@timer)

  onResourceReceived: ( resource ) =>
    @emit "page:resource:received"
    return if resource.stage isnt "end" and not resource.redirectURL?
    return if (i = @counter.indexOf resource.id) is -1

    @counter.splice(i, 1);

    if @counter.length is 0
      @timer = setTimeout =>
        @emit "page:ready"
      , @timeout

  close: ->
    @page.close()
    @phantomInstance.exit()

module.exports = Document


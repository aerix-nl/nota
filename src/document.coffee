fs            = require('fs')
Q             = require('q')
phantom       = require('phantom')
_             = require('underscore')._
Backbone      = require('backbone')

# This class is basically a wrapper of a PhantomJS instance
class Document

  timeout: 1500

  constructor: ( @server, @options ) ->
    _.extend(@, Backbone.Events)

    phantom.create ( @phantomInstance ) =>
      phantomInstance.createPage ( @page ) =>
        # Keep track of resources
        @counter = []
        @timer = null

        # TODO: Get this stuff from the template definition (extend bower.json?)
        @page.set 'paperSize', @options.paperSize

        @page.onConsoleMessage  ( msg ) -> console.log   msg
        @page.set 'onError',    ( msg ) -> console.error msg
        @page.set 'onCallback', ( msg ) => @trigger("client:#{msg}")
        @page.set 'onResourceRequested', @onResourceRequested
        @page.set 'onResourceReceived',  @onResourceReceived

        @trigger 'document:ready'
        # @page.open @server.url(), ( status ) =>
        #   @trigger "page:init"

        #   if status is 'success' then @once "page:ready", =>
        #     @page.render outputPath, callback
        #   else throw new Error "Unable to load page: #{status}"

  render: ( outputPath, callback, options = {} ) ->
    doRender = =>
      @trigger "render:init"

      @page.open @server.url(), ( status ) =>
        @trigger "page:init"

        if status is 'success' then @once "page:ready", =>
          @page.render outputPath, callback
        else throw new Error "Unable to load page: #{status}"

    unless @page?
      @once "document:ready", doRender
    else doRender()

  onResourceRequested: ( request ) =>
    @trigger "page:resource:requested"
    if @counter.indexOf(request.id) == -1
      @counter.push(request.id)
      clearTimeout(@timer)

  onResourceReceived: ( resource ) =>
    @trigger "page:resource:received"
    return if resource.stage isnt "end" and not resource.redirectURL?
    return if (i = @counter.indexOf resource.id) is -1

    @counter.splice(i, 1)

    if @counter.length is 0
      @timer = setTimeout =>
        @trigger "page:ready"
      , @timeout

  close: ->
    @page.close()
    @phantomInstance.exit()

module.exports = Document


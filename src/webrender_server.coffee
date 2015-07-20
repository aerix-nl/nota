mkdirp     = require('mkdirp')
bodyParser = require('body-parser')
Handlebars = require('handlebars')
chalk      = require('chalk')
tmp        = require('tmp')
Q          = require('q')
fs         = require('fs')

TemplateHelper = require('./template_helper')

module.exports = class Webrender

  constructor: ( @options, @logging )->
    { @serverAddress, @serverPort } = @options

    @helper = new TemplateHelper( @logging )

    # PhantomJS page renderBase64 isn't available for PDF, so we can't render
    # to memory and buffer it there before sending it over to the client. So
    # we need somewhere on the filesystem to park it, a sort of webrender temp
    # dir, and then upload that file with the response. We need to be able to
    # create this dir to continue.
    @webrenderCache = tmp.dirSync()

  url: =>
    "http://#{@serverAddress}:#{@serverPort}/render"

  # Set Express middlewarez and bind to routes
  bind: (@expressApp)->
    # For parsing request bodies to 'application/json'
    @expressApp.use bodyParser.json()
    # For parsing request bodies to 'application/x-www-form-urlencoded'
    @expressApp.use bodyParser.urlencoded extended: true

    @expressApp.post '/render', @webrender
    @expressApp.get  '/render', @webrenderInterface

  # Start listening for HTTP render requests
  start: ->
    @logging.log? "Listening at #{ chalk.cyan @url() } for POST requests"

    # For convenience try to do a local and external IP lookup (LAN and WAN)
    if @options.logging.webrenderAddress then @ipLookups().then (@ip)=>
      if @ip.lan? then @logging.log? "LAN address: " + chalk.cyan "http://#{ip.lan}:#{@serverPort}/render"
      if @ip.wan? then @logging.log? "WAN address: " + chalk.cyan "http://#{ip.wan}:#{@serverPort}/render"

    .catch (err)=>
      # Don't log whatever error gets caught here as an error, because the LAN
      # and WAN IP lookups where are purely a convenience and optional.
      @logging.log? err

    html = fs.readFileSync( "#{__dirname}/../assets/webrender.html" , encoding: 'utf8')
    @webrenderTemplate = Handlebars.compile html


  ipLookups: ->
    deferred = Q.defer()

    timeout = 8000
    local   = @ipLookupLocal()
    ext     = @ipLookupExt()
    reject  = ->
      # If it's time to reject we see if any of both lookups has finished
      # and provide that (harvest what you can so to say).
      if local.inspect().status is "fulfilled"
        return deferred.resolve lan: local.inspect().value
      if ext.inspect().status   is "fulfilled"
        return deferred.resolve wan: ext.inspect().value
      # If we got here we got nothing ...
      deferred.reject "LAN and WAN IP lookup canceled after timeout of #{timeout}ms"

    # We give the lookup 2 seconds to keep the CLI command responsive
    setTimeout reject, timeout

    # If we're not yet rejected and both resolved, we provide both IP addresses
    local.then (localIp)-> ext.then (extIp)->
      deferred.resolve {
        lan: localIp
        wan: extIp
      }

    deferred.promise

  ipLookupLocal: ->
    deferred = Q.defer()

    require('dns').lookup require('os').hostname(), (errLan, ipLan, fam)=>
      if errLan? then return deferred.reject errLan
      deferred.resolve ipLan

    deferred.promise

  ipLookupExt: ->
    deferred = Q.defer()

    require('externalip') (errExt, ipExt)=>
      if errExt? then return deferred.reject errExt
      deferred.resolve ipExt

    deferred.promise

  setTemplate: (@template)->

  webrenderInterface: (req, res)=>
    console.log @template
    webrenderHTML = @webrenderTemplate({
      template:     @helper.getTemplateDefinition @template.path
      serverPort:   @serverPort
      ip:           @ip
    })

    res.send webrenderHTML

  webrender: (req, res)=>
    if not @reqPreconditions(req, res) then return

    # We got the data and we're ready to give it a try
    job = {
      data:         req.body.data
      outputPath:   @webrenderCache.name
    }

    @queue(job).then (meta)->
      if meta[0].fail?
        res.status(500).send "An error occured while rendering: #{meta[0].fail}"
      else
        pdf = Path.resolve meta[0].outputPath
        res.download pdf

  reqPreconditions: (req, res)->
    if not req.body.data?
      res.status(400).send("The <code>data</code> field of the request was undefined. Please
      provide a template model instance that you'd like to render into your template. See the <a
      href='/render#rest-api'>REST-API documentation</a> of the webrender service.").end()
      return false
    else if typeof req.body.data is 'string'
      try
        req.body.data = JSON.parse req.body.data
      catch e
        res.status(400).send("Could not parse data string. Server expects a JSON string as the data
        field. Error: #{e}").end()
        return false

    if req.body.data is {}
      res.status(400).send("Empty data object received")
      return false

    return true

  close: ->
    @webrenderCache.removeCallback()

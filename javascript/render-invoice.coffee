# This script is to be called from the CLI with PhantomJS
phantom = require 'phantom'
#system = require('system')
fs = require('fs')

model = eval fs.readFileSync('javascript/test-data.js', encoding: 'utf8')

templateFilename = 'templates/example-aerix/invoice.html' #system.args[1];
outputFilename = 'invoice.pdf' #system.args[2];

phantom.create (phantomInstance) ->
  phantomInstance.createPage (page) ->
    if error?
      console.error "Unable to start PhantomJS instance: #{error}"
      phantomInstance.exit()
    page.set 'paperSize',
      format: 'A4'
      orientation: 'portrait'
      border: '0cm'
    page.set 'onConsoleMessage', (msg)-> console.log   msg
    page.set 'onError',          (msg)-> console.error msg
     
    page.set 'onCallback', (call)->
      switch call
        when 'nota:ready'
          console.log "Nota client finished booting"
          console.log "Calling client with new invoice model to render"
          page.evaluate ( (model)-> @Nota.update model ), (->), model
        when 'nota:updated'
          console.log "Nota client finished rendering new data to DOM"
          phantomRenderPDF()

    # A callback that will do the actual export to .PDF if everything went OK
    phantomRenderPDF = (status)->
      console.log "Nota server started .PDF generation job"
      page.render outputFilename, ->
        console.log "Nota server finished rendering .PDF, exiting PhantomJS thread"
        phantomInstance.exit()

    # A callback for when PhantomJS went through DOM init (hopefully post-DOM-ready event)
    # This will start rendering
    pageLoaded = (status)->
      if status is 'success'
        console.log "Invoice template loaded, waiting for Nota client to finish booting"
        # We sit idle ... Nota will call back up to us when it is ready booting
      else
        console.error "Unable to load HMTL: #{status}"
        phantomInstance.exit()

    # The one call that sets the loading of the HTML in motion
    page.open templateFilename, pageLoaded


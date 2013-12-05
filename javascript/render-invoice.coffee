_       = require '../bower_components/underscore/underscore'
phantom = require 'phantom'
fs      = require 'fs'
argv    = require('optimist').argv

template = argv.template
# A template name must have been provided, unless we're just gonna list them
unless template? or argv.list?
  console.log "No template selected. Use --template 'name' for this."
  return

templateDirs = fs.readdirSync('templates')
templateDirs = _.filter templateDirs, (dir)-> fs.statSync('templates/'+dir).isDirectory()

templates = {}
for dir in templateDirs
  if not fs.existsSync("templates/"+dir+"/template.html")
    console.log "Template directory has no mandatory 'template.html' file"
    continue 
  definitionFile = fs.existsSync("templates/"+dir+"/javascript/define-template.json")
  if not definitionFile
    console.log "Template without definition found: #{dir} (omitting)"
    continue
  t = JSON.parse fs.readFileSync 'templates/'+dir+'/javascript/define-template.json'
  t.dir = dir
  templates[t.name] = t

if argv.list?
  console.log tenplateName for tenplateName in _.keys templates
  return

unless templates[template]?
  console.error "Selected template doesn't exist"
  return

# Beyond this point we got our template
template = templates[template]

previewJSON = if template.previewJSON.slice(0,5) is "text!" then template.previewJSON.slice 5
JSONpath = argv.json || "templates/#{template.dir}/javascript/#{previewJSON}"
model = JSON.parse fs.readFileSync(JSONpath, encoding: 'utf8')

templateHTML = "templates/#{template.dir}/template.html"

argumentedFilename = argv.output
defaultFilename = 'invoice.pdf'
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
          # Check if the client presents a preferred filename
          page.evaluate ( -> @Nota.view.filesystemName?() ), phantomRenderPDF

    # A callback that will do the actual export to .PDF if everything went OK
    phantomRenderPDF = (proposedFilename)-> 
      usefulFilename = proposedFilename? and proposedFilename.length > 0
      
      # Now we can decide which filename we shall use
      outputFilename = defaultFilename # By defauly we go for this one
      if usefulFilename # But if the template proposed something useful use that
        outputFilename = proposedFilename
      if argv.output? # But always override it if a filename was specified in the arguments
        outputFilename = argumentedFilename

      console.log "Nota server started .PDF generation job"
      page.render outputFilename, ->
        console.log "Nota server finished rendering .PDF, exiting PhantomJS thread"
        phantomInstance.exit()
        if fs.existsSync(outputFilename)
          console.log "Nota server verified the writing of file:"
          console.log "\t#{outputFilename}"
          console.log "Nota server thread will now exit"
        else
          console.error "Nota expected the output file to be found now. Something went wrong!"

    # A callback for when PhantomJS went through DOM init (hopefully post-DOM-ready event)
    # This will start rendering
    pageLoadedCallback = (status)->
      if status is 'success'
        console.log "Invoice template loaded, waiting for Nota client to finish booting"
        # We sit idle ... Nota will call back up to us when it is ready booting
      else
        console.error "Unable to load HMTL: #{status}"
        phantomInstance.exit()

    # The one call that sets everything in motion
    page.open templateHTML, pageLoadedCallback


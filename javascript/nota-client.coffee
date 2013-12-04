# Init namespace
@Nota =
  # Probe for the existence of PhantomJS ... signs that we're running in a simulation
  phantomRuntime: window._phantom?
  
  init: (options)->
    if options.withTemplate?
      @setTemplate options.withTemplate
      if options.withData?
        @update(options.withData)
      else if not @phantomRuntime
        # If PhantomJS is not present it's nice to have preview JSON (if
        # PhantomJS is present the page will sit and wait for a call from
        # 'above'), but if that is not present with the new template, show a
        # warning about it to the developing/previewing user.
        alert("no test data")
    else console.log "Nota client initializing with no view"
    if @phantomRuntime then window.callPhantom 'nota:ready'
    @

  setTemplate: (template)->
    @currentTemplate = template
    @view = new @currentTemplate.view()
    
  
  # Returns true on successful update, false on failure
  update: (modelJSON)->
    if not @currentTemplate? then console.error "Can't update without template set yet"
    try
      @view.setModel (new @currentTemplate.model modelJSON), false
    catch error
      console.error "Model did not validate: #{error}"
      return false
    @view.render()
    if @phantomRuntime then window.callPhantom 'nota:updated'
    return true
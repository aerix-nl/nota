# Init namespace
@Nota =
  # This is the namespace where you should append your template class, and Nota will use it as an index
  Templates: {}
  # Probe for the existence of PhantomJS ... signs that we're running in a simulation
  phantomRuntime: window._phantom?
  
  init: (options)->
    if options.withTemplate?
      @currentTemplate = options.withTemplate
      @initView()
    else
      # Initializing with no view

    # If PhantomJS is not present we load the defaults, else the page will sit and wiat for a call from 'above'
    @update(options.withData) unless @phantomRuntime
    if @phantomRuntime then window.callPhantom 'nota:ready'
    @

  initView: ->
    @view = new Nota.Templates[@currentTemplate].View()
    @
  
  # Returns true on successful update, false on failure
  update: (testJSON)->
    try
      @view.setModel (new Nota.Templates[@currentTemplate].Model testJSON), false
    catch error
      console.error "Model did not validate: #{error}"
      return false
    @view.render()
    if @phantomRuntime then window.callPhantom 'nota:updated'
    return true
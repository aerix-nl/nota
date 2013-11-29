_.extend @Nota,

  init: (options)->
    # Get the name of the current template from the DOM, which allows for automatically loading the corresponding
    # classes when opening a template from the filesystem as a .HTML file.
    template = $("head meta[name='nota-template-name']").attr("content")
    if template? then @currentTemplate = template
    # TODO: Make this prettier using Bootstrap
    else alert("This template doesn't seem to specifcy it's name in a meta tag in the header. Canceling JSON rendering preview.")

    # Now let's start
    @initView()
    # If PhantomJS is not present we load the defaults, else the page will sit and wiat for a call from 'above'
    @update(options.withModel) unless @phantomRuntime
    if @phantomRuntime then window.callPhantom 'nota:ready'

  initView: ->
    TemplateViewClass = Nota.Templates[@currentTemplate+'InvoiceView']
    @view = new TemplateViewClass()
  
  # Returns true on successful update, false on failure
  update: (model)->
    TemplateModelClass = Nota.Templates[@currentTemplate+'InvoiceModel']
    try
      @view.setModel (new TemplateModelClass model), false
    catch error
      cause = "Model did not validate: #{error}"
      if callback? then callback cause else
        console.error cause
        return false
    @view.render()
    if @phantomRuntime then window.callPhantom 'nota:updated'
    return true
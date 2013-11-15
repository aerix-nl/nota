@Nota = _.extend @Nota,

  initView: ()->
    @view = new Nota.InvoiceView()
  
  # Returns true on successful update, false on failure
  update: (model)->
    try
      @view.setModel (new Nota.Templates.AerixInvoiceModel model), false
    catch error
      cause = "Model did not validate: #{error}"
      if callback? then callback cause else
        console.error cause
        return false
    @view.render()
    if @phantomRuntime then window.callPhantom 'nota:updated'
    return true
define ['nota-client', 'nota-view'], (Nota)-> class Nota.Templates.Aerix.View extends Nota.CoreView
  # Used for the html head title element
  documentName: -> 'Invoice '+@getFullID()

  filesystemName: ->
    customer = @model.get("client").organization
    customer = customer || @model.get("client").contactPerson
    customer = customer.replace /\s/g, '-' # Spaces to dashes using regex
    project = @model.get("projectName")
    if project?
      project = project.replace /\s/g, '-' # Spaces to dashes using regex
      "#{@getFullID()}_#{customer}_#{project}.pdf"
    else
      "#{@getFullID()}_#{customer}.pdf"

  getFullID: ->
    date = new Date(@model.get('meta').date)
    date.getUTCFullYear()+'.'+_.str.pad(@model.get('meta').id.toString(), 4, '0')

  # Pretty much everything apart from the table
  _renderInvoiceDetails: ->
    directives = 
      vatPercentage: =>
        @model.get("vatPercentage")*100
      companyFullname: =>
        origin = @model.get('origin') 
        origin.companyName+' '+origin.companyLawform

    @_mapObjToDOM @model.attributes, @$el, directives, false
    
    @_mapObjToDOM @model.get("client"), @$('p#client-block')
    @_mapObjToDOM @model.get("origin"), @$('div.company-info, span#retour-line, footer')
    
    date = new Date(@model.get('meta').date)
    
    @$('#invoice-id').html @getFullID()
    $("html head title").html @documentName()

    monthNames = [ "januari", "feruari", "maart", "april", "mei", "juni",
        "juli", "augustus", "september", "october", "november", "december" ]
    month = monthNames[date.getMonth()]
    year = date.getUTCFullYear()
    day = date.getUTCDate()
    # Next step might seem overkill, but think of peculiar cases like end of the year flips
    date.setUTCDate day + @model.get('validityPeriod')
    validMonth = monthNames[date.getMonth()]
    validYear = date.getUTCFullYear()
    validDay = date.getUTCDate()
    @_mapObjToDOM
      invoiceDate: "#{year} #{month} #{day}"
      expirationDate: "#{validYear} #{validMonth} #{validDay}"
      reminderDate: "#{validDay} #{validMonth} #{validYear} "
    @

  _renderInvoiceTable: ->
    $itemPrototype = $(@$("div#invoice-body table tbody tr.item")[0]).clone()
    @$('div#invoice-body table tbody').empty()
    for index, itemObj of @model.get("invoiceItems")
      $row = $itemPrototype.clone()
      itemObj.subtotal = @model.itemSubtotal(itemObj)
      @_mapObjToDOM itemObj, $row
      @$("div#invoice-body table tbody").append $row
    # Table footer part
    footerAggregate = {}
    footerAggregate.subTotal = @model.subTotal()
    footerAggregate.vat = @model.VAT(footerAggregate.subTotal)
    footerAggregate.total = footerAggregate.subtotal + footerAggregate.vat
    @_mapObjToDOM footerAggregate, @$("div#invoice-body table tfoot")
    @
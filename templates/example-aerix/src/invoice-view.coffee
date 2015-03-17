# @cjsx React.DOM

define ['/nota.js', 'underscore.string', 'jed'], (Nota, s, Jed)->

  class TemplateApp.InvoiceView extends Backbone.View
    el: "body"

    initialize: ->
      _.extend(@, Backbone.Events)
      @setElement $("body") # Set root element
      @model.on 'change', @render, @
      @i18n = new Jed
        "missing_key_callback": (key)-> console.error "Missing key in i18n: #{key}"

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

    documentMeta: ->
      'id': @getFullID()
      'documentName': @documentName()
      'filesystemName': @filesystemName()

    getFullID: ->
      date = new Date(@model.get('meta').date)
      date.getUTCFullYear()+'.'+s.pad(@model.get('meta').id.toString(), 4, '0')

    render: (options)->
      @trigger 'render:start'
      #@el.style.opacity = 0.5

      partial = options?.partial
      # Render part of the view
      if partial? then @[ '_render'+s.capitalize partial ].call(@)
      # Or just everything
      else
        fns = _.filter _.functions(@), (fnName)-> s.startsWith fnName, '_render'
        @[renderFnName].call(@) for index, renderFnName of fns
      
      # Take all links and bin the text node because during PDF rendering of
      # modern browser engines, the text node is suffixed with the 'href'
      # attribute, rendering a link like <a href="http://www.aerix.nl">Aerix</a> into this:
      #
      #   <a href="http://www.aerix.nl">Aerix(http://www.aerix.nl)</a>
      #
      # By removing the text node we can sort of counter this. A better method
      # (like a directive for the engine to prevent it from doing this in the
      # first place) is needed.
      if Nota.phantomRuntime then $('a').html ''
      


      #@el.style.opacity = 1
      @trigger 'render:done'
      @

    # Pretty much everything apart from the table
    _renderInvoiceDetails: ->
      directives =
        vatPercentage: =>
          @model.get("vatPercentage")*100
        companyFullname: =>
          origin = @model.get('origin')
          origin.companyName+' '+origin.companyLawform
        clientString: =>
          @model.get("client").contactPerson || @model.get("client").organization

      # Do a 'shallow' render of the model. Meaning only direct attributes, not
      # nested ones like the invoice items, because those require more complex
      # rendering. Most first order attribues are quite simple in this case.
      @_mapObjToDOM @model.attributes, null, directives, false
      
      @_mapObjToDOM @model.get("client"), @$('p#client-block')
      @_mapObjToDOM @model.get("origin"), @$('div.company-info, span#retour-line, footer, span#closing')
      
      date = new Date(@model.get('meta').date)
      
      @$('#invoice-id').html @getFullID()
      $("html head title").html @documentName()

      # [ "January", "February", "March", "April", "May", "June", "July",
      # "August", "September", "October", "November", "December" ]
      monthNames = [ "januari", "februari", "maart", "april", "mei", "juni",
      "juli", "augustus", "september", "oktober", "november", "december" ]
      month = monthNames[date.getMonth()]
      year = date.getUTCFullYear()
      day = date.getUTCDate()
      # Next step might seem overkill, but think of peculiar cases like end of the year flips
      date.setUTCDate day + @model.get('validityPeriod')
      validMonth = monthNames[date.getMonth()]
      validYear = date.getUTCFullYear()
      validDay = date.getUTCDate()
      @_mapObjToDOM
        invoiceDate: "#{day} #{month} #{year}"
        expirationDate: "#{validDay} #{validMonth} #{validYear}"

      @_pluralize itemCount: @model.get("invoiceItems").length

      @$('span#closing b.total').html @_formatCurrency @model.invoiceTotal()
      @$('span#closing b.invoice-id').html @getFullID()
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
      footerAggregate.subtotal = @model.invoiceSubtotal()
      footerAggregate.vat = @model.VAT(footerAggregate.subtotal)
      footerAggregate.total = footerAggregate.subtotal + footerAggregate.vat
      @_mapObjToDOM footerAggregate, @$("div#invoice-body table tfoot")
      @

    # Precondition: value must be a number, and the model must have a currency symbol defined
    _formatCurrency: (value)->
      # Which symbol to use to separate the integer part of the number from the fraction part, e.g. 0,5 or 0.5
      fractionSeparator = @model.fractionSeparator or ','
      # By default render numbers with 2 decimal places behind the dot, e.g. 2/3 = 6.6667 with 4 places
      decimalPlaces = @model.decimalPlaces || 2
      roundingBase = Math.pow(10,decimalPlaces)
      roundedValue = Math.round(value*roundingBase)/roundingBase
      [integer, fraction] = roundedValue.toString().split('.')
      fraction = s.pad(fraction, decimalPlaces, '0', 'right')
      currency = @model.get("currencySymbol")
      currencySeparator = @model.get("currencySeparator") || ' '
      return currency+currencySeparator+integer+fractionSeparator+fraction

    # Naive method for mapping most values to the DOM ... never mind Transparency, this does 99% of it
    _mapObjToDOM: (obj, domScope = @$el, directives, recursive)->
      # Assume we may dig recursively if the domScope is specific, except when it's specified expliciticly (override)
      unless recursive? then recursive = domScope isnt @$el
      # Merge directives with object, but don't touch obj because someone else might need it in it's original state. Instead we make a copy
      obj = _.extend {}, obj, directives
      for key in _.keys(obj)
        # Find matches based on ID or classname (mapping goes on the 'dasherization-principle', lol)
        $matches = $('.'+ s.dasherize(key)+', '+'#'+ s.dasherize(key), domScope)
        if not $matches.length > 0 then continue # Then don't bother
        if Object.prototype.toString.call(key[obj]) is "[object Object]" and recursive
          @_mapObjToDOM(obj[key], domScope, directives)
        else
          for el in $matches
            value = obj[key]
            $el = $(el)
            # If the value leads to a function, evaluate it and use it's return value
            if Object.prototype.toString.call(obj[key]) is "[object Function]"
              value = value($el)
            if $el.attr("data-currency")? then $el.html @_formatCurrency value else $el.html value
    
    _pluralize: (obj, domScope = @$el)->
      for key in _.keys(obj)
        # Find matches based on data-pluralize attribute (mapping goes on the 'dasherization-principle', lol)
        $matches = $("[data-pluralize='#{s.dasherize(key)}']", domScope)
        if not $matches.length > 0 then continue # Then don't bother
        count = obj[key] # This should be an integer, usually 0, 1, 2 or 'more'
        for el in $matches
          $el = $(el)
          # All the children within the match should be of structure that they have children with
          # the data-pluralize attribute, that says when they are selected (at what count/input size)
          pluralizedForm = $("[data-pluralize='#{count}']", $el)
          # There should be (usually) one match now, which we'll show, and hide the rest
          if not pluralizedForm.length > 0
            # Else we'll check if there are 'catch' cases provided for this unhandled input sizes
            catchPositive  = $("[data-pluralize='+']", $el)
            catchNegative  = $("[data-pluralize='-']", $el)
            catchArbitrary = $("[data-pluralize='*']", $el)
            if      count > 0 and catchPositive.length > 0 then pluralizedForm = catchPositive
            else if count < 0 and catchNegative.length > 0 then pluralizedForm = catchNegative
            else if              catchArbitrary.length > 0 then pluralizedForm = catchArbitrary
            else
              console.error "Trying to pluralize string for input of size #{count}, but no resolving element was found in:"
              console.error $el
          # So right now we should have found at least one match for the right pluralized form  
          $el.children().hide()
          $(pluralizedForm).show()
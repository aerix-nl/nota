class Nota.InvoiceView extends Backbone.View
  initialize: ->
    @setElement $("body") # Set root element

  setModel: (model, render = true)->
    model.validate()
    @model = model
    @model.on 'change', @render, @
    @render() if render

  render: (partial)->
    # Render part of the view
    if partial? then @['_render'+_.str.capitalize partial ].call(@)
    # Or just everything
    else
      fns = _.filter _.functions(@), (fnName)-> _.str.startsWith fnName, '_render'
      @[renderFnName].call(@) for index, renderFnName of fns
    
    # Take all links and bin the text node because during PDF rendering of
    # modern browser engines, the text node is suffixed with the 'href'
    # attribute, rendering a link like <a href="http://www.aerix.nl">Aerix</a> like this:
    #
    #   <a href="http://www.aerix.nl">Aerix(http://www.aerix.nl)</a>
    #
    # By removing the text node we can sort of counter this. A better method (like a
    # directive for the engine to prevent it from doing this in the first place) is needed. 
    if Nota.phantomRuntime then $('a').html ''
    @

  # Precondition: value must be a number, and the model must have a currency symbol defined
  _formatCurrency: (value)->
    # Which symbol to use to separate the integer part of the number from the fraction part, e.g. 0,5 or 0.5
    fractionSeparator = @model.fractionSeparator || ','
    # By default render numbers with 2 decimal places behind the dot, e.g. 2/3 = 6.6667 with 4 places
    decimalPlaces = @model.decimalPlaces || 2
    roundingBase = Math.pow(10,decimalPlaces)
    roundedValue = Math.round(value*roundingBase)/roundingBase
    [integer, fraction] = roundedValue.toString().split('.')
    fraction = _.str.pad(fraction, decimalPlaces, '0', 'right')
    currency = @model.get("currencySymbol")
    currencySeparator = @model.get("currencySeparator") || ' '
    return currency+currencySeparator+integer+fractionSeparator+fraction

  # Naive method for mapping most values to the DOM ... never mind Transparency, this does 99% of it
  _mapObjToDOM: (obj, domScope = @$el, directives, recursive)->
    # Assume we may dig recursively if the domScope is specific, except when it's specified expliciticly
    unless recursive? then recursive = domScope isnt @$el
    # Merge directives with object, but don't touch obj because someone else might need it in it's original state. Instead we make a copy
    obj = _.extend {}, obj, directives
    for key in _.keys(obj)
      # Find matches based on ID or classname (mapping goes on the 'dasherization-principle', lol)
      $matches = $('.'+ _.str.dasherize(key)+', '+'#'+ _.str.dasherize(key), domScope)
      continue unless $matches.length > 0 # Don't bother if there
      if Object.prototype.toString.call(key[obj]) is "[object Object]" and recursive
        @_mapObjToDOM(obj[key], domScope, directives)
      # If the value leads to a function, evaluate it and use it's return value
      else
        value = obj[key]
        if Object.prototype.toString.call(obj[key]) is "[object Function]"
          value = value($matches)
        for el in $matches
          $el = $(el)
          if $el.attr("data-currency")? then $el.html @_formatCurrency value else $el.html value

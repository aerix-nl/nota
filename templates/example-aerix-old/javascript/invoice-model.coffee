define ['backbone'], (Backbone)-> class TemplateApp.InvoiceModel extends Backbone.Model
  init: ->
    @on 'change', @validate, @

  # Calculates the item subtotal (price times quantity, and then a possible discount applied)
  itemSubtotal: (itemObj)->
    # Calculate the subtotal of this item
    subtotal = itemObj.price * itemObj.quantity
    # Apply discount over subtotal if it exists
    if itemObj.discount? > 0 then subtotal = subtotal * (1-itemObj.discount)
    subtotal

  # Subtotal of all the invoice items without taxes, but including their individual discounts
  invoiceSubtotal: ->
    _.reduce @get("invoiceItems"), ( (sum, item)=> sum + @itemSubtotal item ), 0

  invoiceTotal: ->  @invoiceSubtotal() + @VAT()
  
  # VAT over the provided value or the invoice subtotal
  VAT: (value)-> @get("vatPercentage") * (value or @invoiceSubtotal() )
  
  # Validate the new attributes of the model before accepting them
  validate: (attrs, options)->
    unless _.keys(attrs).length > 0
      throw "Provided model has no attributes. "+
        "Check the arguments of this model's initialization call."

    unless attrs.meta? then throw "No invoice meta-data provided"

    id = attrs.meta.id
    unless id? then throw "No invoice ID provided"
    if isNaN parseInt(id, 10)
      throw "Invoice ID could not be parsed"
    if parseInt(id, 10) <= 0 or (parseInt(id, 10) isnt parseFloat(id, 10))
      throw "Invoice ID must be a positive integer"

    date = new Date attrs.meta.date
    unless (Object.prototype.toString.call(date) is "[object Date]") and not isNaN(date.getTime())
     throw "Invoice date is not a valid/parsable value"

    unless attrs.client?
      throw "No data provided about the client/target of the invoice"

    unless attrs.client.organization or attrs.client.contactPerson
      throw "At least the organization name or contact person name must be provided"
      
    postalCode = attrs.client.postalCode
    if postalCode.length? # Postal code is optional, for clients where it is still unknown
      if postalCode.length < 6 then throw "Postal code must be at least 6 characters long"

    unless attrs.invoiceItems? and _.keys(attrs.invoiceItems).length? > 0
      throw "No things/items to show in invoice provided. Must be an dictionary object with at least one entry"

    allItemsValid = _.every attrs.invoiceItems, (item, idx)->
      unless item.description?.length? > 0
        throw "Description not provided or of no length"
      price = parseFloat(item.price, 10)
      if isNaN price
        throw "Price is not a valid floating point number"
      unless price > 0
        throw "Price must be greater than zero"
      if item.discount? and (item.discount < 0 or item.discount > 1)
        throw "Discount specified out of range (must be between 0 and 1)"
      if item.quantity? and item.quantity < 1
        throw "When specified, quantity must be greater than one"

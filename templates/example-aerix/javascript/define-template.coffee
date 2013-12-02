define ["nota-client"], (Nota)->
  # Optional template declaration in the Nota namespace. So that sweet Nota may know about it.
  # The name of the Templates property is the internal identifier of the template
  templateName = 'Aerix'
  Nota.Templates[templateName] = 
    # This here is a descriptive string for displaying in interfaces
    description: 'Aerix VOF invoice template 2013'
  require ['invoice-model', 'invoice-view', 'test-model'], (ModelClass, ViewClass, testJSON)->
    # Start nota with this template
    Nota.init
      withTemplate: templateName
      withData: if not Nota.phantomRutime testJSON

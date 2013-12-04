template =
    # This here is a descriptive string for displaying in interfaces
    name: 'Aerix' # Required
    version: '1.0'
    author: 'Felix Akkermans'
    description: 'Aerix VOF invoice template 2013'
    #requireJSconfig: complex # If you want you can specifiy a RequireJS config
    dependencies: ['invoice-model', 'invoice-view'] # At least []
    previewDependencies: ['test-model'] # Required, length must be 1 for one
    # Both required (name of the module as in dependencies)
    view: 'invoice-view'
    model: 'invoice-model'
    previewJSON: 'test-model'


# We use define when available (RequireJS function to deliver yielded object as callback argument)
if define? then define template else template

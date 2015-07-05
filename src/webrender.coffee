
# We user RequireJS to load the dependencies
requirejs.config {
  paths:
    # Common dependencies
    'backbone':   '/vendor/backbone/backbone'
    'jquery':     '/vendor/jquery/dist/jquery'
    'underscore': '/vendor/underscore/underscore'

    # RequireJS json! deps
    'json':      '/vendor/requirejs-plugins/src/json'
    'text':      '/vendor/requirejs-text/text'
    'requirejs': '/vendor/requirejs/require'
}

define ['backbone', 'json'], ->
  $upload   = $('#upload')
  $data     = $('#data')
  $filename = $('#data-filename')
  reader    = new FileReader()

  $upload.on 'click', (e)->
    e.preventDefault()
    $data.click()

  $data.on 'change', (e)->
    file = e.target.files[0]

    $filename.html file.name
    $('section.main form').addClass('hidden')
    $('section.main div.jumbotron').removeClass('hidden')

    reader.onload = ()->
      $.ajax
        type: 'POST'
        url: '/render'
        data: reader.result
        contentType: 'application/json'

      .done (res)->
        console.log res
      .fail (err)->
        console.log err

    reader.readAsText(file)


    

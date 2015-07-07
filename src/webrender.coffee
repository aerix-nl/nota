
# We user RequireJS to load the dependencies
requirejs.config {
  paths:
    # Common dependencies
    'backbone':   '/vendor/backbone/backbone'
    'jquery':     '/vendor/jquery/dist/jquery'
    'underscore': '/vendor/underscore/underscore'

    # RequireJS json! deps
    'json':       '/vendor/requirejs-plugins/src/json'
    'text':       '/vendor/requirejs-text/text'
    'requirejs':  '/vendor/requirejs/require'
}

define ['backbone', 'json'], ->
  $upload   = $('#upload')
  $data     = $('#data')
  $filename = $('#data-filename')
  $form     = $('section.main form')
  $cancel   = $('#cancel')

  showBlock = (block)->
    $('section.main form').toggleClass      'hidden', block isnt 'form'
    $('div.loading').toggleClass            'hidden', block isnt 'loading'
    $('div.fail').toggleClass               'hidden', block isnt 'fail'
    $('div.done').toggleClass               'hidden', block isnt 'done'

  $upload.on 'click', (e)->
    e.preventDefault()
    $data.click()

  $data.on 'change', (e)->
    $filename.html e.target.files[0].name
    showBlock('loading')
    $form.submit()

  $cancel.on 'click', (e)->
    showBlock('form')
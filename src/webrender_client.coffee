
# We user RequireJS to load the dependencies
requirejs.config {
  paths:
    # Common dependencies
    'backbone':   '/nota/vendor/backbone/backbone'
    'jquery':     '/nota/vendor/jquery/dist/jquery'
    'underscore': '/nota/vendor/underscore/underscore'
}

define ['backbone'], ->
  $upload     = $('#upload')
  $dataProto  = $('#data').remove()
  $filename   = $('#data-filename')
  $form       = $('section.main form')
  $cancel     = $('#cancel')

  showBlock = (block)->
    $('section.main form').toggleClass      'hidden', block isnt 'form'
    $('div.loading').toggleClass            'hidden', block isnt 'loading'
    $('div.fail').toggleClass               'hidden', block isnt 'fail'
    $('div.done').toggleClass               'hidden', block isnt 'done'

  $upload.on 'click', (e)->
    e.preventDefault()

    # Create new clean file input from the prototype
    $data = $dataProto.clone()
    $form.append $data

    # Wait till user selects file
    $data.on 'change', (e)->
      jsonFile = e.target.files[0]
      $filename.html jsonFile.name
      reader = new FileReader

      # Wait till file is read, then send request
      reader.onload = (err)->
        # Create a 'data' form field with the data JSON string
        $dataRead = $("<input name='data'>").val(reader.result).hide()
        $form.append $dataRead
        $form.submit()

        # Cleanup for next time
        $data.remove()
        $dataRead.remove()

      reader.readAsText(jsonFile)
      showBlock('loading')

    # Prompt user with file chooser dialog
    $data.click()

  $cancel.on 'click', (e)->
    showBlock('form')

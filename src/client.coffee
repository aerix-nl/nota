window.Nota =
  # Probe for the existence of PhantomJS ... signs that we're running in a simulation
  phantomRuntime: window._phantom?
  data: {}

  init: ( ) ->
    rivets.bind $('body'), @data


  addData: ( data ) ->
    _(@data).extend(data)

Nota.init()

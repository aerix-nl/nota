window.Nota =
  # Probe for the existence of PhantomJS ... signs that we're running in a simulation
  phantomRuntime: window._phantom?
  data: {}

  init: ( ) ->
    window.notaInit?()
    rivets.bind $('body'), @data

  addData: ( data ) ->
    _(@data).extend(data)
    window.notaData?()

Nota.init()

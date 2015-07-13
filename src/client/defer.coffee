Defer =
  resolve: (meta) ->
    xhr = new XMLHttpRequest()
    xhr.open("/resolve")
    xhr.send(JSON.stringify(meta))

  reject: (reason) ->
    xhr = new XMLHttpRequest()
    xhr.open("/reject")
    xhr.send(JSON.stringify(meta))

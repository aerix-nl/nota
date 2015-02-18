define [
  'rivets'
  ], ( rivets ) ->

  rivets.binders.qr = ( el, value ) ->
    img = qr.image(value)
    console.log 'generating qr'
    el.appendChild(img)

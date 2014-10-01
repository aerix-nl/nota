define [
  'rivets'
  ], ( rivets ) ->

  rivets.formatters.equals = ( value, args... ) ->
    return value is args.join(" ")

  rivets.formatters.qr = ( value, args... ) ->
    return qr.image(value)

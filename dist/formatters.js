(function() {
  var __slice = [].slice;

  define(['rivets'], function(rivets) {
    rivets.formatters.equals = function() {
      var args, value;
      value = arguments[0], args = 2 <= arguments.length ? __slice.call(arguments, 1) : [];
      return value === args.join(" ");
    };
    return rivets.formatters.qr = function() {
      var args, value;
      value = arguments[0], args = 2 <= arguments.length ? __slice.call(arguments, 1) : [];
      return qr.image(value);
    };
  });

}).call(this);

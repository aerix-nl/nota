(function() {
  define(['rivets'], function(rivets) {
    return rivets.binders.qr = function(el, value) {
      var img;
      img = qr.image(value);
      console.log('generating qr');
      return el.appendChild(img);
    };
  });

}).call(this);

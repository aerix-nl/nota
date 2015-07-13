;(function(root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else if (typeof exports === 'object') {
    module.exports = factory();
  } else {
    root.Defer = factory();
  }
}(this, function() {
var Defer;

Defer = {
  resolve: function(meta) {
    var xhr;
    xhr = new XMLHttpRequest();
    xhr.open("/resolve");
    return xhr.send(JSON.stringify(meta));
  },
  reject: function(reason) {
    var xhr;
    xhr = new XMLHttpRequest();
    xhr.open("/reject");
    return xhr.send(JSON.stringify(meta));
  }
};

return Defer;
}));

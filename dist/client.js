(function() {
  window.Nota = {
    phantomRuntime: window._phantom != null,
    data: {},
    init: function() {
      return rivets.bind($('body'), this.data);
    },
    addData: function(data) {
      console.log(data);
      return _(this.data).extend(data);
    }
  };

  Nota.init();

}).call(this);

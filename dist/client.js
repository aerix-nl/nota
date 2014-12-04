(function() {
  window.Nota = {
    phantomRuntime: window._phantom != null,
    data: {},
    init: function() {
      if (typeof window.notaInit === "function") {
        window.notaInit();
      }
      return rivets.bind($('body'), this.data);
    },
    addData: function(data) {
      _(this.data).extend(data);
      return typeof window.notaData === "function" ? window.notaData() : void 0;
    }
  };

  Nota.init();

}).call(this);

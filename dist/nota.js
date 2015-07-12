(function() {
  var Nota, Path;

  Path = require('path');

  module.exports = Nota = (function() {
    Nota.Server = require(Path.join(__dirname, 'server'));

    Nota.JobQueue = require(Path.join(__dirname, 'queue'));

    Nota.TemplateHelper = require(Path.join(__dirname, 'template_helper'));

    Nota.defaults = require(Path.join(__dirname, '../config-default.json'));

    Nota.meta = require(Path.join(__dirname, '../package.json'));

    function Nota() {}

    return Nota;

  })();

}).call(this);

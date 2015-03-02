(function() {
  var NotaHelper, fs, _;

  fs = require('fs');

  _ = require('underscore')._;

  NotaHelper = (function() {
    function NotaHelper() {}

    NotaHelper.isFile = function(path) {
      return fs.existsSync(path) && fs.statSync(path).isFile();
    };

    NotaHelper.isDirectory = function(path) {
      return fs.existsSync(path) && fs.statSync(path).isDirectory();
    };

    NotaHelper.isData = function(path) {
      return this.isFile(path);
    };

    NotaHelper.isTemplate = function(path) {
      return this.isDirectory(path);
    };

    NotaHelper.getTemplatesIndex = function(templatesPath) {
      var definitionPath, dir, index, isDefined, templateDefinition, templateDirs, _i, _len;
      if (!fs.existsSync(templatesPath)) {
        throw Error("Templates path '" + templatesPath + "' doesn't exist.");
      }
      templateDirs = fs.readdirSync(templatesPath);
      templateDirs = _.filter(templateDirs, function(dir) {
        return fs.statSync(templatesPath + '/' + dir).isDirectory();
      });
      index = {};
      for (_i = 0, _len = templateDirs.length; _i < _len; _i++) {
        dir = templateDirs[_i];
        isDefined = fs.existsSync(templatesPath + ("/" + dir + "/bower.json"));
        if (!isDefined) {
          templateDefinition = {
            name: dir,
            definition: 'not found'
          };
        } else {
          definitionPath = templatesPath + ("/" + dir + "/bower.json");
          templateDefinition = JSON.parse(fs.readFileSync(definitionPath));
          templateDefinition.definition = 'read';
        }
        if (!fs.existsSync("templates/" + dir + "/template.html")) {
          console.warn("Template " + templateDefinition.name + " has no mandatory 'template.html' file (omitting)");
          continue;
        }
        templateDefinition.dir = dir;
        index[templateDefinition.name] = templateDefinition;
      }
      return index;
    };

    return NotaHelper;

  })();

  module.exports = NotaHelper;

}).call(this);

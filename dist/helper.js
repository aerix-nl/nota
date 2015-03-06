(function() {
  var Backbone, NotaHelper, fs, _;

  fs = require('fs');

  _ = require('underscore')._;

  Backbone = require('backbone');

  NotaHelper = (function() {
    function NotaHelper() {
      _.extend(this, Backbone.Events);
    }

    NotaHelper.prototype.isFile = function(path) {
      return fs.existsSync(path) && fs.statSync(path).isFile();
    };

    NotaHelper.prototype.isDirectory = function(path) {
      return fs.existsSync(path) && fs.statSync(path).isDirectory();
    };

    NotaHelper.prototype.isData = function(path) {
      return this.isFile(path);
    };

    NotaHelper.prototype.isTemplate = function(path) {
      return this.isDirectory(path);
    };

    NotaHelper.prototype.getTemplatesIndex = function(templatesPath) {
      var definitionPath, dir, index, isDefined, templateDefinition, templateDirs, warningMsg, _i, _len;
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
          warningMsg = "Template %m" + dir + "%N has no 'bower.json' definition %K(optional, but recommended)";
          this.trigger("warning", warningMsg);
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
          warningMsg = "Template %m" + templateDefinition.name + "%N has no mandatory template.html file %K(omitting template)";
          this.trigger("warning", warningMsg);
          continue;
        }
        templateDefinition.dir = dir;
        index[templateDefinition.dir] = templateDefinition;
      }
      return index;
    };

    return NotaHelper;

  })();

  module.exports = new NotaHelper();

}).call(this);

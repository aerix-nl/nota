(function() {
  var Backbone, NotaHelper, fs, path, _;

  fs = require('fs');

  _ = require('underscore')._;

  Backbone = require('backbone');

  path = require('path');

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

    NotaHelper.prototype.getTemplatesIndex = function(basePath) {
      var definition, dir, index, templateDirs, warningMsg, _i, _len;
      if (!fs.existsSync(basePath)) {
        throw new Error("Templates basepath '" + basePath + "' doesn't exist");
      }
      templateDirs = fs.readdirSync(basePath);
      templateDirs = _.filter(templateDirs, function(dir) {
        return fs.statSync(basePath + '/' + dir).isDirectory();
      });
      index = {};
      for (_i = 0, _len = templateDirs.length; _i < _len; _i++) {
        dir = templateDirs[_i];
        definition = this.getTemplateDefinition(path.join(basePath, dir));
        if (definition.meta === 'not template') {
          warningMsg = "Template %m" + dir + "%N has no mandatory template.html file %K(omitting template)";
          this.trigger("warning", warningMsg);
          continue;
        }
        index[templateDefinition.dir] = definition;
      }
      return index;
    };

    NotaHelper.prototype.getTemplateDefinition = function(dir) {
      var definitionPath, isDefined, templateDefinition, warningMsg;
      isDefined = fs.existsSync(dir + "/bower.json");
      if (!isDefined) {
        warningMsg = "Template %m" + dir + "%N has no 'bower.json' definition %K(optional, but recommended)";
        this.trigger("warning", warningMsg);
        templateDefinition = {
          name: path.basename(dir),
          meta: 'not found'
        };
      } else {
        definitionPath = dir + "/bower.json";
        templateDefinition = JSON.parse(fs.readFileSync(definitionPath));
        templateDefinition.meta = 'read';
      }
      if (!fs.existsSync(dir + "/template.html")) {
        templateDefinition.meta = 'not template';
      }
      return templateDefinition.dir = path.basename(dir);
    };

    return NotaHelper;

  })();

  module.exports = new NotaHelper();

}).call(this);

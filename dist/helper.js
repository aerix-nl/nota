(function() {
  var Backbone, NotaHelper, chalk, fs, path, _;

  fs = require('fs');

  _ = require('underscore')._;

  Backbone = require('backbone');

  path = require('path');

  chalk = require('chalk');

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

    NotaHelper.prototype.getTemplatesIndex = function(basePath, logWarnings) {
      var definition, dir, index, templateDirs, warningMsg, _i, _len;
      if (logWarnings == null) {
        logWarnings = true;
      }
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
          warningMsg = "Template " + (chalk.magenta(dir)) + " has no mandatory template.html file " + (chalk.gray('(omitting template)'));
          if (logWarnings) {
            this.trigger("warning", warningMsg);
          }
          continue;
        }
        index[definition.dir] = definition;
      }
      return index;
    };

    NotaHelper.prototype.getTemplateDefinition = function(dir, logWarnings) {
      var definitionPath, isDefined, templateDefinition, warningMsg;
      if (logWarnings == null) {
        logWarnings = true;
      }
      if (!this.isDirectory(dir)) {
        throw new Error("Template '" + dir + "' not found");
      }
      isDefined = this.isFile(dir + "/bower.json");
      if (!isDefined) {
        warningMsg = "Template " + (chalk.magenta(dir)) + " has no 'bower.json' definition " + (chalk.gray('(optional, but recommended)'));
        if (logWarnings) {
          this.trigger("warning", warningMsg);
        }
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
      templateDefinition.dir = path.basename(dir);
      return templateDefinition;
    };

    return NotaHelper;

  })();

  module.exports = new NotaHelper();

}).call(this);

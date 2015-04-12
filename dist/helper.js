(function() {
  var Backbone, NotaHelper, Path, chalk, fs, _;

  fs = require('fs');

  _ = require('underscore')._;

  Backbone = require('backbone');

  Path = require('path');

  chalk = require('chalk');

  NotaHelper = (function() {
    function NotaHelper(logWarning) {
      this.logWarning = logWarning;
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
      templateDirs = _.filter(templateDirs, (function(_this) {
        return function(dir) {
          return _this.isDirectory(Path.join(basePath, dir));
        };
      })(this));
      index = {};
      for (_i = 0, _len = templateDirs.length; _i < _len; _i++) {
        dir = templateDirs[_i];
        definition = this.getTemplateDefinition(Path.join(basePath, dir));
        if (definition.meta === 'not template') {
          warningMsg = "Template " + (chalk.magenta(dir)) + " has no mandatory template.html file " + (chalk.gray('(omitting template)'));
          if (logWarnings) {
            if (typeof this.logWarning === "function") {
              this.logWarning(warningMsg);
            }
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
          if (typeof this.logWarning === "function") {
            this.logWarning(warningMsg);
          }
        }
        templateDefinition = {
          name: Path.basename(dir),
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
      templateDefinition.dir = Path.basename(dir);
      return templateDefinition;
    };

    NotaHelper.prototype.getExampleDataPath = function(templatePath) {
      var definition, exampleDataPath, _ref;
      definition = this.getTemplateDefinition(templatePath);
      if (((_ref = definition['nota']) != null ? _ref['exampleData'] : void 0) != null) {
        exampleDataPath = Path.join(templatePath, definition['nota']['exampleData']);
        if (this.isData(exampleDataPath)) {
          return exampleDataPath;
        } else {
          return typeof this.logWarning === "function" ? this.logWarning("Example data path declaration found in template definition, but file doesn't exist.") : void 0;
        }
      }
    };

    NotaHelper.prototype.getInitData = function(options) {
      var data, dataPath, templatePath, _data;
      templatePath = options.templatePath, dataPath = options.dataPath;
      if (dataPath != null) {
        return data = JSON.parse(fs.readFileSync(dataPath, {
          encoding: 'utf8'
        }));
      } else if ((_data = this.getExampleData(options)) != null) {
        return data = _data;
      } else {
        if (typeof this.logWarning === "function") {
          this.logWarning("No data provided or found. Serving empty object.");
        }
        return data = {};
      }
    };

    NotaHelper.prototype.findTemplatePath = function(options) {
      var match, templatePath, templatesPath, _templatePath;
      templatePath = options.templatePath, templatesPath = options.templatesPath;
      if (templatePath == null) {
        throw new Error("Please provide a template with --template=<directory>");
      }
      if (!this.isTemplate(templatePath)) {
        if (this.isTemplate(_templatePath = "" + (process.cwd()) + "/" + templatePath)) {
          templatePath = _templatePath;
        } else if (this.isTemplate(_templatePath = "" + templatesPath + "/" + templatePath)) {
          templatePath = _templatePath;
        } else if ((match = _(this.getTemplatesIndex(templatesPath)).findWhere({
          name: templatePath
        })) != null) {
          throw new Error("No template at '" + templatePath + "'. But we did find a template which declares it's name as such. It's path is '" + match.dir + "'");
        } else {
          throw new Error("Failed to find template '" + templatePath + "'.");
        }
      }
      return templatePath;
    };

    NotaHelper.prototype.findDataPath = function(options) {
      var dataPath, templatePath, _dataPath;
      dataPath = options.dataPath, templatePath = options.templatePath;
      if (dataPath != null) {
        if (this.isData(dataPath)) {
          dataPath;
        } else if (this.isData(_dataPath = "" + (process.cwd()) + "/" + dataPath)) {
          dataPath = _dataPath;
        } else if (this.isData(_dataPath = "" + templatePath + "/" + dataPath)) {
          dataPath = _dataPath;
        } else {
          throw new Error("Failed to find data '" + dataPath + "'.");
        }
      } else if (_dataPath = this.getExampleDataPath(templatePath)) {
        if (typeof this.logWarning === "function") {
          this.logWarning("No data provided. Using example data as found in template definition.");
        }
        dataPath = _dataPath;
      } else {
        throw new Error("Please provide data with --data=<file path>");
      }
      return dataPath;
    };

    return NotaHelper;

  })();

  module.exports = NotaHelper;

}).call(this);

(function() {
  var Backbone, Path, TemplateUtils, chalk, cheerio, fs, _;

  fs = require('fs');

  _ = require('underscore')._;

  Backbone = require('backbone');

  Path = require('path');

  chalk = require('chalk');

  cheerio = require('cheerio');

  module.exports = TemplateUtils = (function() {
    function TemplateUtils(logWarning) {
      this.logWarning = logWarning;
      _.extend(this, Backbone.Events);
    }

    TemplateUtils.prototype.isFile = function(path) {
      return fs.existsSync(path) && fs.statSync(path).isFile();
    };

    TemplateUtils.prototype.isDirectory = function(path) {
      return fs.existsSync(path) && fs.statSync(path).isDirectory();
    };

    TemplateUtils.prototype.isData = function(path) {
      return this.isFile(path);
    };

    TemplateUtils.prototype.isTemplate = function(path) {
      return this.isDirectory(path);
    };

    TemplateUtils.prototype.getTemplatesIndex = function(basePath, logWarnings) {
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

    TemplateUtils.prototype.getTemplateDefinition = function(dir, logWarnings) {
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

    TemplateUtils.prototype.getExampleDataPath = function(templatePath) {
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

    TemplateUtils.prototype.getTemplateType = function(templatePath) {
      var $, html, type;
      html = fs.readFileSync(Path.join(templatePath, 'template.html'), {
        encoding: 'utf8'
      });
      $ = cheerio.load(html);
      return type = $('script').length === 0 ? 'static' : 'dynamic';
    };

    TemplateUtils.prototype.findTemplatePath = function(options) {
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

    TemplateUtils.prototype.findDataPath = function(options) {
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

    TemplateUtils.prototype.findOutputPath = function(options) {
      var defaultFilename, meta, outputPath, preserve;
      outputPath = options.outputPath, meta = options.meta, defaultFilename = options.defaultFilename, preserve = options.preserve;
      if (outputPath != null) {
        if (this.isDirectory(outputPath)) {
          if ((meta != null ? meta.filesystemName : void 0) != null) {
            outputPath = Path.join(outputPath, meta.filesystemName);
          } else {
            outputPath = Path.join(outputPath, defaultFilename);
          }
        }
        if (this.isFile(outputPath) && !preserve) {
          if (typeof this.logWarning === "function") {
            this.logWarning("Overwriting with current render: " + outputPath);
          }
        }
      } else {
        if ((meta != null ? meta.filesystemName : void 0) != null) {
          outputPath = meta.filesystemName;
        } else {
          outputPath = defaultFilename;
        }
      }
      return outputPath;
    };

    return TemplateUtils;

  })();

}).call(this);

(function() {
  var Nota, NotaServer, fs, nomnom, _,
    __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };

  nomnom = require('nomnom');

  fs = require('fs');

  _ = require('underscore')._;

  _.str = require('underscore.string');

  NotaServer = require('./server');

  Nota = (function() {
    Nota.version = '1337.0.1';

    Nota.defaults = {
      serverAddress: 'localhost',
      serverPort: 7483,
      templatesPath: 'templates',
      outputPath: 'output.pdf'
    };

    function Nota() {
      this.getTemplatesIndex = __bind(this.getTemplatesIndex, this);
      this.listTemplatesIndex = __bind(this.listTemplatesIndex, this);
      var args, dataPath, outputPath, server, serverAddress, serverPort, templatePath, _dataPath, _templatePath;
      nomnom.options({
        template: {
          position: 0,
          help: 'The template path'
        },
        data: {
          position: 1,
          help: 'The data path'
        },
        output: {
          position: 2,
          help: 'The output file'
        },
        preview: {
          abbr: 'p',
          flag: true,
          help: 'Preview in the browser'
        },
        list: {
          abbr: 'l',
          flag: true,
          help: 'List all templates',
          callback: this.listTemplatesIndex
        },
        version: {
          abbr: 'v',
          flag: true,
          help: 'Print version',
          callback: this.version
        }
      });
      args = nomnom.nom();
      templatePath = args.template;
      dataPath = args.data;
      outputPath = args.output || Nota.defaults.outputPath;
      serverAddress = Nota.defaults.serverAddress;
      serverPort = args.port || Nota.defaults.serverPort;
      if (templatePath == null) {
        throw new Error("Please provide a template.");
      }
      if (dataPath == null) {
        throw new Error("Please provide data'.");
      }
      if (!NotaServer.isTemplate(templatePath)) {
        if (NotaServer.isTemplate(_templatePath = "" + (process.cwd()) + "/" + templatePath)) {
          templatePath = _templatePath;
        } else if (NotaServer.isTemplate(_templatePath = "" + Nota.defaults.templatesPath + "/" + templatePath)) {
          templatePath = _templatePath;
        } else {
          throw new Error("Failed to find template '" + templatePath + "'.");
        }
      }
      if (!NotaServer.isData(dataPath)) {
        if (NotaServer.isData(_dataPath = "" + (process.cwd()) + "/" + dataPath)) {
          dataPath = _dataPath;
        } else if (NotaServer.isData(_dataPath = "" + templatePath + "/" + dataPath)) {
          dataPath = _dataPath;
        } else {
          throw new Error("Failed to find data '" + dataPath + "'.");
        }
      }
      server = new NotaServer(templatePath, dataPath, outputPath, serverAddress, serverPort);
    }

    Nota.prototype.version = function() {
      return "Nota version " + Nota.version;
    };

    Nota.prototype.listTemplatesIndex = function() {
      var definition, index, name, templates;
      templates = [];
      index = this.getTemplatesIndex();
      if (_.size(index) === 0) {
        throw new Error("No (valid) templates found in templates directory.");
      } else {
        templates = (function() {
          var _results;
          _results = [];
          for (name in index) {
            definition = index[name];
            _results.push("" + definition.dir + " '" + name + "' v" + definition.version);
          }
          return _results;
        })();
        return templates.join("\n");
      }
    };

    Nota.prototype.getTemplatesIndex = function(forceRebuild) {
      var definitionPath, dir, index, isDefined, templateDefinition, templateDirs, _i, _len;
      if ((this.index != null) && !forceRebuild) {
        return this.index;
      }
      if (!fs.existsSync(Nota.defaults.templatesPath)) {
        throw Error("Templates path '" + Nota.defaults.templatesPath + "' doesn't exist.");
      }
      templateDirs = fs.readdirSync(Nota.defaults.templatesPath);
      templateDirs = _.filter(templateDirs, (function(_this) {
        return function(dir) {
          return fs.statSync(Nota.defaults.templatesPath + '/' + dir).isDirectory();
        };
      })(this));
      index = {};
      for (_i = 0, _len = templateDirs.length; _i < _len; _i++) {
        dir = templateDirs[_i];
        isDefined = fs.existsSync(Nota.defaults.templatesPath + ("/" + dir + "/bower.json"));
        if (!isDefined) {
          templateDefinition = {
            name: dir,
            definition: 'not found'
          };
        } else {
          definitionPath = Nota.defaults.templatesPath + ("/" + dir + "/bower.json");
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
      this.index = index;
      return index;
    };

    return Nota;

  })();

  Nota = new Nota();

}).call(this);

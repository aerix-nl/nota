(function() {
  var Nota, NotaHelper, NotaServer, fs, nomnom, open, _;

  nomnom = require('nomnom');

  fs = require('fs');

  _ = require('underscore')._;

  _.str = require('underscore.string');

  open = require('open');

  NotaServer = require('./server');

  NotaHelper = require('./helper');

  Nota = (function() {
    Nota.prototype.defaults = JSON.parse(fs.readFileSync('config.json', 'utf8'));

    Nota.prototype["package"] = JSON.parse(fs.readFileSync('package.json', 'utf8'));

    function Nota() {
      var args, data, dataPath, match, outputPath, server, serverAddress, serverPort, templatePath, _dataPath, _templatePath;
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
          callback: function() {
            return this["package"].version;
          }
        }
      });
      args = nomnom.nom();
      templatePath = args.template;
      dataPath = args.data;
      outputPath = args.output || this.defaults.outputPath;
      serverAddress = this.defaults.serverAddress;
      serverPort = args.port || this.defaults.serverPort;
      if (templatePath == null) {
        throw new Error("Please provide a template.");
      }
      if (dataPath == null) {
        throw new Error("Please provide data'.");
      }
      console.log(NotaHelper);
      if (!NotaHelper.isTemplate(templatePath)) {
        if (NotaHelper.isTemplate(_templatePath = "" + (process.cwd()) + "/" + templatePath)) {
          templatePath = _templatePath;
        } else if (NotaHelper.isTemplate(_templatePath = "" + this.defaults.templatesPath + "/" + templatePath)) {
          templatePath = _templatePath;
        } else if ((match = _(NotaHelper.getTemplatesIndex(this.defaults.templatesPath)).findWhere({
          name: templatePath
        })) != null) {
          throw new Error("No template at '" + templatePath + "'. We did find a template which declares it's name as such. It's path is '" + match.dir + "'");
        } else {
          throw new Error("Failed to find template '" + templatePath + "'.");
        }
      }
      if (!NotaHelper.isData(dataPath)) {
        if (NotaHelper.isData(_dataPath = "" + (process.cwd()) + "/" + dataPath)) {
          dataPath = _dataPath;
        } else if (NotaHelper.isData(_dataPath = "" + templatePath + "/" + dataPath)) {
          dataPath = _dataPath;
        } else {
          throw new Error("Failed to find data '" + dataPath + "'.");
        }
      }
      data = JSON.parse(fs.readFileSync(dataPath, {
        encoding: 'utf8'
      }));
      server = new NotaServer(serverAddress, serverPort, templatePath, data);
      if (args.preview) {
        open(server.url());
      } else {
        server.render(outputPath, function() {
          return server.close();
        });
      }
    }

    Nota.prototype.listTemplatesIndex = function() {
      var definition, index, name, templates;
      templates = [];
      index = NotaHelper.getTemplatesIndex(this.defaults.templatesPath);
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

    return Nota;

  })();

  Nota = new Nota();

}).call(this);

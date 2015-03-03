(function() {
  var Nota, NotaHelper, NotaServer, fs, nomnom, notifier, open, path, terminal, _,
    __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };

  nomnom = require('nomnom');

  fs = require('fs');

  path = require('path');

  _ = require('underscore')._;

  _.str = require('underscore.string');

  open = require('open');

  terminal = require('node-terminal');

  notifier = require('node-notifier');

  NotaServer = require('./server');

  NotaHelper = require('./helper');

  Nota = (function() {
    Nota.prototype.defaults = JSON.parse(fs.readFileSync('config.json', 'utf8'));

    Nota.prototype["package"] = JSON.parse(fs.readFileSync('package.json', 'utf8'));

    function Nota() {
      this.listTemplatesIndex = __bind(this.listTemplatesIndex, this);
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
        },
        notify: {
          abbr: 'n',
          flag: true,
          help: 'Notify when render job is finished'
        },
        resources: {
          flag: true,
          help: 'Show the events of page resource loading in output'
        }
      });
      args = nomnom.nom();
      templatePath = args.template;
      dataPath = args.data;
      outputPath = args.output || this.defaults.outputPath;
      serverAddress = this.defaults.serverAddress;
      serverPort = args.port || this.defaults.serverPort;
      this.options = _.extend({}, this.defaults);
      if (args.notify != null) {
        this.options.notify = args.notify;
      }
      if (args.resources != null) {
        this.options.logging.pageResources = args.resources;
      }
      if (templatePath == null) {
        throw new Error("Please provide a template.");
      }
      if (dataPath == null) {
        throw new Error("Please provide data'.");
      }
      NotaHelper.on("warning", this.logWarning, this);
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
      server = new NotaServer(this.defaults, templatePath, data);
      server.document.on("all", this.logEvent, this);
      server.document.on("page:ready", (function(_this) {
        return function() {
          return _this.notify({
            title: "Nota: render job finished",
            message: "One "
          });
        };
      })(this));
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
      NotaHelper.on("warning", this.logWarning, this);
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

    Nota.prototype.logWarning = function(warningMsg) {
      return terminal.colorize("nota %3%kWARNING%n " + warningMsg + "\n").colorize("%n");
    };

    Nota.prototype.logError = function(warningMsg) {
      return terminal.colorize("nota %1%kERROR%n " + warningMsg + "\n").colorize("%n");
    };

    Nota.prototype.logEvent = function(event) {
      if (_.str.startsWith(event, "page:resource") && !this.options.logging.pageResources) {
        return;
      }
      return terminal.colorize("nota %4%kEVENT%n " + event + "\n").colorize("%n");
    };

    Nota.prototype.notify = function(message) {
      var base;
      console.log(__dirname);
      console.log(NotaHelper.isFile(path.join(__dirname, '../assets/images/icon.svg')));
      base = {
        title: 'Nota event',
        icon: path.join(__dirname, '../assets/images/icon.png')
      };
      return notifier.notify(_.extend(base, message));
    };

    return Nota;

  })();

  Nota = new Nota();

}).call(this);

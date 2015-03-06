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
    Nota.prototype.defaults = JSON.parse(fs.readFileSync('config-default.json', 'utf8'));

    Nota.prototype["package"] = JSON.parse(fs.readFileSync('package.json', 'utf8'));

    function Nota() {
      this.listTemplatesIndex = __bind(this.listTemplatesIndex, this);
      var server;
      NotaHelper.on("warning", this.logWarning, this);
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
          help: 'Notify when a render job is finished'
        },
        resources: {
          flag: true,
          help: 'Show the events of page resource loading in output'
        },
        preserve: {
          flag: true,
          help: 'Prevents overwriting when output path is already occupied'
        }
      });
      this.options = this.settleOptions(nomnom.nom(), this.defaults);
      this.options.data = JSON.parse(fs.readFileSync(this.options.dataPath, {
        encoding: 'utf8'
      }));
      server = new NotaServer(this.options);
      server.document.on("all", this.logEvent, this);
      server.document.on("page:ready", (function(_this) {
        return function() {
          if (_this.options.notify) {
            return _this.notify({
              title: "Nota: render job finished",
              message: "One document captured to .PDF"
            });
          }
        };
      })(this));
      if (this.options.preview) {
        open(server.url());
      } else {
        server.render({
          outputPath: this.options.outputPath,
          callback: function() {
            return server.close();
          }
        });
      }
    }

    Nota.prototype.settleOptions = function(args, defaults) {
      var options;
      options = _.extend({}, defaults);
      options = _.extend(options, {
        templatePath: args.template,
        dataPath: args.data,
        outputPath: args.output
      });
      if (args.preview != null) {
        options.preview = args.preview;
      }
      if (args.port != null) {
        options.port = args.port;
      }
      if (args.notify != null) {
        options.notify = args.notify;
      }
      if (args.resources != null) {
        options.logging.pageResources = args.resources;
      }
      if (args.preserve != null) {
        options.preserve = args.preserve;
      }
      options.templatePath = this.findTemplatePath(options.templatePath);
      options.dataPath = this.findDataPath(options.dataPath, options.templatePath);
      return options;
    };

    Nota.prototype.findTemplatePath = function(templatePath) {
      var match, _templatePath;
      if (templatePath == null) {
        throw new Error("Please provide a template.");
      }
      if (!NotaHelper.isTemplate(templatePath)) {
        if (NotaHelper.isTemplate(_templatePath = "" + (process.cwd()) + "/" + templatePath)) {
          templatePath = _templatePath;
        } else if (NotaHelper.isTemplate(_templatePath = "" + this.defaults.templatesPath + "/" + templatePath)) {
          templatePath = _templatePath;
        } else if ((match = _(NotaHelper.getTemplatesIndex(this.defaults.templatesPath)).findWhere({
          name: templatePath
        })) != null) {
          throw new Error("No template at '" + templatePath + "'. But we did find a template which declares it's name as such. It's path is '" + match.dir + "'");
        } else {
          throw new Error("Failed to find template '" + templatePath + "'.");
        }
      }
      return templatePath;
    };

    Nota.prototype.findDataPath = function(dataPath, templatePath) {
      var _dataPath;
      if (dataPath == null) {
        throw new Error("Please provide data'.");
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
      return dataPath;
    };

    Nota.prototype.listTemplatesIndex = function() {
      var definition, dir, fold, headerDir, headerName, headerVersion, index, lengths, name, templates, version;
      NotaHelper.on("warning", this.logWarning, this);
      templates = [];
      index = NotaHelper.getTemplatesIndex(this.defaults.templatesPath);
      if (_.size(index) === 0) {
        throw new Error("No (valid) templates found in templates directory.");
      } else {
        headerDir = 'Template directory:';
        headerName = 'Template name:';
        headerVersion = 'Template version:';
        fold = function(memo, str) {
          return Math.max(memo, str.length);
        };
        lengths = {
          dirName: _.reduce(_.keys(index), fold, headerDir.length),
          name: _.reduce(_(_(index).values()).pluck('name'), fold, headerName.length)
        };
        headerDir = _.str.pad('Template directory:', lengths.dirName, ' ', 'right');
        headerName = _.str.pad('Template name:', lengths.name + 8, ' ', 'left');
        terminal.colorize("nota %K" + headerDir + headerName + " " + headerVersion + "%n\n").colorize("%n");
        templates = (function() {
          var _results;
          _results = [];
          for (dir in index) {
            definition = index[dir];
            dir = _.str.pad(definition.dir, lengths.dirName, ' ', 'right');
            name = _.str.pad(definition.name, lengths.name + 8, ' ', 'left');
            version = definition.version != null ? 'v' + definition.version : '';
            _results.push(terminal.colorize("nota %m" + dir + "%g" + name + " %K" + version + "%n\n").colorize("%n"));
          }
          return _results;
        })();
      }
      return "";
    };

    Nota.prototype.logWarning = function(warningMsg) {
      return terminal.colorize("nota %3%kWARNING%n " + warningMsg + "\n").colorize("%n");
    };

    Nota.prototype.logError = function(errorMsg) {
      return terminal.colorize("nota %1%kERROR%n " + errorMsg + "\n").colorize("%n");
    };

    Nota.prototype.logEvent = function(event) {
      if (_.str.startsWith(event, "page:resource") && !this.options.logging.pageResources) {
        return;
      }
      return terminal.colorize("nota %4%kEVENT%n " + event + "\n").colorize("%n");
    };

    Nota.prototype.notify = function(message) {
      var base;
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

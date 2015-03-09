(function() {
  var Nota, NotaHelper, NotaServer, chalk, fs, nomnom, notifier, open, path, _,
    __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };

  nomnom = require('nomnom');

  fs = require('fs');

  path = require('path');

  _ = require('underscore')._;

  _.str = require('underscore.string');

  open = require('open');

  chalk = require('chalk');

  notifier = require('node-notifier');

  NotaServer = require('./server');

  NotaHelper = require('./helper');

  Nota = (function() {
    Nota.prototype.defaults = JSON.parse(fs.readFileSync('config-default.json', 'utf8'));

    Nota.prototype.meta = JSON.parse(fs.readFileSync('package.json', 'utf8'));

    function Nota() {
      this.listTemplatesIndex = __bind(this.listTemplatesIndex, this);
      var definition, e;
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
            return this.meta.version;
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
      try {
        this.options = this.settleOptions(nomnom.nom(), this.defaults);
      } catch (_error) {
        e = _error;
        this.logError(e);
        return;
      }
      definition = NotaHelper.getTemplateDefinition(this.options.templatePath);
      if (definition.meta === "not template") {
        this.logError("Template " + (chalk.magenta(definition.name)) + " has no mandatory template.html file");
        return;
      }
      this.options.data = this.getInitData(this.options);
      this.server = new NotaServer(this.options);
      this.server.on('all', this.logEvent, this);
      this.server.start();
      if (!this.options.preview) {
        this.server.document.on('all', this.logEvent, this);
      }
      if (this.options.preview) {
        open(this.server.url());
      } else {
        this.server.document.on('client:template:loaded', (function(_this) {
          return function() {
            return _this.render(_this.options);
          };
        })(this));
      }
    }

    Nota.prototype.render = function(options) {
      var jobs;
      jobs = [
        {
          data: options.data,
          outputPath: options.outputPath
        }
      ];
      return this.server.render(jobs, {
        preserve: options.preserve,
        callback: (function(_this) {
          return function(succesful) {
            if (options.logging.notify) {
              _this.notify({
                title: "Nota: render job finished",
                message: "" + jobs.length + " document captured to .PDF"
              });
            }
            return _this.server.close();
          };
        })(this)
      });
    };

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
        options.logging.notify = args.notify;
      }
      if (args.resources != null) {
        options.logging.pageResources = args.resources;
      }
      if (args.preserve != null) {
        options.preserve = args.preserve;
      }
      options.templatePath = this.findTemplatePath(options);
      options.dataPath = this.findDataPath(options);
      return options;
    };

    Nota.prototype.getInitData = function(options) {
      var data, exampleData, _data;
      exampleData = function() {
        var dataPath, definition, e;
        try {
          definition = NotaHelper.getTemplateDefinition(options.templatePath);
          if (definition['example-data'] != null) {
            dataPath = path.join(options.templatePath, definition['example-data']);
            if (NotaHelper.isData(dataPath)) {
              return JSON.parse(fs.readFileSync(dataPath, {
                encoding: 'utf8'
              }));
            }
          }
        } catch (_error) {
          e = _error;
          return null;
        }
      };
      if (options.dataPath != null) {
        return data = JSON.parse(fs.readFileSync(options.dataPath, {
          encoding: 'utf8'
        }));
      } else if ((_data = exampleData()) != null) {
        return data = _data;
      } else {
        return data = {};
      }
    };

    Nota.prototype.findTemplatePath = function(options) {
      var match, templatePath, _templatePath;
      templatePath = options.templatePath;
      if (templatePath == null) {
        throw new Error("Please provide a template.");
      }
      if (!NotaHelper.isTemplate(templatePath)) {
        if (NotaHelper.isTemplate(_templatePath = "" + (process.cwd()) + "/" + templatePath)) {
          templatePath = _templatePath;
        } else if (NotaHelper.isTemplate(_templatePath = "" + this.defaults.templatesPath + "/" + templatePath)) {
          templatePath = _templatePath;
        } else if ((match = _(NotaHelper.getTemplatesIndex(this.options.templatesPath)).findWhere({
          name: templatePath
        })) != null) {
          throw new Error("No template at '" + templatePath + "'. But we did find a template which declares it's name as such. It's path is '" + match.dir + "'");
        } else {
          throw new Error("Failed to find template '" + templatePath + "'.");
        }
      }
      return templatePath;
    };

    Nota.prototype.findDataPath = function(options) {
      var dataPath, preview, templatePath, _dataPath;
      dataPath = options.dataPath, templatePath = options.templatePath, preview = options.preview;
      if (dataPath == null) {
        if (preview) {
          return null;
        } else {
          throw new Error("Please provide data'.");
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
        console.log("nota " + chalk.gray(headerDir + headerName + headerVersion));
        templates = (function() {
          var _results;
          _results = [];
          for (dir in index) {
            definition = index[dir];
            dir = _.str.pad(definition.dir, lengths.dirName, ' ', 'right');
            name = _.str.pad(definition.name, lengths.name + 8, ' ', 'left');
            version = definition.version != null ? 'v' + definition.version : '';
            _results.push(console.log("nota " + chalk.magenta(dir) + chalk.green(name) + ' ' + chalk.gray(version)));
          }
          return _results;
        })();
      }
      return '';
    };

    Nota.prototype.logWarning = function(warningMsg) {
      return console.warn("nota " + chalk.bgYellow.black('WARNING') + ' ' + warningMsg);
    };

    Nota.prototype.logError = function(errorMsg) {
      return console.warn("nota " + chalk.bgRed.black('ERROR') + ' ' + errorMsg);
    };

    Nota.prototype.logEvent = function(event) {
      if (_.str.startsWith(event, "page:resource") && !this.options.logging.pageResources) {
        return;
      }
      return console.warn("nota " + chalk.bgBlue.black('EVENT') + ' ' + event);
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

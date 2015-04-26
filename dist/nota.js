(function() {
  var JobQueue, Nota, NotaServer, Path, TemplateUtils, chalk, fs, nomnom, notifier, open, s, _,
    __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };

  nomnom = require('nomnom');

  fs = require('fs');

  Path = require('path');

  _ = require('underscore')._;

  s = require('underscore.string');

  open = require('open');

  chalk = require('chalk');

  notifier = require('node-notifier');

  NotaServer = require('./server');

  JobQueue = require('./queue');

  TemplateUtils = require('./template_utils');

  Nota = (function() {
    Nota.prototype.defaults = require('../config-default.json');

    Nota.prototype.meta = require('../package.json');

    function Nota(logging) {
      this.listTemplatesIndex = __bind(this.listTemplatesIndex, this);
      var definition, e;
      if (logging != null) {
        this.log = logging.log, this.logEvent = logging.logEvent, this.logError = logging.logError, this.logWarning = logging.logWarning;
      }
      this.helper = new TemplateUtils(this.logWarning);
      nomnom.options({
        template: {
          position: 0,
          help: 'The template directory path'
        },
        data: {
          position: 1,
          help: 'The data file path'
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
        resources: {
          flag: true,
          help: 'Show the events of page resource loading in output'
        },
        preserve: {
          flag: true,
          help: 'Prevent overwriting when output path is already occupied'
        }
      });
      try {
        this.options = this.settleOptions(nomnom.nom(), this.defaults);
      } catch (_error) {
        e = _error;
        this.logError(e);
        return;
      }
      definition = this.helper.getTemplateDefinition(this.options.templatePath, false);
      if (definition.meta === "not template") {
        this.logError("Template " + (chalk.cyan(definition.name)) + " has no mandatory " + (chalk.cyan('template.html')) + " file");
        return;
      }
      logging = {
        log: this.log,
        logEvent: this.logEvent,
        logWarning: this.logWarning,
        logError: this.logError
      };
      this.server = new NotaServer(this.options, logging);
      this.server.start();
      if (this.options.preview) {
        open(this.server.url());
      } else {
        this.render(this.options);
      }
    }

    Nota.prototype.render = function(options) {
      var job;
      job = {
        dataPath: options.dataPath,
        outputPath: options.outputPath,
        preserve: options.preserve
      };
      return this.server.queue([job]).then((function(_this) {
        return function(meta) {
          if (options.logging.notify) {
            notifier.on('click', function() {
              if (meta.length === 1) {
                return open(meta[0].outputPath);
              } else if (meta.length > 1) {
                return open(Path.dirname(Path.resolve(meta[0].outputPath)));
              } else {

              }
            });
            notifier.notify({
              title: "Nota: render jobs finished",
              message: "" + meta.length + " document(s) captured to .PDF",
              icon: Path.join(__dirname, '../assets/images/icon.png'),
              wait: true
            });
          }
          _this.server.close();
          return process.exit();
        };
      })(this));
    };

    Nota.prototype.settleOptions = function(args, defaults) {
      var e, options;
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
      options.templatePath = this.helper.findTemplatePath(options);
      try {
        _.extend(options.document, this.helper.getTemplateDefinition(options.templatePath).nota);
      } catch (_error) {
        e = _error;
        this.logWarning(e);
      }
      options.dataPath = this.helper.findDataPath(options);
      return options;
    };

    Nota.prototype.listTemplatesIndex = function() {
      var definition, dir, fold, headerDir, headerName, headerVersion, index, lengths, name, templates, version;
      templates = [];
      index = this.helper.getTemplatesIndex(this.defaults.templatesPath);
      if (_.size(index) === 0) {
        this.logError("No (valid) templates found in templates directory.");
      } else {
        headerDir = 'Directory';
        headerName = 'Template name';
        headerVersion = 'Version';
        fold = function(memo, str) {
          return Math.max(memo, str.length);
        };
        lengths = {
          dirName: _.reduce(_.keys(index), fold, headerDir.length),
          name: _.reduce(_(_(index).values()).pluck('name'), fold, headerName.length)
        };
        headerDir = s.pad(headerDir, lengths.dirName, ' ', 'right');
        headerName = s.pad(headerName, lengths.name + 8, ' ', 'left');
        console.log("nota " + chalk.gray(headerDir + headerName + ' ' + headerVersion));
        templates = (function() {
          var _results;
          _results = [];
          for (dir in index) {
            definition = index[dir];
            dir = s.pad(definition.dir, lengths.dirName, ' ', 'right');
            name = s.pad(definition.name, lengths.name + 8, ' ', 'left');
            version = definition.version != null ? 'v' + definition.version : '';
            _results.push(console.log("nota " + chalk.cyan(dir) + chalk.green(name) + ' ' + chalk.gray(version)));
          }
          return _results;
        })();
      }
      return '';
    };

    Nota.prototype.log = function(msg) {
      return console.log('nota ' + msg);
    };

    Nota.prototype.logWarning = function(warningMsg) {
      return console.warn('nota ' + chalk.bgYellow.black('WARNG') + ' ' + warningMsg);
    };

    Nota.prototype.logError = function(errorMsg) {
      return console.error('nota ' + chalk.bgRed.black('ERROR') + ' ' + errorMsg);
    };

    Nota.prototype.logEvent = function(event) {
      return console.info('nota ' + chalk.bgBlue.black('EVENT') + ' ' + event);
    };

    return Nota;

  })();

  Nota = new Nota();

}).call(this);

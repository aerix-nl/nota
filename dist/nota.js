(function() {
  var JobQueue, NotaCLI, NotaServer, Path, TemplateHelper, chalk, fs, nomnom, notaCLI, notifier, open, s, _,
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

  TemplateHelper = require('./template_helper');

  NotaCLI = (function() {
    NotaCLI.prototype.defaults = require('../config-default.json');

    NotaCLI.prototype.meta = require('../package.json');

    NotaCLI.prototype.logPrefix = chalk.gray('nota ');

    NotaCLI.prototype.clientPrefix = chalk.gray('nota-client ');

    function NotaCLI(logChannels) {
      this.logClientError = __bind(this.logClientError, this);
      this.logClient = __bind(this.logClient, this);
      this.logEvent = __bind(this.logEvent, this);
      this.logError = __bind(this.logError, this);
      this.logWarning = __bind(this.logWarning, this);
      this.log = __bind(this.log, this);
      this.listTemplatesIndex = __bind(this.listTemplatesIndex, this);
      if (logChannels != null) {
        this.log = logChannels.log, this.logEvent = logChannels.logEvent, this.logError = logChannels.logError, this.logWarning = logChannels.logWarning;
      }
      this.helper = new TemplateHelper(this.logWarning);
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
          help: 'Preview template in the browser'
        },
        listen: {
          abbr: 's',
          flag: true,
          help: 'Listen for HTTP POST requests with data to render and respond with output PDF'
        },
        list: {
          abbr: 'l',
          flag: true,
          help: 'List all templates',
          callback: (function(_this) {
            return function() {
              return _this.listTemplatesIndex();
            };
          })(this)
        },
        verbove: {
          abbr: 'b',
          flag: true,
          help: 'More detailed console output on errors'
        },
        version: {
          abbr: 'v',
          flag: true,
          help: 'Print version',
          callback: (function(_this) {
            return function() {
              return _this.meta.version;
            };
          })(this)
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
    }

    NotaCLI.prototype.start = function() {
      var e, logChannels;
      try {
        this.options = this.parseOptions(nomnom.nom(), this.defaults);
      } catch (_error) {
        e = _error;
        this.logError(e);
        return;
      }
      logChannels = {
        log: this.log,
        logEvent: this.logEvent,
        logWarning: this.logWarning,
        logError: this.logError,
        logClient: this.logClient,
        logClientError: this.logClientError
      };
      this.server = new NotaServer(this.options, logChannels);
      return this.server.start().then((function(_this) {
        return function() {
          if (_this.options.preview) {
            open(_this.server.url());
          }
          if (_this.options.listen) {
            return open(_this.server.webrenderUrl());
          } else {
            return _this.render(_this.options);
          }
        };
      })(this));
    };

    NotaCLI.prototype.render = function(options) {
      var job;
      job = {
        dataPath: options.dataPath,
        outputPath: options.outputPath,
        preserve: options.preserve
      };
      return this.server.queue(job).then((function(_this) {
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

    NotaCLI.prototype.parseOptions = function(args, defaults) {
      var definition, e, options;
      options = _.extend({}, defaults);
      options = _.extend(options, {
        templatePath: args.template,
        dataPath: args.data,
        outputPath: args.output
      });
      if (args.preview != null) {
        options.preview = args.preview;
      }
      if (args.listen != null) {
        options.listen = args.listen;
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
      if (args.verbose != null) {
        options.verbose = args.verbose;
      }
      options.templatePath = this.helper.findTemplatePath(options);
      try {
        definition = this.helper.getTemplateDefinition(options.templatePath);
        _.extend(options.document, definition.nota);
      } catch (_error) {
        e = _error;
        this.logWarning(e);
      }
      options.dataPath = this.helper.findDataPath(options);
      return options;
    };

    NotaCLI.prototype.listTemplatesIndex = function() {
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
        this.log(chalk.gray(headerDir + headerName + ' ' + headerVersion));
        templates = (function() {
          var _results;
          _results = [];
          for (dir in index) {
            definition = index[dir];
            dir = s.pad(definition.dir, lengths.dirName, ' ', 'right');
            name = s.pad(definition.name, lengths.name + 8, ' ', 'left');
            version = definition.version != null ? 'v' + definition.version : '';
            _results.push(this.log(chalk.cyan(dir) + chalk.green(name) + ' ' + chalk.gray(version)));
          }
          return _results;
        }).call(this);
      }
      return '';
    };

    NotaCLI.prototype.log = function(msg) {
      return console.log(this.logPrefix + msg);
    };

    NotaCLI.prototype.logWarning = function(warningMsg) {
      return console.warn(this.logPrefix + chalk.bgYellow.black('WARNG') + ' ' + warningMsg);
    };

    NotaCLI.prototype.logError = function(errorMsg) {
      var _ref;
      console.error(this.logPrefix + chalk.bgRed.black('ERROR') + ' ' + errorMsg);
      if (((_ref = this.options) != null ? _ref.verbose : void 0) && (errorMsg.toSource != null)) {
        return console.error(this.logPrefix + errorMsg.toSource());
      }
    };

    NotaCLI.prototype.logEvent = function(event) {
      return console.info(this.logPrefix + chalk.bgBlue.black('EVENT') + ' ' + event);
    };

    NotaCLI.prototype.logClient = function(msg) {
      return console.log(this.clientPrefix + msg);
    };

    NotaCLI.prototype.logClientError = function(msg) {
      return console.error(this.clientPrefix + chalk.bgRed.black('ERROR') + ' ' + msg);
    };

    return NotaCLI;

  })();

  notaCLI = new NotaCLI();

  notaCLI.start();

}).call(this);

(function() {
  var Nota, NotaServer, Page, argv, express, fs, http, open, phantom, _;

  _ = require('underscore')._;

  _.str = require('underscore.string');

  http = require('http');

  express = require('express');

  phantom = require('phantom');

  fs = require('fs');

  argv = require('optimist').argv;

  open = require("open");

  Page = require('./page');

  NotaServer = (function() {
    NotaServer.prototype.serverAddress = 'localhost';

    NotaServer.prototype.serverPort = 7483;

    NotaServer.prototype.templatesPath = 'templates';

    NotaServer.prototype.defaultFilename = 'output.pdf';

    function NotaServer(argv) {
      var data, dataPath, outputPath, pageConfig, preview, templatePath;
      dataPath = argv.data;
      templatePath = argv.template;
      preview = argv.show;
      outputPath = argv.output;
      if (argv.port != null) {
        this.serverPort = argv.port;
      }
      if (argv.list != null) {
        return this.listTemplatesIndex();
      }
      if (argv.template == null) {
        throw new Error("Please provide a template directory with '--template=<dir>'.");
      }
      if (argv.data == null) {
        throw new Error("Please provide a data JSON file with '--data=<file>'.");
      }
      if (!_.str.startsWith(templatePath, '/')) {
        templatePath = this.templatesPath + '/' + templatePath;
      }
      if (!(fs.existsSync(templatePath) && fs.statSync(templatePath).isDirectory())) {
        throw new Error("Failed to find template '" + templatePath + "'.");
      }
      if (!_.str.startsWith(dataPath, '/')) {
        dataPath = templatePath + '/' + dataPath;
      }
      if (!this.fileExists(dataPath)) {
        if (!_.str.endsWith(dataPath, '.json')) {
          dataPath = dataPath + '.json';
          if (!this.fileExists(dataPath)) {
            throw new Error("Failed to find data '" + dataPath + "'.");
          }
        }
      }
      data = JSON.parse(fs.readFileSync(dataPath, {
        encoding: 'utf8'
      }));
      this.app = express();
      this.server = http.createServer(this.app);
      this.app.use(express["static"](templatePath));
      this.app.get('/', function(req, res) {
        return res.redirect('/template.html');
      });
      this.app.use('/lib/', express["static"]("" + __dirname + "/"));
      this.app.use('/vendor/', express["static"]("" + __dirname + "/../bower_components/"));
      this.app.use('/data.json', express["static"](dataPath));
      this.server.listen(this.serverPort);
      pageConfig = {
        serverAddress: this.serverAddress,
        serverPort: this.serverPort,
        outputPath: outputPath,
        defaultFilename: this.defaultFilename,
        initData: data
      };
      this.page = new Page(pageConfig);
      this.page.on('ready', (function(_this) {
        return function() {
          return _this.page.capture();
        };
      })(this));
      this.page.on('capture:done', this.captured, this);
      this.page.on('fail', this.close, this);
      this.page.onAny(this.logPage, this);
    }

    NotaServer.prototype.logPage = function() {
      if (_.str.startsWith('client:')) {
        return console.log(this.event);
      } else {
        return console.log("page:" + this.event);
      }
    };

    NotaServer.prototype.fileExists = function(path) {
      return fs.existsSync(path) && fs.statSync(path).isFile();
    };

    NotaServer.prototype.listTemplatesIndex = function() {
      var definition, index, name, _results;
      index = this.getTemplatesIndex();
      if (_.size(index) === 0) {
        throw new Error("No (valid) templates found in templates directory.");
      } else {
        _results = [];
        for (name in index) {
          definition = index[name];
          _results.push(console.log("" + definition.dir + " '" + name + "' v" + definition.version));
        }
        return _results;
      }
    };

    NotaServer.prototype.getTemplatesIndex = function(forceRebuild) {
      var definitionPath, dir, index, isDefined, templateDefinition, templateDirs, _i, _len;
      if ((this.index != null) && !forceRebuild) {
        return this.index;
      }
      if (!fs.existsSync(this.templatesPath)) {
        throw Error("Templates path '" + this.templatesPath + "' doesn't exist.");
      }
      templateDirs = fs.readdirSync(this.templatesPath);
      templateDirs = _.filter(templateDirs, (function(_this) {
        return function(dir) {
          return fs.statSync(_this.templatesPath + '/' + dir).isDirectory();
        };
      })(this));
      index = {};
      for (_i = 0, _len = templateDirs.length; _i < _len; _i++) {
        dir = templateDirs[_i];
        isDefined = fs.existsSync(this.templatesPath + ("/" + dir + "/bower.json"));
        if (!isDefined) {
          templateDefinition = {
            name: dir,
            definition: 'not found'
          };
        } else {
          definitionPath = this.templatesPath + ("/" + dir + "/bower.json");
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

    NotaServer.prototype.captured = function(meta) {
      console.log("Output written: " + meta.filesystemName);
      process.exit();
      return this.close();
    };

    NotaServer.prototype.close = function() {
      console.log(44);
      this.page.close();
      this.server.close();
      return process.exit();
    };

    return NotaServer;

  })();

  Nota = new NotaServer(argv);

}).call(this);

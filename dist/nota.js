(function() {
  var Nota, Page, argv, express, fs, http, nota, phantom, _;

  _ = require('underscore')._;

  http = require('http');

  express = require('express');

  phantom = require('phantom');

  fs = require('fs');

  argv = require('optimist').argv;

  Page = require('./page');

  Nota = (function() {
    Nota.prototype.serverAddress = 'localhost';

    Nota.prototype.serverPort = 7483;

    Nota.prototype.templatesPath = 'templates';

    function Nota(argv) {
      var data, dataPath, definition, name, outputPath, templatePath, _ref;
      dataPath = argv.data;
      templatePath = argv.template;
      outputPath = "output.pdf";
      if (argv.output) {
        outputPath = argv.output;
      }
      if (argv.port) {
        this.serverPort = argv.port;
      }
      if (!(((argv.template != null) && (argv.data != null)) || (argv.list != null))) {
        throw new Error("Please provide a template and data.");
      }
      if (argv.list != null) {
        _ref = this.getTemplatesIndex(true);
        for (name in _ref) {
          definition = _ref[name];
          console.log("" + definition.dir + " '" + name + "'");
        }
        return;
      }
      if (!(fs.existsSync(templatePath) && fs.statSync(templatePath).isDirectory())) {
        throw Error("Failed to load template " + templatePath + ".");
      }
      if (!(fs.existsSync(dataPath) && fs.statSync(dataPath).isFile())) {
        throw Error("Failed to load data " + dataPath + ".");
      }
      this.app = express();
      this.server = http.createServer(this.app);
      this.app.use(express["static"](templatePath));
      this.app.use('/lib/', express["static"]("" + __dirname + "/"));
      this.app.use('/vendor/', express["static"]("" + __dirname + "/../bower_components/"));
      this.app.use('/data.json', express["static"](dataPath));
      this.server.listen(this.serverPort);
      data = JSON.parse(fs.readFileSync(dataPath, {
        encoding: 'utf8'
      }));
      this.page = new Page(this.serverAddress, this.serverPort, data, outputPath);
      this.page.on('render', (function(_this) {
        return function() {
          return _this.server.close();
        };
      })(this));
      this.page.on('fail', (function(_this) {
        return function() {
          return _this.server.close();
        };
      })(this));
    }

    Nota.prototype.getTemplatesIndex = function(forceRebuild) {
      var defined, definitionPath, dir, index, templateDefinition, templateDirs, _i, _len;
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
        defined = fs.existsSync(this.templatesPath + ("/" + dir + "/javascript/define-template.json"));
        if (!defined) {
          console.warn("Template without definition found: '" + dir + "'");
          templateDefinition = {
            name: dir,
            definition: 'not found'
          };
        } else {
          definitionPath = this.templatesPath + ("/" + dir + "/javascript/define-template.json");
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

  nota = new Nota(argv);

}).call(this);

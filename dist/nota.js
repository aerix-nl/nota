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

    function Nota(argv) {
      var dataPath, templatePath;
      dataPath = argv.data;
      templatePath = argv.template;
      if (!(((argv.template != null) && (argv.data != null)) || (argv.list != null))) {
        throw new Error("Please provide a template and data.");
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
      this.page = new Page(this.serverAddress, this.serverPort);
      this.page.on('render', (function(_this) {
        return function() {
          return _this.server.close();
        };
      })(this));
    }

    return Nota;

  })();

  nota = new Nota(argv);

}).call(this);

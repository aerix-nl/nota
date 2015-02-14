(function() {
  var NotaServer, Page, express, fs, http, open, phantom, _,
    __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };

  _ = require('underscore')._;

  _.str = require('underscore.string');

  http = require('http');

  express = require('express');

  phantom = require('phantom');

  fs = require('fs');

  open = require("open");

  Page = require('./page');

  NotaServer = (function() {
    function NotaServer(templatePath, dataPath, outputPath, serverAddress, serverPort, onClose) {
      var data, pageConfig;
      this.onClose = onClose;
      this.close = __bind(this.close, this);
      this.captured = __bind(this.captured, this);
      this.app = express();
      this.server = http.createServer(this.app);
      this.app.use(express["static"](templatePath));
      this.app.get('/', function(req, res) {
        return res.redirect('/template.html');
      });
      this.app.use('/lib/', express["static"]("" + __dirname + "/"));
      this.app.use('/vendor/', express["static"]("" + __dirname + "/../bower_components/"));
      this.app.use('/data.json', express["static"](dataPath));
      this.server.listen(serverPort);
      data = JSON.parse(fs.readFileSync(dataPath, {
        encoding: 'utf8'
      }));
      pageConfig = {
        serverAddress: serverAddress,
        serverPort: serverPort,
        outputPath: outputPath,
        initData: data
      };
      this.page = new Page(pageConfig);
      this.page.on('ready', this.page.capture);
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

    NotaServer.prototype.captured = function(meta) {
      console.log("Output written: " + meta.filesystemName);
      return this.close();
    };

    NotaServer.prototype.close = function() {
      this.page.close();
      this.server.close();
      if (typeof this.onClose === "function") {
        this.onClose();
      }
      return process.exit();
    };

    NotaServer.isFile = function(path) {
      return fs.existsSync(path) && fs.statSync(path).isFile();
    };

    NotaServer.isDirectory = function(path) {
      return fs.existsSync(path) && fs.statSync(path).isDirectory();
    };

    NotaServer.isData = function(path) {
      return NotaServer.isFile(path);
    };

    NotaServer.isTemplate = function(path) {
      return NotaServer.isDirectory(path);
    };

    return NotaServer;

  })();

  module.exports = NotaServer;

}).call(this);

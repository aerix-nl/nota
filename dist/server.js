(function() {
  var Document, NotaServer, express, fs, http, open, phantom, _,
    __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };

  _ = require('underscore')._;

  _.str = require('underscore.string');

  http = require('http');

  express = require('express');

  phantom = require('phantom');

  fs = require('fs');

  open = require("open");

  Document = require('./document');

  NotaServer = (function() {
    function NotaServer(serverAddress, serverPort, templatePath, data) {
      this.serverAddress = serverAddress;
      this.serverPort = serverPort;
      this.templatePath = templatePath;
      this.data = data;
      this.url = __bind(this.url, this);
      this.app = express();
      this.server = http.createServer(this.app);
      this.app.use(express["static"](templatePath));
      this.app.get('/', (function(_this) {
        return function(req, res) {
          return fs.readFile("" + _this.templatePath + "/template.html", "utf8", function(err, html) {
            var scriptTag;
            scriptTag = "<script data-main='nota' src='vendor/requirejs/require.js'>";
            return res.send(html.replace(/(<head[s\S]*>)([\s\S]*<\/head>)/, "$1\n" + scriptTag + "</script>$2"));
          });
        };
      })(this));
      this.app.use('/lib/', express["static"]("" + __dirname + "/"));
      this.app.use('/vendor/', express["static"]("" + __dirname + "/../bower_components/"));
      this.app.use('/nota.js', express["static"]("" + __dirname + "/client-config.js"));
      this.app.get('/data.json', (function(_this) {
        return function(req, res) {
          return res.send(JSON.stringify(_this.data));
        };
      })(this));
      this.server.listen(this.serverPort);
      this.document = new Document(this);
      this.document.onAny(function() {
        return console.log(this.event, arguments);
      });
    }

    NotaServer.prototype.url = function() {
      return "http://" + this.serverAddress + ":" + this.serverPort + "/";
    };

    NotaServer.prototype.serve = function(data) {
      return this.data = data;
    };

    NotaServer.prototype.render = function(outputPath, callback, data) {
      if (data != null) {
        this.serve(data);
      }
      return this.document.render(outputPath, callback);
    };

    NotaServer.prototype.close = function() {
      this.document.close();
      this.server.close();
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

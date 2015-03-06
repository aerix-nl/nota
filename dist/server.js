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
    function NotaServer(options) {
      var _ref;
      this.options = options;
      this.url = __bind(this.url, this);
      _ref = this.options, this.serverAddress = _ref.serverAddress, this.serverPort = _ref.serverPort, this.templatePath = _ref.templatePath, this.data = _ref.data;
      this.app = express();
      this.server = http.createServer(this.app);
      this.app.use(express["static"](this.templatePath));
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
      this.app.get('/data', (function(_this) {
        return function(req, res) {
          return res.send(JSON.stringify(_this.data));
        };
      })(this));
      this.server.listen(this.serverPort);
      this.document = new Document(this, this.options.document);
    }

    NotaServer.prototype.url = function() {
      return "http://" + this.serverAddress + ":" + this.serverPort + "/";
    };

    NotaServer.prototype.serve = function(data) {
      return this.data = data;
    };

    NotaServer.prototype.render = function(options) {
      return this.document.render(options);
    };

    NotaServer.prototype.close = function() {
      this.document.close();
      this.server.close();
      return process.exit();
    };

    return NotaServer;

  })();

  module.exports = NotaServer;

}).call(this);

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
            var insertionRegex, scriptTag, _ref1;
            insertionRegex = /(<head[s\S]*>)([\s\S]*<\/head>)/;
            if (!((_ref1 = html.match(insertionRegex)) != null ? _ref1.length = 3 : void 0)) {
              throw new Error("No encapsulating <head></head> tags found in template");
            }
            scriptTag = "<script data-main='nota' src='vendor/requirejs/require.js'></script>";
            return res.send(html.replace(insertionRegex, "$1\n\t" + scriptTag + "$2"));
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

    NotaServer.prototype.render = function(jobs, options) {
      var job, rendered, _fn, _i, _len;
      rendered = 0;
      _fn = (function(_this) {
        return function(job, options) {
          _this.document.injectData(job.data);
          return _this.document.once("page:ready", function() {
            options.outputPath = job.outputPath;
            return _this.document.capture(options);
          });
        };
      })(this);
      for (_i = 0, _len = jobs.length; _i < _len; _i++) {
        job = jobs[_i];
        _fn(job, options);
      }
      return this.document.on('render:done', function() {
        rendered = rendered + 1;
        if (rendered === jobs.length) {
          return options.callback();
        }
      });
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

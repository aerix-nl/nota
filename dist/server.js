(function() {
  var Backbone, Document, Express, JobQueue, NotaServer, Path, Q, TemplateHelper, chalk, fs, http, open, phantom, s, _,
    __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };

  _ = require('underscore')._;

  s = require('underscore.string');

  chalk = require('chalk');

  http = require('http');

  Express = require('express');

  phantom = require('phantom');

  fs = require('fs');

  Q = require('q');

  Path = require('path');

  open = require("open");

  Backbone = require('backbone');

  Document = require('./document');

  TemplateHelper = require('./template_helper');

  JobQueue = require('./queue');

  module.exports = NotaServer = (function() {
    function NotaServer(options, logging) {
      var _ref;
      this.options = options;
      this.logging = logging;
      this.url = __bind(this.url, this);
      if (this.options == null) {
        throw new Error("Server requires an Nota options hash. See `/config-default.json` and the NotaCLI parseOptions function.");
      }
      if (this.logging == null) {
        this.logging = require('./logging')(this.options);
      }
      _.extend(this, Backbone.Events);
      _ref = this.options, this.serverAddress = _ref.serverAddress, this.serverPort = _ref.serverPort, this.templatePath = _ref.templatePath, this.dataPath = _ref.dataPath;
      this.helper = new Nota.TemplateHelper(this.logWarning);
      this.on('all', this.logEvent, this);
      this.app = Express();
    }

    NotaServer.prototype.start = function() {
      this.trigger("server:init");
      this.app.use(Express["static"](this.templatePath));
      this.app.get('/', function(req, res) {
        return res.redirect("/template.html");
      });
      this.app.use('/lib/', Express["static"]("" + __dirname + "/"));
      this.app.use('/assets/', Express["static"]("" + __dirname + "/../assets/"));
      this.app.use('/vendor/', Express["static"]("" + __dirname + "/../bower_components/"));
      this.app.use('/nota.js', Express["static"]("" + __dirname + "/client.js"));
      this.app.get('/data', (function(_this) {
        return function(req, res) {
          res.setHeader('Content-Type', 'application/json');
          return res.send(fs.readFileSync(_this.dataPath, {
            encoding: 'utf8'
          }));
        };
      })(this));
      this.app.listen(this.serverPort);
      return this.trigger("server:running");
    };

    NotaServer.prototype.url = function() {
      return "http://" + this.serverAddress + ":" + this.serverPort + "/";
    };

    NotaServer.prototype.close = function() {
      this.trigger('server:closing');
      this.document.close();
      this.server.close();
      return this.server.off('all', this.logEvent, this);
    };

    return NotaServer;

  })();

}).call(this);

(function() {
  var Backbone, Express, NotaServer, Path, Q, TemplateHelper, chalk, fs, http, open, phantom, s, _,
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

  TemplateHelper = require('./template_helper');

  module.exports = NotaServer = (function() {
    function NotaServer(options, logging) {
      var _ref;
      this.options = options;
      this.logging = logging;
      this.url = __bind(this.url, this);
      if (this.options == null) {
        throw new Error("Server requires an Nota options hash. See `/config-default.json` and the NotaCLI parseOptions function.");
      }
      _.extend(this, Backbone.Events);
      _ref = this.options, this.serverAddress = _ref.serverAddress, this.serverPort = _ref.serverPort;
      this.helper = new TemplateHelper(this.logging);
      this.on('all', this.logging.logEvent, this.logging);
      this.app = Express();
      this.middlewares = [];
    }

    NotaServer.prototype.start = function() {
      var middleware, _i, _len, _ref;
      this.trigger("server:init");
      this.app.get('/', function(req, res) {
        return res.redirect("/template.html");
      });
      this.app.use('/nota/lib/', Express["static"]("" + __dirname + "/"));
      this.app.use('/nota/assets/', Express["static"]("" + __dirname + "/../assets/"));
      this.app.use('/nota/vendor/', Express["static"]("" + __dirname + "/../bower_components/"));
      this.app.listen(this.serverPort);
      _ref = this.middlewares;
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        middleware = _ref[_i];
        middleware.start();
      }
      return this.trigger("server:running");
    };

    NotaServer.prototype.use = function(middleware) {
      middleware.bind(this.app);
      return this.middlewares.push(middleware);
    };

    NotaServer.prototype.setTemplate = function(template) {
      this.template = template;
      return this.app.use(Express["static"](this.template.path));
    };

    NotaServer.prototype.setData = function(dataPath) {
      this.dataPath = dataPath;
      return this.app.get('/nota/data', (function(_this) {
        return function(req, res) {
          res.setHeader('Content-Type', 'application/json');
          return res.send(fs.readFileSync(_this.dataPath, {
            encoding: 'utf8'
          }));
        };
      })(this));
    };

    NotaServer.prototype.url = function() {
      return "http://" + this.serverAddress + ":" + this.serverPort + "/";
    };

    NotaServer.prototype.close = function() {
      this.trigger('server:closing');
      this.server.close();
      return this.server.off('all', this.logging.logEvent, this);
    };

    return NotaServer;

  })();

}).call(this);

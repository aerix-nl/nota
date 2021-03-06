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
      this.serveData = __bind(this.serveData, this);
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
      this.app.get('/nota/data', this.serveData);
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

    NotaServer.prototype.setData = function(data) {
      var e, _data;
      if (!(typeof data === 'object' || typeof data === 'string')) {
        throw new Error("Set data with either a string path to the data file or JSON object");
      }
      if (typeof this.currentData === 'string') {
        if (!this.helper.isFile(this.currentData)) {
          throw new Error("Provided data path doesn't exist. Please provide a path to a data file.");
        } else {
          try {
            _data = JSON.parse(fs.readFileSync(this.currentData, {
              encoding: 'utf8'
            }));
          } catch (_error) {
            e = _error;
            throw new Error(chalk.gray("Error parsing data file " + this.currentData + " :") + e);
          }
          if (_.keys(_data).length === 0 || _data.length === 0) {
            throw new Error("Provided data file is empty");
          }
        }
      }
      return this.currentData = data;
    };

    NotaServer.prototype.getData = function() {
      if (this.currentData == null) {
        throw new Error('Currently no data set on server');
      }
      if (typeof this.currentData === 'string' && this.helper.isData(this.currentData)) {
        return JSON.parse(fs.readFileSync(this.currentData, {
          encoding: 'utf8'
        }));
      } else if (typeof this.currentData === 'object') {
        return this.currentData;
      } else {
        throw new Error("Please set the data on server with either a JSON data object or a path that resolves to a data file");
      }
    };

    NotaServer.prototype.serveData = function(req, res) {
      var data, e;
      try {
        data = this.getData();
      } catch (_error) {
        e = _error;
        res.status(500).send(e);
      }
      res.setHeader('Content-Type', 'application/json');
      return res.send(JSON.stringify(data, null, 2));
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

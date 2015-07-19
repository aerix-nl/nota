(function() {
  var Handlebars, Q, Webrender, bodyParser, chalk, fs, mkdirp, tmp,
    __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };

  mkdirp = require('mkdirp');

  bodyParser = require('body-parser');

  Handlebars = require('handlebars');

  chalk = require('chalk');

  tmp = require('tmp');

  Q = require('q');

  fs = require('fs');

  module.exports = Webrender = (function() {
    function Webrender(options, logging) {
      this.options = options;
      this.logging = logging;
      this.webRender = __bind(this.webRender, this);
      this.webRenderInterface = __bind(this.webRenderInterface, this);
      this.url = __bind(this.url, this);
      mkdirp(this.options.webrenderPath, (function(_this) {
        return function(err) {
          if (err) {
            throw new Error("Unable to create render output path " + (chalk.cyan(options.webrenderPath)) + ". Error: " + err);
          }
        };
      })(this));
      tmp.file(function(err, path, fd, cleanupCallback) {
        if (err) {
          throw err;
        }
        console.log("File: ", path);
        console.log("Filedescriptor: ", fd);
        return cleanupCallback();
      });
    }

    Webrender.prototype.url = function() {
      return "http://" + this.serverAddress + ":" + this.serverPort + "/render";
    };

    Webrender.prototype.bind = function(expressApp) {
      expressApp.use(bodyParser.json());
      expressApp.use(bodyParser.urlencoded({
        extended: true
      }));
      expressApp.post('/render', this.webRender);
      return expressApp.get('/render', this.webRenderInterface);
    };

    Webrender.prototype.start = function() {
      var html;
      if (typeof this.log === "function") {
        this.log("Listening at " + (chalk.cyan(this.url())) + " for POST requests");
      }
      if (this.options.logging.webrenderAddress) {
        this.ipLookups().then((function(_this) {
          return function(ip) {
            _this.ip = ip;
            if (_this.ip.lan != null) {
              if (typeof _this.log === "function") {
                _this.log("LAN address: " + chalk.cyan("http://" + ip.lan + ":" + _this.serverPort + "/render"));
              }
            }
            if (_this.ip.wan != null) {
              return typeof _this.log === "function" ? _this.log("WAN address: " + chalk.cyan("http://" + ip.wan + ":" + _this.serverPort + "/render")) : void 0;
            }
          };
        })(this))["catch"]((function(_this) {
          return function(err) {
            return typeof _this.log === "function" ? _this.log(err) : void 0;
          };
        })(this));
      }
      html = fs.readFileSync("" + __dirname + "/../assets/webrender.html", {
        encoding: 'utf8'
      });
      return this.webrenderTemplate = Handlebars.compile(html);
    };

    Webrender.prototype.ipLookups = function() {
      var deferred, ext, local, reject, timeout;
      deferred = Q.defer();
      timeout = 2000;
      local = this.ipLookupLocal();
      ext = this.ipLookupExt();
      reject = function() {
        if (local.inspect().status === "fulfilled") {
          return deferred.resolve({
            lan: local.inspect().value
          });
        }
        if (ext.inspect().status === "fulfilled") {
          return deferred.resolve({
            wan: ext.inspect().value
          });
        }
        return deferred.reject("LAN and WAN IP lookup canceled after timeout of " + timeout + "ms");
      };
      setTimeout(reject, timeout);
      local.then(function(localIp) {
        return ext.then(function(extIp) {
          return deferred.resolve({
            lan: localIp,
            wan: extIp
          });
        });
      });
      return deferred.promise;
    };

    Webrender.prototype.ipLookupLocal = function() {
      var deferred;
      deferred = Q.defer();
      require('dns').lookup(require('os').hostname(), (function(_this) {
        return function(errLan, ipLan, fam) {
          if (errLan != null) {
            return deferred.reject(errLan);
          }
          return deferred.resolve(ipLan);
        };
      })(this));
      return deferred.promise;
    };

    Webrender.prototype.ipLookupExt = function() {
      var deferred;
      deferred = Q.defer();
      require('externalip')((function(_this) {
        return function(errExt, ipExt) {
          if (errExt != null) {
            return deferred.reject(errExt);
          }
          return deferred.resolve(ipExt);
        };
      })(this));
      return deferred.promise;
    };

    Webrender.prototype.webRenderInterface = function(req, res) {
      var definition, webRenderHTML;
      definition = this.helper.getTemplateDefinition(this.templatePath);
      webRenderHTML = webrenderTemplate({
        template: definition,
        serverPort: this.serverPort,
        ip: this.ip
      });
      return res.send(webRenderHTML);
    };

    Webrender.prototype.webRender = function(req, res) {
      var job;
      if (!this.reqPreconditions(req, res)) {
        return;
      }
      job = {
        data: req.body.data,
        outputPath: this.options.webrenderPath
      };
      return this.queue(job).then(function(meta) {
        var pdf;
        if (meta[0].fail != null) {
          return res.status(500).send("An error occured while rendering: " + meta[0].fail);
        } else {
          pdf = Path.resolve(meta[0].outputPath);
          return res.download(pdf);
        }
      });
    };

    Webrender.prototype.reqPreconditions = function(req, res) {
      var e;
      if (req.body.data == null) {
        res.status(400).send("The <code>data</code> field of the request was undefined. Please provide a template model instance that you'd like to render into your template. See the <a href='/render#rest-api'>REST-API documentation</a> of the webrender service.").end();
        return false;
      } else if (typeof req.body.data === 'string') {
        try {
          req.body.data = JSON.parse(req.body.data);
        } catch (_error) {
          e = _error;
          res.status(400).send("Could not parse data string. Server expects a JSON string as the data field. Error: " + e).end();
          return false;
        }
      }
      if (req.body.data === {}) {
        res.status(400).send("Empty data object received");
        return false;
      }
      return true;
    };

    return Webrender;

  })();

}).call(this);

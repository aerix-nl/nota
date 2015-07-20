(function() {
  var Handlebars, Q, TemplateHelper, Webrender, bodyParser, chalk, fs, mkdirp, tmp,
    __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };

  mkdirp = require('mkdirp');

  bodyParser = require('body-parser');

  Handlebars = require('handlebars');

  chalk = require('chalk');

  tmp = require('tmp');

  Q = require('q');

  fs = require('fs');

  TemplateHelper = require('./template_helper');

  module.exports = Webrender = (function() {
    function Webrender(options, logging) {
      var _ref;
      this.options = options;
      this.logging = logging;
      this.webrender = __bind(this.webrender, this);
      this.webrenderInterface = __bind(this.webrenderInterface, this);
      this.url = __bind(this.url, this);
      _ref = this.options, this.serverAddress = _ref.serverAddress, this.serverPort = _ref.serverPort;
      this.helper = new TemplateHelper(this.logging);
      this.webrenderCache = tmp.dirSync();
    }

    Webrender.prototype.url = function() {
      return "http://" + this.serverAddress + ":" + this.serverPort + "/render";
    };

    Webrender.prototype.bind = function(expressApp) {
      this.expressApp = expressApp;
      this.expressApp.use(bodyParser.json());
      this.expressApp.use(bodyParser.urlencoded({
        extended: true
      }));
      this.expressApp.post('/render', this.webrender);
      return this.expressApp.get('/render', this.webrenderInterface);
    };

    Webrender.prototype.start = function() {
      var html, _base;
      if (typeof (_base = this.logging).log === "function") {
        _base.log("Listening at " + (chalk.cyan(this.url())) + " for POST requests");
      }
      if (this.options.logging.webrenderAddress) {
        this.ipLookups().then((function(_this) {
          return function(ip) {
            var _base1, _base2;
            _this.ip = ip;
            if (_this.ip.lan != null) {
              if (typeof (_base1 = _this.logging).log === "function") {
                _base1.log("LAN address: " + chalk.cyan("http://" + ip.lan + ":" + _this.serverPort + "/render"));
              }
            }
            if (_this.ip.wan != null) {
              return typeof (_base2 = _this.logging).log === "function" ? _base2.log("WAN address: " + chalk.cyan("http://" + ip.wan + ":" + _this.serverPort + "/render")) : void 0;
            }
          };
        })(this))["catch"]((function(_this) {
          return function(err) {
            var _base1;
            return typeof (_base1 = _this.logging).log === "function" ? _base1.log(err) : void 0;
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
      timeout = 8000;
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

    Webrender.prototype.setTemplate = function(template) {
      this.template = template;
    };

    Webrender.prototype.webrenderInterface = function(req, res) {
      var webrenderHTML;
      console.log(this.template);
      webrenderHTML = this.webrenderTemplate({
        template: this.helper.getTemplateDefinition(this.template.path),
        serverPort: this.serverPort,
        ip: this.ip
      });
      return res.send(webrenderHTML);
    };

    Webrender.prototype.webrender = function(req, res) {
      var job;
      if (!this.reqPreconditions(req, res)) {
        return;
      }
      job = {
        data: req.body.data,
        outputPath: this.webrenderCache.name
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

    Webrender.prototype.close = function() {
      return this.webrenderCache.removeCallback();
    };

    return Webrender;

  })();

}).call(this);

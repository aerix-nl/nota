(function() {
  var LogginChannels, chalk,
    __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };

  chalk = require('chalk');

  module.exports = LogginChannels = (function() {
    LogginChannels.prototype.prefixes = {
      nota: chalk.gray('nota '),
      template: chalk.gray('template ')
    };

    function LogginChannels(options, prefixes) {
      this.options = options;
      this.logClientError = __bind(this.logClientError, this);
      this.logClient = __bind(this.logClient, this);
      this.logEvent = __bind(this.logEvent, this);
      this.logError = __bind(this.logError, this);
      this.logWarning = __bind(this.logWarning, this);
      this.log = __bind(this.log, this);
      if (prefixes != null) {
        this.prefixes = prefixes;
      }
    }

    LogginChannels.prototype.log = function(msg) {
      return console.log(this.prefixes.nota + msg);
    };

    LogginChannels.prototype.logWarning = function(warningMsg) {
      return console.warn(this.prefixes.nota + chalk.bgYellow.black('WARNG') + ' ' + warningMsg);
    };

    LogginChannels.prototype.logError = function(err) {
      console.error(this.prefixes.nota + chalk.bgRed.black('ERROR') + ' ' + err);
      if ((err instanceof Error) || (err.stack != null)) {
        return console.error(this.prefixes.nota + chalk.gray(err.stack));
      }
    };

    LogginChannels.prototype.logEvent = function(event) {
      return console.info(this.prefixes.nota + chalk.bgBlue.black('EVENT') + ' ' + event);
    };

    LogginChannels.prototype.logClient = function(msg) {
      return console.log(this.prefixes.template + msg);
    };

    LogginChannels.prototype.logClientError = function(msg) {
      return console.error(this.prefixes.template + chalk.bgRed.black('ERROR') + ' ' + msg);
    };

    return LogginChannels;

  })();

}).call(this);

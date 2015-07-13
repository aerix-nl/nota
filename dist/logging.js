(function() {
  var LogginChannels, chalk,
    __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };

  chalk = require('chalk');

  module.exports = LogginChannels = (function() {
    LogginChannels.prototype.prefixes = {
      nota: chalk.gray('nota '),
      tempalte: chalk.gray('template ')
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

    LogginChannels.prototype.logError = function(errorMsg) {
      var _ref;
      console.error(this.prefixes.nota + chalk.bgRed.black('ERROR') + ' ' + errorMsg);
      if (((_ref = this.options) != null ? _ref.verbose : void 0) && (errorMsg.toSource != null)) {
        return console.error(this.prefixes.nota + errorMsg.toSource());
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

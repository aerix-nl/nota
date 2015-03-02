(function() {
  var EventEmitter2, NotaHelper, fs, _,
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  fs = require('fs');

  _ = require('underscore')._;

  EventEmitter2 = require('eventemitter2').EventEmitter2;

  NotaHelper = (function(_super) {
    __extends(NotaHelper, _super);

    function NotaHelper() {
      return NotaHelper.__super__.constructor.apply(this, arguments);
    }

    NotaHelper.isFile = function(path) {
      return fs.existsSync(path) && fs.statSync(path).isFile();
    };

    NotaHelper.isDirectory = function(path) {
      return fs.existsSync(path) && fs.statSync(path).isDirectory();
    };

    NotaHelper.isData = function(path) {
      return this.isFile(path);
    };

    NotaHelper.isTemplate = function(path) {
      return this.isDirectory(path);
    };

    NotaHelper.getTemplatesIndex = function(templatesPath) {
      var definitionPath, dir, index, isDefined, templateDefinition, templateDirs, warningMsg, _i, _len;
      if (!fs.existsSync(templatesPath)) {
        throw Error("Templates path '" + templatesPath + "' doesn't exist.");
      }
      templateDirs = fs.readdirSync(templatesPath);
      templateDirs = _.filter(templateDirs, function(dir) {
        return fs.statSync(templatesPath + '/' + dir).isDirectory();
      });
      index = {};
      for (_i = 0, _len = templateDirs.length; _i < _len; _i++) {
        dir = templateDirs[_i];
        isDefined = fs.existsSync(templatesPath + ("/" + dir + "/bower.json"));
        if (!isDefined) {
          templateDefinition = {
            name: dir,
            definition: 'not found'
          };
        } else {
          definitionPath = templatesPath + ("/" + dir + "/bower.json");
          templateDefinition = JSON.parse(fs.readFileSync(definitionPath));
          templateDefinition.definition = 'read';
        }
        if (!fs.existsSync("templates/" + dir + "/template.html")) {
          warningMsg = "Template %m" + templateDefinition.name + "%N has no mandatory template.html file %K(omitting template)";
          this.emit("warning", warningMsg);
          continue;
        }
        templateDefinition.dir = dir;
        index[templateDefinition.name] = templateDefinition;
      }
      return index;
    };

    return NotaHelper;

  })(EventEmitter2);

  module.exports = NotaHelper;

}).call(this);

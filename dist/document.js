(function() {
  var Document, Nightmare, Promise, path, uuid;

  path = require('path');

  Nightmare = require('nightmare');

  Promise = require('bluebird');

  uuid = require('uuid');

  module.exports = Document = (function() {
    Document.prototype.url = null;

    function Document(url) {
      this.url = url;
    }

    Document.prototype.render = function(data) {
      if (data == null) {
        data = "";
      }
      return new Promise((function(_this) {
        return function(resolve, reject) {
          var context, deferred, nightmare, onResourceRequested, renderer;
          nightmare = Nightmare();
          renderer = function(n) {
            if (deferred) return console.log("deferred");

            console.log('hold on, render incoming!');
            return n.screenshot(path).use(function(n) {
              console.log('render done!');
              resolve(context.path);
              return n;
            });
            
          };
          deferred = false;
          path = "/tmp/" + (uuid.v4()) + ".pdf";
          context = {
            dataUrl: _this.url + '/data',
            dataRedirect: "data:application/json," + JSON.stringify(data),
            defer: function() {
              return deferred = true;
            },
            deferUrl: _this.url + '/defer',
            deferRedirect: "data:text/plain,",
            deferRedirect: _this.url + '/client/defer.js',
            resolve: function() {
              deferred = false;
              nightmare.run(renderer);
              return resolve(path);
            },
            resolveUrl: _this.url + '/resolve',
            resolveRedirect: "data:text/plain,",
            reject: function() {
              deferred = false;
              return reject();
            },
            rejectUrl: _this.url + '/reject',
            rejectRedirect: "data:text/plain,"
          };
          onResourceRequested = function(requestData, networkRequest, context) {
            if (requestData.url === context.dataUrl) {
              networkRequest.changeUrl(context.dataRedirect);
            }
            if (requestData.url === context.deferUrl) {
              context.defer();
              networkRequest.changeUrl(context.deferRedirect);
            }
            if (requestData.url === context.resolveUrl) {
              context.resolve();
              networkRequest.changeUrl(context.resolveRedirect);
            }
            if (requestData.url === context.rejectUrl) {
              context.reject();
              return networkRequest.changeUrl(context.rejectRedirect);
            }
          };
          return nightmare.on('resourceRequestStarted', onResourceRequested, (function() {}), context, (function() {})).viewport(1000, 1000).zoom(2).goto(_this.url).wait().use(renderer);
        };
      })(this));
    };

    return Document;

  })();

}).call(this);

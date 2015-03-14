(function() {
  /** @jsx React.DOM */;
  var __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  define(['/nota.js', 'underscore.string', 'jed', 'react'], function(Nota, s, Jed, React) {
    return TemplateApp.InvoiceView = (function(_super) {
      __extends(InvoiceView, _super);

      function InvoiceView() {
        return InvoiceView.__super__.constructor.apply(this, arguments);
      }

      InvoiceView.prototype.initialize = function() {
        var NeatComponent;
        _.extend(this, Backbone.Events);
        this.setElement($("body"));
        this.model.on('change', this.render, this);
        this.i18n = new Jed({
          "missing_key_callback": function(key) {
            return console.error("Missing key in i18n: " + key);
          }
        });
        return NeatComponent = React.createClass({
          render: function() {
            var n;
            return React.createElement("div", {
              "className": "neat-component"
            }, (this.props.showTitle ? React.createElement("h1", null, "A Component is I") : void 0), React.createElement("hr", null), (function() {
              var _i, _results;
              _results = [];
              for (n = _i = 1; _i <= 10; n = ++_i) {
                _results.push(React.createElement("p", null, "This line has been printed ", n, " times"));
              }
              return _results;
            })());
          }
        });
      };

      InvoiceView.prototype.documentName = function() {
        return 'Invoice ' + this.getFullID();
      };

      InvoiceView.prototype.filesystemName = function() {
        var customer, project;
        customer = this.model.get("client").organization;
        customer = customer || this.model.get("client").contactPerson;
        customer = customer.replace(/\s/g, '-');
        project = this.model.get("projectName");
        if (project != null) {
          project = project.replace(/\s/g, '-');
          return "" + (this.getFullID()) + "_" + customer + "_" + project + ".pdf";
        } else {
          return "" + (this.getFullID()) + "_" + customer + ".pdf";
        }
      };

      InvoiceView.prototype.documentMeta = function() {
        return {
          'id': this.getFullID(),
          'documentName': this.documentName(),
          'filesystemName': this.filesystemName()
        };
      };

      InvoiceView.prototype.getFullID = function() {
        var date;
        date = new Date(this.model.get('meta').date);
        return date.getUTCFullYear() + '.' + s.pad(this.model.get('meta').id.toString(), 4, '0');
      };

      InvoiceView.prototype.render = function(options) {
        var fns, index, partial, renderFnName;
        this.trigger('render:start');
        partial = options != null ? options.partial : void 0;
        if (partial != null) {
          this['_render' + s.capitalize(partial)].call(this);
        } else {
          fns = _.filter(_.functions(this), function(fnName) {
            return s.startsWith(fnName, '_render');
          });
          for (index in fns) {
            renderFnName = fns[index];
            this[renderFnName].call(this);
          }
        }
        if (Nota.phantomRuntime) {
          $('a').html('');
        }
        this.trigger('render:done');
        return this;
      };

      InvoiceView.prototype._renderInvoiceDetails = function() {
        var date, day, directives, month, monthNames, validDay, validMonth, validYear, year;
        directives = {
          vatPercentage: (function(_this) {
            return function() {
              return _this.model.get("vatPercentage") * 100;
            };
          })(this),
          companyFullname: (function(_this) {
            return function() {
              var origin;
              origin = _this.model.get('origin');
              return origin.companyName + ' ' + origin.companyLawform;
            };
          })(this),
          clientString: (function(_this) {
            return function() {
              return _this.model.get("client").contactPerson || _this.model.get("client").organization;
            };
          })(this)
        };
        this._mapObjToDOM(this.model.attributes, null, directives, false);
        this._mapObjToDOM(this.model.get("client"), this.$('p#client-block'));
        this._mapObjToDOM(this.model.get("origin"), this.$('div.company-info, span#retour-line, footer, span#closing'));
        date = new Date(this.model.get('meta').date);
        this.$('#invoice-id').html(this.getFullID());
        $("html head title").html(this.documentName());
        monthNames = ["januari", "februari", "maart", "april", "mei", "juni", "juli", "augustus", "september", "oktober", "november", "december"];
        month = monthNames[date.getMonth()];
        year = date.getUTCFullYear();
        day = date.getUTCDate();
        date.setUTCDate(day + this.model.get('validityPeriod'));
        validMonth = monthNames[date.getMonth()];
        validYear = date.getUTCFullYear();
        validDay = date.getUTCDate();
        this._mapObjToDOM({
          invoiceDate: "" + day + " " + month + " " + year,
          expirationDate: "" + validDay + " " + validMonth + " " + validYear
        });
        this._pluralize({
          itemCount: this.model.get("invoiceItems").length
        });
        this.$('span#closing b.total').html(this._formatCurrency(this.model.invoiceTotal()));
        this.$('span#closing b.invoice-id').html(this.getFullID());
        return this;
      };

      InvoiceView.prototype._renderInvoiceTable = function() {
        var $itemPrototype, $row, footerAggregate, index, itemObj, _ref;
        $itemPrototype = $(this.$("div#invoice-body table tbody tr.item")[0]).clone();
        this.$('div#invoice-body table tbody').empty();
        _ref = this.model.get("invoiceItems");
        for (index in _ref) {
          itemObj = _ref[index];
          $row = $itemPrototype.clone();
          itemObj.subtotal = this.model.itemSubtotal(itemObj);
          this._mapObjToDOM(itemObj, $row);
          this.$("div#invoice-body table tbody").append($row);
        }
        footerAggregate = {};
        footerAggregate.subtotal = this.model.invoiceSubtotal();
        footerAggregate.vat = this.model.VAT(footerAggregate.subtotal);
        footerAggregate.total = footerAggregate.subtotal + footerAggregate.vat;
        this._mapObjToDOM(footerAggregate, this.$("div#invoice-body table tfoot"));
        return this;
      };

      InvoiceView.prototype._formatCurrency = function(value) {
        var currency, currencySeparator, decimalPlaces, fraction, fractionSeparator, integer, roundedValue, roundingBase, _ref;
        fractionSeparator = this.model.fractionSeparator || ',';
        decimalPlaces = this.model.decimalPlaces || 2;
        roundingBase = Math.pow(10, decimalPlaces);
        roundedValue = Math.round(value * roundingBase) / roundingBase;
        _ref = roundedValue.toString().split('.'), integer = _ref[0], fraction = _ref[1];
        fraction = s.pad(fraction, decimalPlaces, '0', 'right');
        currency = this.model.get("currencySymbol");
        currencySeparator = this.model.get("currencySeparator") || ' ';
        return currency + currencySeparator + integer + fractionSeparator + fraction;
      };

      InvoiceView.prototype._mapObjToDOM = function(obj, domScope, directives, recursive) {
        var $el, $matches, el, key, value, _i, _len, _ref, _results;
        if (domScope == null) {
          domScope = this.$el;
        }
        if (recursive == null) {
          recursive = domScope !== this.$el;
        }
        obj = _.extend({}, obj, directives);
        _ref = _.keys(obj);
        _results = [];
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          key = _ref[_i];
          $matches = $('.' + s.dasherize(key) + ', ' + '#' + s.dasherize(key), domScope);
          if (!$matches.length > 0) {
            continue;
          }
          if (Object.prototype.toString.call(key[obj]) === "[object Object]" && recursive) {
            _results.push(this._mapObjToDOM(obj[key], domScope, directives));
          } else {
            _results.push((function() {
              var _j, _len1, _results1;
              _results1 = [];
              for (_j = 0, _len1 = $matches.length; _j < _len1; _j++) {
                el = $matches[_j];
                value = obj[key];
                $el = $(el);
                if (Object.prototype.toString.call(obj[key]) === "[object Function]") {
                  value = value($el);
                }
                if ($el.attr("data-currency") != null) {
                  _results1.push($el.html(this._formatCurrency(value)));
                } else {
                  _results1.push($el.html(value));
                }
              }
              return _results1;
            }).call(this));
          }
        }
        return _results;
      };

      InvoiceView.prototype._pluralize = function(obj, domScope) {
        var $el, $matches, catchArbitrary, catchNegative, catchPositive, count, el, key, pluralizedForm, _i, _len, _ref, _results;
        if (domScope == null) {
          domScope = this.$el;
        }
        _ref = _.keys(obj);
        _results = [];
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          key = _ref[_i];
          $matches = $("[data-pluralize='" + (s.dasherize(key)) + "']", domScope);
          if (!$matches.length > 0) {
            continue;
          }
          count = obj[key];
          _results.push((function() {
            var _j, _len1, _results1;
            _results1 = [];
            for (_j = 0, _len1 = $matches.length; _j < _len1; _j++) {
              el = $matches[_j];
              $el = $(el);
              pluralizedForm = $("[data-pluralize='" + count + "']", $el);
              if (!pluralizedForm.length > 0) {
                catchPositive = $("[data-pluralize='+']", $el);
                catchNegative = $("[data-pluralize='-']", $el);
                catchArbitrary = $("[data-pluralize='*']", $el);
                if (count > 0 && catchPositive.length > 0) {
                  pluralizedForm = catchPositive;
                } else if (count < 0 && catchNegative.length > 0) {
                  pluralizedForm = catchNegative;
                } else if (catchArbitrary.length > 0) {
                  pluralizedForm = catchArbitrary;
                } else {
                  console.error("Trying to pluralize string for input of size " + count + ", but no resolving element was found in:");
                  console.error($el);
                }
              }
              $el.children().hide();
              _results1.push($(pluralizedForm).show());
            }
            return _results1;
          })());
        }
        return _results;
      };

      return InvoiceView;

    })(Backbone.View);
  });

}).call(this);

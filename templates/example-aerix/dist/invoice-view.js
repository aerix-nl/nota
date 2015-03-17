(function() {
  var extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
    hasProp = {}.hasOwnProperty;

  define(['/nota.js', 'underscore.string', 'jed'], function(Nota, s, Jed) {
    return TemplateApp.InvoiceView = (function(superClass) {
      extend(InvoiceView, superClass);

      function InvoiceView() {
        return InvoiceView.__super__.constructor.apply(this, arguments);
      }

      InvoiceView.prototype.el = "body";

      InvoiceView.prototype.initialize = function() {
        _.extend(this, Backbone.Events);
        this.setElement($("body"));
        this.model.on('change', this.render, this);
        return this.i18n = new Jed({
          "missing_key_callback": function(key) {
            return console.error("Missing key in i18n: " + key);
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
          return (this.getFullID()) + "_" + customer + "_" + project + ".pdf";
        } else {
          return (this.getFullID()) + "_" + customer + ".pdf";
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
          invoiceDate: day + " " + month + " " + year,
          expirationDate: validDay + " " + validMonth + " " + validYear
        });
        this._pluralize({
          itemCount: this.model.get("invoiceItems").length
        });
        this.$('span#closing b.total').html(this._formatCurrency(this.model.invoiceTotal()));
        this.$('span#closing b.invoice-id').html(this.getFullID());
        return this;
      };

      InvoiceView.prototype._renderInvoiceTable = function() {
        var $itemPrototype, $row, footerAggregate, index, itemObj, ref;
        $itemPrototype = $(this.$("div#invoice-body table tbody tr.item")[0]).clone();
        this.$('div#invoice-body table tbody').empty();
        ref = this.model.get("invoiceItems");
        for (index in ref) {
          itemObj = ref[index];
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
        var currency, currencySeparator, decimalPlaces, fraction, fractionSeparator, integer, ref, roundedValue, roundingBase;
        fractionSeparator = this.model.fractionSeparator || ',';
        decimalPlaces = this.model.decimalPlaces || 2;
        roundingBase = Math.pow(10, decimalPlaces);
        roundedValue = Math.round(value * roundingBase) / roundingBase;
        ref = roundedValue.toString().split('.'), integer = ref[0], fraction = ref[1];
        fraction = s.pad(fraction, decimalPlaces, '0', 'right');
        currency = this.model.get("currencySymbol");
        currencySeparator = this.model.get("currencySeparator") || ' ';
        return currency + currencySeparator + integer + fractionSeparator + fraction;
      };

      InvoiceView.prototype._mapObjToDOM = function(obj, domScope, directives, recursive) {
        var $el, $matches, el, i, key, len, ref, results, value;
        if (domScope == null) {
          domScope = this.$el;
        }
        if (recursive == null) {
          recursive = domScope !== this.$el;
        }
        obj = _.extend({}, obj, directives);
        ref = _.keys(obj);
        results = [];
        for (i = 0, len = ref.length; i < len; i++) {
          key = ref[i];
          $matches = $('.' + s.dasherize(key) + ', ' + '#' + s.dasherize(key), domScope);
          if (!$matches.length > 0) {
            continue;
          }
          if (Object.prototype.toString.call(key[obj]) === "[object Object]" && recursive) {
            results.push(this._mapObjToDOM(obj[key], domScope, directives));
          } else {
            results.push((function() {
              var j, len1, results1;
              results1 = [];
              for (j = 0, len1 = $matches.length; j < len1; j++) {
                el = $matches[j];
                value = obj[key];
                $el = $(el);
                if (Object.prototype.toString.call(obj[key]) === "[object Function]") {
                  value = value($el);
                }
                if ($el.attr("data-currency") != null) {
                  results1.push($el.html(this._formatCurrency(value)));
                } else {
                  results1.push($el.html(value));
                }
              }
              return results1;
            }).call(this));
          }
        }
        return results;
      };

      InvoiceView.prototype._pluralize = function(obj, domScope) {
        var $el, $matches, catchArbitrary, catchNegative, catchPositive, count, el, i, key, len, pluralizedForm, ref, results;
        if (domScope == null) {
          domScope = this.$el;
        }
        ref = _.keys(obj);
        results = [];
        for (i = 0, len = ref.length; i < len; i++) {
          key = ref[i];
          $matches = $("[data-pluralize='" + (s.dasherize(key)) + "']", domScope);
          if (!$matches.length > 0) {
            continue;
          }
          count = obj[key];
          results.push((function() {
            var j, len1, results1;
            results1 = [];
            for (j = 0, len1 = $matches.length; j < len1; j++) {
              el = $matches[j];
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
              results1.push($(pluralizedForm).show());
            }
            return results1;
          })());
        }
        return results;
      };

      return InvoiceView;

    })(Backbone.View);
  });

}).call(this);

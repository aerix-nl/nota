(function() {
  var dependencies,
    bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
    extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
    hasProp = {}.hasOwnProperty;

  dependencies = ['backbone', 'underscore', 'underscore.string', 'moment', 'moment_nl'];

  define(dependencies, function(Backbone, _, s, moment) {
    var Invoice;
    return Invoice = (function(superClass) {
      extend(Invoice, superClass);

      function Invoice() {
        this.validate = bind(this.validate, this);
        this.currency = bind(this.currency, this);
        this.documentMeta = bind(this.documentMeta, this);
        this.filesystemName = bind(this.filesystemName, this);
        this.documentName = bind(this.documentName, this);
        this.vatPercentage = bind(this.vatPercentage, this);
        this.VAT = bind(this.VAT, this);
        this.invoiceTotal = bind(this.invoiceTotal, this);
        this.invoiceSubtotal = bind(this.invoiceSubtotal, this);
        this.expiryDate = bind(this.expiryDate, this);
        this.invoiceDate = bind(this.invoiceDate, this);
        this.fullID = bind(this.fullID, this);
        this.companyFull = bind(this.companyFull, this);
        this.isInternational = bind(this.isInternational, this);
        this.language = bind(this.language, this);
        return Invoice.__super__.constructor.apply(this, arguments);
      }

      Invoice.prototype.language = function(country) {
        var dutch;
        if (country == null) {
          return 'nl';
        }
        dutch = s.contains(country.toLowerCase(), "netherlands") || s.contains(country.toLowerCase(), "nederland");
        if (dutch) {
          return 'nl';
        } else {
          return 'en';
        }
      };

      Invoice.prototype.isInternational = function(country) {
        return this.language(country) !== 'nl';
      };

      Invoice.prototype.isNaturalInt = function(int, attr) {
        if (isNaN(parseInt(int, 10))) {
          throw new Error(attr + " could not be parsed");
        }
        if (parseInt(int, 10) <= 0) {
          throw new Error(attr + " must be a positive integer");
        }
        if (parseInt(int, 10) !== parseFloat(int, 10)) {
          throw new Error(attr + " must be an integer");
        }
      };

      Invoice.prototype.companyFull = function() {
        return this.get('origin').company + ' ' + this.get('origin').lawform;
      };

      Invoice.prototype.email = function(email) {
        return "mailto:" + email;
      };

      Invoice.prototype.website = function(website) {
        return "https:www." + website;
      };

      Invoice.prototype.fullID = function() {
        var date, meta;
        meta = this.get('meta');
        date = new Date(meta.date);
        return date.getUTCFullYear() + '.' + s.pad(meta.id.toString(), 4, '0');
      };

      Invoice.prototype.invoiceDate = function() {
        if (this.isInternational(this.get('client').country)) {
          moment.locale('en');
        } else {
          moment.locale('nl');
        }
        return moment(this.get('meta').date).format('LL');
      };

      Invoice.prototype.expiryDate = function(date, period, country) {
        if (this.isInternational(this.get('client').country)) {
          moment.locale('en');
        } else {
          moment.locale('nl');
        }
        return moment(this.get('meta').date).add(period, 'days').format('LL');
      };

      Invoice.prototype.clientDisplay = function(client) {
        return client.contactPerson || client.organization;
      };

      Invoice.prototype.itemSubtotal = function(itemObj) {
        var subtotal;
        subtotal = itemObj.price * itemObj.quantity;
        if ((itemObj.discount != null) > 0) {
          subtotal = subtotal * (1 - itemObj.discount);
        }
        return subtotal;
      };

      Invoice.prototype.invoiceSubtotal = function() {
        return _.reduce(this.get('invoiceItems'), ((function(_this) {
          return function(sum, item) {
            return sum + _this.itemSubtotal(item);
          };
        })(this)), 0);
      };

      Invoice.prototype.invoiceTotal = function() {
        return this.invoiceSubtotal() + this.VAT();
      };

      Invoice.prototype.VAT = function() {
        return this.invoiceSubtotal() * this.get('vatPercentage');
      };

      Invoice.prototype.vatPercentage = function() {
        return this.get('vatPercentage') * 100;
      };

      Invoice.prototype.documentName = function() {
        return 'Invoice ' + this.fullID();
      };

      Invoice.prototype.filesystemName = function() {
        var customer, project;
        project = this.get('projectName');
        customer = this.get('client').organization || this.get('client').contactPerson;
        customer = customer.replace(/\s/g, '-');
        if (project != null) {
          project = project.replace(/\s/g, '-');
          return (this.fullID()) + "_" + customer + "_" + project + ".pdf";
        } else {
          return (this.fullID()) + "_" + customer + ".pdf";
        }
      };

      Invoice.prototype.documentMeta = function(data) {
        return {
          'id': this.fullID(),
          'documentName': this.documentName(),
          'filesystemName': this.filesystemName()
        };
      };

      Invoice.prototype.currency = function(value, symbol) {
        var parsed;
        if (symbol == null) {
          symbol = this.get('currencySymbol');
        }
        parsed = parseInt(value);
        if (isNaN(parsed)) {
          throw new Error("Could not parse value '" + value + "'");
        } else {
          return symbol + ' ' + value.toFixed(2);
        }
      };

      Invoice.prototype.capitalize = function(string) {
        return s.capitalize(string);
      };

      Invoice.prototype.validate = function(data) {
        var allItemsValid, date, id, period, postalCode, ref;
        if (!(_.keys(data).length > 0)) {
          throw new Error("Provided model has no attributes. " + "Check the arguments of this model's initialization call.");
        }
        if (data.meta == null) {
          throw new Error("No invoice meta-data provided");
        }
        id = data.meta.id;
        if (id == null) {
          throw new Error("No invoice ID provided");
        }
        if (id != null) {
          this.isNaturalInt(id, "Invoice ID");
        }
        period = data.meta.period;
        if (period != null) {
          this.isNaturalInt(period, "Invoice period");
        }
        date = new Date(data.meta.date);
        if (!((Object.prototype.toString.call(date) === "[object Date]") && !isNaN(date.getTime()))) {
          throw new Error("Invoice date is not a valid/parsable value");
        }
        if (data.client == null) {
          throw new Error("No data provided about the client/target of the invoice");
        }
        if (!(data.client.organization || data.client.contactPerson)) {
          throw new Error("At least the organization name or contact person name must be provided");
        }
        postalCode = data.client.postalcode;
        if ((postalCode.length != null) && !this.isInternational(data.client.country)) {
          postalCode = s.clean(postalCode);
          if (postalCode.length < 6) {
            throw new Error("Postal code must be at least 6 characters long");
          } else if (postalCode.length > 7) {
            throw new Error("Postal code may not be longer than 7 characters");
          } else if (!postalCode.match(/\d{4}\s?[A-z]{2}/)) {
            throw new Error('Postal code must be of format /\\d{4}\\s?[A-z]{2}/, e.g. 1234AB or 1234 ab');
          }
        }
        if (!((((ref = data.invoiceItems) != null ? ref.length : void 0) != null) && data.invoiceItems.length > 0)) {
          throw new Error("No items to show in invoice provided. Must be an array with at least one entry");
        }
        return allItemsValid = _.every(data.invoiceItems, function(item, idx) {
          var price, ref1;
          if (!((((ref1 = item.description) != null ? ref1.length : void 0) != null) > 0)) {
            throw new Error("Description not provided or of no length");
          }
          price = parseFloat(item.price, 10);
          if (isNaN(price)) {
            throw new Error("Price is not a valid floating point number");
          }
          if (!(price > 0)) {
            throw new Error("Price must be greater than zero");
          }
          if ((item.discount != null) && (item.discount < 0 || item.discount > 1)) {
            throw new Error("Discount specified out of range (must be between 0 and 1)");
          }
          if ((item.quantity != null) && item.quantity < 1) {
            throw new Error("When specified, quantity must be greater than one");
          }
        });
      };

      return Invoice;

    })(Backbone.Model);
  });

}).call(this);

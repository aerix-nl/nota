(function() {
  var __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  define(['backbone'], function(Backbone) {
    return TemplateApp.InvoiceModel = (function(_super) {
      __extends(InvoiceModel, _super);

      function InvoiceModel() {
        return InvoiceModel.__super__.constructor.apply(this, arguments);
      }

      InvoiceModel.prototype.init = function() {
        return this.on('change', this.validate, this);
      };

      InvoiceModel.prototype.itemSubtotal = function(itemObj) {
        var subtotal;
        subtotal = itemObj.price * itemObj.quantity;
        if ((itemObj.discount != null) > 0) {
          subtotal = subtotal * (1 - itemObj.discount);
        }
        return subtotal;
      };

      InvoiceModel.prototype.invoiceSubtotal = function() {
        return _.reduce(this.get("invoiceItems"), ((function(_this) {
          return function(sum, item) {
            return sum + _this.itemSubtotal(item);
          };
        })(this)), 0);
      };

      InvoiceModel.prototype.invoiceTotal = function() {
        return this.invoiceSubtotal() + this.VAT();
      };

      InvoiceModel.prototype.VAT = function(value) {
        return this.get("vatPercentage") * (value || this.invoiceSubtotal());
      };

      InvoiceModel.prototype.validate = function(attrs, options) {
        var allItemsValid, date, id, postalCode;
        if (!(_.keys(attrs).length > 0)) {
          throw "Provided model has no attributes. " + "Check the arguments of this model's initialization call.";
        }
        if (attrs.meta == null) {
          throw "No invoice meta-data provided";
        }
        id = attrs.meta.id;
        if (id == null) {
          throw "No invoice ID provided";
        }
        if (isNaN(parseInt(id, 10))) {
          throw "Invoice ID could not be parsed";
        }
        if (parseInt(id, 10) <= 0 || (parseInt(id, 10) !== parseFloat(id, 10))) {
          throw "Invoice ID must be a positive integer";
        }
        date = new Date(attrs.meta.date);
        if (!((Object.prototype.toString.call(date) === "[object Date]") && !isNaN(date.getTime()))) {
          throw "Invoice date is not a valid/parsable value";
        }
        if (attrs.client == null) {
          throw "No data provided about the client/target of the invoice";
        }
        if (!(attrs.client.organization || attrs.client.contactPerson)) {
          throw "At least the organization name or contact person name must be provided";
        }
        postalCode = attrs.client.postalCode;
        if (postalCode.length != null) {
          if (postalCode.length < 6) {
            throw "Postal code must be at least 6 characters long";
          }
        }
        if (!((attrs.invoiceItems != null) && (_.keys(attrs.invoiceItems).length != null) > 0)) {
          throw "No things/items to show in invoice provided. Must be an dictionary object with at least one entry";
        }
        return allItemsValid = _.every(attrs.invoiceItems, function(item, idx) {
          var price, _ref;
          if (!((((_ref = item.description) != null ? _ref.length : void 0) != null) > 0)) {
            throw "Description not provided or of no length";
          }
          price = parseFloat(item.price, 10);
          if (isNaN(price)) {
            throw "Price is not a valid floating point number";
          }
          if (!(price > 0)) {
            throw "Price must be greater than zero";
          }
          if ((item.discount != null) && (item.discount < 0 || item.discount > 1)) {
            throw "Discount specified out of range (must be between 0 and 1)";
          }
          if ((item.quantity != null) && item.quantity < 1) {
            throw "When specified, quantity must be greater than one";
          }
        });
      };

      return InvoiceModel;

    })(Backbone.Model);
  });

}).call(this);

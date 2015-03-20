(function() {
  var dependencies;

  dependencies = ['underscore.string', 'i18next', 'json!translation_nl', 'json!translation_en', 'moment', 'moment_nl'];

  define(dependencies, function(s, i18n, nl, en, moment) {
    var Invoice, localisations;
    localisations = {
      en: {
        translation: en
      },
      nl: {
        translation: nl
      }
    };
    i18n.init({
      resStore: localisations
    });
    return Invoice = {
      formatters: {
        companyFull: function(origin) {
          return origin.company + " " + origin.lawform;
        },
        email: function(email) {
          return "mailto:" + email;
        },
        website: function(website) {
          return "https:www." + website;
        },
        fullID: function(meta) {
          var date;
          date = new Date(meta.date);
          return date.getUTCFullYear() + '.' + s.pad(meta.id.toString(), 4, '0');
        },
        invoiceDate: function(date, country) {
          if (Invoice.predicates.isInternational(country)) {
            moment.locale('en');
          } else {
            moment.locale('nl');
          }
          return moment(date).format('LL');
        },
        expiryDate: function(date, period, country) {
          if (Invoice.predicates.isInternational(country)) {
            moment.locale('en');
          } else {
            moment.locale('nl');
          }
          return moment(date).add(period, 'days').format('LL');
        },
        clientDisplay: function(client) {
          return client.contactPerson || client.organization;
        },
        itemSubtotal: function(itemObj) {
          var subtotal;
          subtotal = itemObj.price * itemObj.quantity;
          if ((itemObj.discount != null) > 0) {
            subtotal = subtotal * (1 - itemObj.discount);
          }
          return subtotal;
        },
        invoiceSubtotal: function(invoiceItems) {
          return _.reduce(invoiceItems, (function(sum, item) {
            return sum + Invoice.formatters.itemSubtotal(item);
          }), 0);
        },
        invoiceTotal: function(invoiceItems) {
          return Invoice.formatters.invoiceSubtotal(invoiceItems) + Invoice.formatters.VAT(vat, invoiceItems);
        },
        VAT: function(price, vat) {
          return vat * price;
        },
        documentName: function(meta) {
          return 'Invoice ' + Invoice.formatters.fullID(meta);
        },
        filesystemName: function(meta, client, project) {
          var customer;
          customer = client.organization || client.contactPerson;
          customer = customer.replace(/\s/g, '-');
          if (project != null) {
            project = project.replace(/\s/g, '-');
            return (Invoice.formatters.fullID(meta)) + "_" + customer + "_" + project + ".pdf";
          } else {
            return (Invoice.formatters.fullID(meta)) + "_" + customer + ".pdf";
          }
        },
        documentMeta: (function(_this) {
          return function(data) {
            console.log(_this);
            return {
              'id': Invoice.formatters.fullID(data.meta),
              'documentName': Invoice.formatters.documentName(data.meta),
              'filesystemName': Invoice.formatters.filesystemName(data.meta, data.client, data.project)
            };
          };
        })(this)
      },
      predicates: {
        isInternational: function(country) {
          var dutch;
          if (country != null) {
            dutch = s.contains(country.toLowerCase(), "netherlands") || s.contains(country.toLowerCase(), "nederland");
            if (dutch) {
              return false;
            }
          }
          return false;
        },
        isNaturalInt: function(int, attr) {
          if (isNaN(parseInt(int, 10))) {
            throw new Error(attr + " could not be parsed");
          }
          if (parseInt(int, 10) <= 0) {
            throw new Error(attr + " must be a positive integer");
          }
          if (parseInt(int, 10) !== parseFloat(int, 10)) {
            throw new Error(attr + " must be an integer");
          }
        }
      },
      i18n: function(key, count) {
        return console.log(key, count);
      },
      validate: function(data) {
        var allItemsValid, date, id, period, postalCode;
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
          Invoice.predicates.isNaturalInt(id, "Invoice ID");
        }
        period = data.meta.period;
        if (period != null) {
          Invoice.predicates.isNaturalInt(period, "Invoice period");
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
        postalCode = data.client.postalCode;
        if ((postalCode.length != null) && !Invoice.predicates.isInternational(data.client.country)) {
          postalCode = s.clean(postalCode);
          if (postalCode.length < 6) {
            throw new Error("Postal code must be at least 6 characters long");
          } else if (postalCode.length > 7) {
            throw new Error("Postal code may not be longer than 7 characters");
          } else if (!postalCode.match(/\d{4}\s?[A-z]{2}/)) {
            throw new Error('Postal code must be of format /\\d{4}\\s?[A-z]{2}/, e.g. 1234AB or 1234 ab');
          }
        }
        if (!((data.invoiceItems != null) && (_.keys(data.invoiceItems).length != null) > 0)) {
          throw new Error("No things/items to show in invoice provided. Must be an dictionary object with at least one entry");
        }
        return allItemsValid = _.every(data.invoiceItems, function(item, idx) {
          var price, ref;
          if (!((((ref = item.description) != null ? ref.length : void 0) != null) > 0)) {
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
      }
    };
  });

}).call(this);

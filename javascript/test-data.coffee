obj = {
  meta:
    id: 15
    date: '2013-12-25'
  origin:
    companyName: 'YourCompany'
    companyLawform: 'Ltd.'
    streetAddress: 'Your Street 13b'
    postAddress: '0987KJ'
    place: 'Yourtown'
    country: 'Your Country'
    email: 'contact@mycompany.com'
    website: 'www.mycompany.com'
    bankAccount: '1234.12.123'
    iban: 'NL12 ABCD 1234 1234 12'
    kvk: '123456789 0000'
    vatNumber: 'AB1233405923489'

  validityPeriod: 2*7 # Invoice is valid for two weeks (should be payed by then)
  vatPercentage: 0.21 # Tax
  currency: "€"

  client:
    organization: 'Client Company Name'
    contactPerson: 'Client Contactperson Name'
    address: 'Client Street 11a'
    postalCode: '6543TR'
    place: 'Client Town'
  opening: 'Optional HTML string which replaces default opening when provided'
  projectName: 'Optional project name which will be placed on top of table'
  invoiceItems: [
    {
      description: 'Service string'
      quantity: 1
      price: 203.23
    }
    {
      description: 'Product string'
      quantity: 14
      # Holy shit you can even write expressions as to maintain readable fractions and stuff!
      price: 66/11
      discount: 0.1 # Optional discount which applies on this item. Floating point value which represents percentage of discount
    }
  ]
  closing: 'Optional HTML string which replaces default closing when provided'
}
# We use define when available (RequireJS function to deliver yielded object as callback argument)
if define? then define obj else return obj
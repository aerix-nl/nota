var Document = require('./dist/document');
var d = new Document('http://localhost:3000');
var p = d.render("hello, world!");

module.exports = p;


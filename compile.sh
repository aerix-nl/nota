#!/bin/bash

# Ensure both PhantomJS, CoffeeScript ans SASS have been installed by Node Package Manager
npm install phantom
npm install coffee-script
npm install sass

# Get our clientside dependencies (jQuery, Backbone.js, Underscore.js)
bower install

# First we ensured all neccessary files are compiled down to native form
# Add --watch to the options start a process that listens to the filesystem changes and automatically recompiles on change events
coffee --compile javascript/*.coffee
sass --compass templates/example-aerix/stylesheets/invoice.css.scss:templates/example-aerix/stylesheets/invoice.css

phantomjs javascript/render-invoice.js #invoice.html invoice.pdf

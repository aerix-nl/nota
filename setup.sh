#!/bin/bash

# Ensure both PhantomJS, CoffeeScript, SASS and Bower have been installed by Node Package Manager
npm install phantom
npm install coffee-script
npm install sass
npm install -g bower

# Get our clientside dependencies (jQuery, Backbone.js, Underscore.js, Bootstrap, FontAwesome etc.)
bower install

# First we ensured all neccessary files are compiled down to native form.
# Add --watch to the options start a process that listens to the filesystem changes and
# automatically recompiles on change events.
# Change the paths in case you're working with your own template
coffee --compile javascript/*.coffee
sass --compass templates/example-aerix/stylesheets/invoice.css.scss:templates/example-aerix/stylesheets/invoice.css
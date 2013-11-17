#!/bin/bash
# Call this script from root of Nota directory

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
coffee --compile javascript/*.coffee
./compile-example-template.sh
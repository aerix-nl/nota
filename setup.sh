#!/bin/bash
# Call this script from root of Nota directory

# We need PhantomJS either though something like brew, apt-get or yum
brew install phantomjs

# Ensure both we have our serverside dependencies installed by the Node Package Manager
npm install phantom
npm install coffee-script
npm install node-sass
npm install -g bower
npm install require
npm install node-compass



# Get our clientside dependencies (jQuery, Backbone.js, Underscore.js, Bootstrap, FontAwesome etc.)
node_moduplus/bower/bin/bower install

# First we ensured all neccessary files are compiled down to native form.
# Add --watch to the options start a process that listens to the filesystem changes and
# automatically recompiles on change events.
node_modules/coffee-script/bin/coffee --compile javascript/*.coffee
./compile-example-template.sh
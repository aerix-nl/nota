#!/bin/bash
# Call this script from root of Nota directory

# We need PhantomJS 1.9 or greater though something like brew, apt-get or yum
sudo apt-get install phantomjs
# On ElementaryOS Luna / Ubuntu 12.04 this means you'll have to do the following instead of that line:
# cd /usr/local/share/
# sudo wget https://phantomjs.googlecode.com/files/phantomjs-1.9.2-linux-x86_64.tar.bz2
# sudo tar xjf phantomjs-1.9.2-linux-x86_64.tar.bz2
# sudo ln -s /usr/local/share/phantomjs-1.9.2-linux-x86_64/bin/phantomjs /usr/local/share/phantomjs
# sudo ln -s /usr/local/share/phantomjs-1.9.2-linux-x86_64/bin/phantomjs /usr/local/bin/phantomjs
# sudo ln -s /usr/local/share/phantomjs-1.9.2-linux-x86_64/bin/phantomjs /usr/bin/phantomjs
# sudo rm phantomjs-1.9.2-linux-x86_64.tar.bz2

# Also we need NodeJS 0.10 or greater
# On ElementaryOS Luna / Ubuntu 12.04 this means you'll have to do the following also:
# sudo apt-get update
# sudo apt-get install -y python-software-properties python g++ make
# sudo add-apt-repository -y ppa:chris-lea/node.js
# sudo apt-get update
sudo apt-get install -y nodejs npm

gem install compass
# Ensure that we have our serverside dependencies installed by the Node Package Manager
npm install

# Get our clientside dependencies (jQuery, Backbone.js, Underscore.js, Bootstrap, FontAwesome etc.)
./node_modules/bower/bin/bower install

# First we ensured all neccessary files are compiled down to native form. Add
# --watch to the options start a process that listens to the filesystem
# changes and automatically recompiles on change events.
./node_modules/coffee-script/bin/coffee --compile javascript/*.coffee
./compile-example-template.sh
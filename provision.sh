#!/bin/bash

echo "Updating apt-get index"
apt-get update > /dev/null 2>&1

echo "Upgrading all current packages"
apt-get upgrade -y > /dev/null 2>&1

echo "Installing new packages"
apt-get install git curl unzip npm nodejs phantomjs -y > /dev/null 2>&1
[ -f /usr/bin/node ] || ln -s /usr/bin/nodejs /usr/bin/node
gem install sass

echo "Installing npm"
cd /vagrant
HOME=/home/vagrant # Apparently this can be set with the -H option in sudo but that did not work for me for some reason
npm install -g npm
npm install

# Required to make npm shut up about statistic sending 
echo "Installing bower"
export CI=true
npm install -g sass bower grunt grunt-cli > /dev/null 2>&1

echo "Running 'bower install'"
sudo -u vagrant bower install #> /dev/null 2>&1

echo 
echo "Good luck with Nota!"
echo "And remember: always enjoy open source ;)"

echo
echo "Provisioning finished"

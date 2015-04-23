#!/bin/bash
echo "Installing Nota dependencies (needs root permission)"
echo " - Updating apt-get index"
apt-get update > /dev/null 2>&1

echo " - Upgrading all current packages"
apt-get upgrade -y > /dev/null 2>&1

echo " - Installing new packages"
apt-get install git curl unzip npm nodejs phantomjs -y > /dev/null 2>&1
[ -f /usr/bin/node ] || ln -s /usr/bin/nodejs /usr/bin/node

echo " - Installing SASS"
\curl -sSL https://get.rvm.io | bash -s stable --ruby > /dev/null 2>&1
gem install sass > /dev/null 2>&1

echo " - Installing NPM"  
npm install -g npm > /dev/null 2>&1

echo " - Installing Bower"
# Required to make npm shut up about statistic sending
export CI=true
npm install -g sass bower grunt grunt-cli > /dev/null 2>&1

echo " - Installing NPM dependencies ('npm install')"
# sudo chown username:username ~/.config/configstore/bower-github.yml
npm install > /dev/null 2>&1

echo " - Installing Bower dependencies ('bower install')"
# sudo chown username:username ~/.config/configstore/bower-github.yml
bower install > /dev/null 2>&1

echo " "
echo "Provisioning finished."
echo " " 
echo "Good luck with Nota!"
echo "And remember: always enjoy open source ;)"

# echo "run 'vagrant ssh' to enter the machine, then 'cd /vagrant'"
# echo "and run one of the examples with 'node dist/nota.js --template=/vagrant/examples/hello_world --data=/vagrant/examples/hello_world/data.json'"


# -*- mode: ruby -*-
# vi: set ft=ruby :

require 'json'

# Vagrantfile API/syntax version. Don't touch unless you know what you're doing!
VAGRANTFILE_API_VERSION = "2"

vagrantConfigFile = "vagrantConfig.json"

if File.exists?(vagrantConfigFile)
  userConfig = JSON.parse(File.read(vagrantConfigFile))
else
  userConfig = {}
end

Vagrant.configure(VAGRANTFILE_API_VERSION) do |config|
  config.vm.box     = "trusty64"
  config.vm.box_url = "https://cloud-images.ubuntu.com/vagrant/trusty/current/trusty-server-cloudimg-amd64-vagrant-disk1.box"
  config.vm.provider :virtualbox do |vb|
      vb.name = "nota-local.inventid.net"
  end

  memory = userConfig["memory"] || 1024
  cpus = userConfig["cpus"] || 1

  config.vm.provider :virtualbox do |vb|
    vb.customize ["modifyvm", :id, "--memory", memory, "--cpus", cpus]
  end


  config.vm.hostname = "nota-local.inventid.net"
  config.vm.provision :shell, :path => "provision.sh"

end

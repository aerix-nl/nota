# Nota

Nota eats your JSON + HTML template and excretes pretty PDF documents.
Perfect for things like automating invoice generation, but not limited to.
Nota can be used for any kind of document typesetting, layout and markup jobs, especially those that require automation and custom processing/rendering of data.
Nota allows you to focus your time on the design and implementation of your template and writing it's logic by providing you a framework for fast previewing and debugging in the web browser, and the modern webdevelopment conveniences of writing in CoffeeScript and SASS on Backbone.js, Underscore.js and the likes.

## Setup

At [inventid](https://www.inventid.nl) we usually use [Vagrant](http://www.vagrantup.com) for our development to prevent machine pollution and isolate conflict.
So for your convenience, we have included a Vagrant machine.

Setting this up is easy:

1. Install Vagrant
1. Move the the place where you cloned the repository
1. Run `vagrant up`, this takes a few minutes.
1. Once done, as separate Ubuntu 14.04 LTS box is installed.
1. You can either SSH into the machine with `vagrant ssh` or simply run your first generation with `vagrant ssh -c "cd /vagrant && node dist/nota.js --template=/vagrant/examples/hello_world --data=/vagrant/examples/hello_world/data.json"`
1. The `output.pdf` file appears in the root of the repository.

In case you prefer to install it yourself on your machine this is of course also possible:

1. Open the location you cloned the repository in the terminal.
1. Install the following packages `git npm nodejs phantomjs`
1. Ensure the `node` executable is in your path `[ -f /usr/bin/node ] || ln -s /usr/bin/nodejs /usr/bin/node`
1. Install the sass gem `gem install sass`
1. Run npm `npm install`
1. Install additional npm packages `npm install -g sass bower grunt grunt-cli`
1. Run bower `bower install`
1. Create your first PDF with the following command `node dist/nota.js --template=examples/hello_world --data=examples/hello_world/data.json`

## Architecture

Technically this NodeJS package is a pipeline consisting primarily out of PhantomJS (headless WebKit for rendering the HTML and capturing PDF) with the [phantomjs-node](https://github.com/sgentle/phantomjs-node) bindings for interfacing using NodeJS, and some frameworking to make the job and building templates and rendering them easier.

## Usage

To get a feel of Nota, run  the following line:
````
node dist/nota.js --template=examples/hello_world --data=examples/hello_world/data.json
````

When finished Nota has rendered a very simple PDF page, consisting of nothing much.
Try it yourselves with any of the examples provided.

You can use any inline CSS or linked stylesheets.
Any of the images you use should be available in the template directory.

Add the switch `--template=<dir>` to select a template by directory.
Add the switch `--json=<path>` with a path from the Nota root directory to the JSON that should be rendered.

## Fonts

Due to a bug in PhantomJS ([see here](http://arunoda.me/blog/phantomjs-webfonts-build.html)), the loading of webfonts (even if they're locally hosted) is broken. For now you'll have to install the fonts on the system manually, and then they'll load as expected.

### How to suggest improvements?

We are still actively developing Nota for our internal use, but we would already love to hear your feedback.
In case you have some great ideas, you may just [open an issue](https://github.com/inventid/nota/issues/new).
BBe sure to check beforehand whether the same issue does not already exist.

### How can I contribute?

We feel contributions from the community are extremely worthwhile.
If you use Nota in production and make some modification, please share it back to the community.
You can simply [fork the repository](https://github.com/inventid/nota/fork), commit your changes to your code and create a pull request back to this repository.

### Collaborators

We would like to thank the developers which contributed to Nota, both big and small.

- [FelixAkk](https://github.com/FelixAkk) (Original developer of Nota)
- [joostverdoorn](https://github.com/joostverdoorn) (Developer @ [inventid](https://www.inventid.nl))
- [rogierslag](https://github.com/rogierslag) (Developer @ [inventid](https://www.inventid.nl))

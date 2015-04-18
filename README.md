# Nota
<img src="https://dl.dropboxusercontent.com/u/5121848/Nota_demo.png">

Nota eats your template (HTML5+CSS3+optionally JS) + optionally your data
(JSON) and excretes pretty PDF documents. Perfect for things like automating
invoice or ticket generation, but also simply compiling a static document to
PDF. Nota can be used for any kind of document typesetting, layout and markup
jobs, especially those that require automation and custom
processing/presentation of data.

Develop and debug while feeling right at home in your favorite browser, with a
1:1 preview of what Nota turns into a .PDF for you. Nota makes designing and
programming your documents a breeze with `--preview`.

Spare yourself the mind numbing routine of creating series of
documents in Microsoft Word, Adobe CS, LaTeX or whatever ancient means of
getting your PDF fix. Use the Nota API to process your bulk jobs and banish
intellectual slave labour.
```
jobs = [{
  data:       'data1.json'
  outputPath: 'output1.pdf'
}, {
  data:       'data2.json'
  outputPath: 'output2.pdf'
}]
server.render jobs
```

## Setup
Due to kinks (see [Known problems](https://github.com/FelixAkk/nota#known-problems)) in the depencencies that are still being
worked out, Nota is a bit picky on it's environment and dependencies. We
recommend running Nota in a virtual environment, and this is easy with
[Vagrant](http://www.vagrantup.com). This also prevents machine pollution and
isolates conflict. So for your convenience, we have included a Vagrant machine
specification, but you can also install is as usual directly on your machine.

Fancy virtual setup using Vagrant:

1. Install Vagrant
1. Move the the place where you cloned the repository
1. Run `vagrant up`, this takes a few minutes.
1. Once done, as separate Ubuntu 14.04 LTS box is installed.
1. You can either SSH into the machine with `vagrant ssh` or simply run your
   first generation with `vagrant ssh -c "cd /vagrant && node dist/nota.js
   --template=/vagrant/examples/hello_world
   --data=/vagrant/examples/hello_world/data.json"`
1. The `output.pdf` file appears in the root of the repository.

Old skool setup on the bare metal:

1. Open the location you cloned the repository in the terminal.
1. Install the following packages `git npm nodejs phantomjs`
1. Ensure the `node` executable is in your path `[ -f /usr/bin/node ] || ln -s
   /usr/bin/nodejs /usr/bin/node`
1. Install the sass gem `gem install sass`
1. Run npm `npm install`
1. Install additional npm packages `npm install -g sass bower grunt grunt-cli`
1. Run bower `bower install`
1. Create your first PDF with the following command `node dist/nota.js
   --template=examples/hello_world --data=examples/hello_world/data.json`

## Architecture

Technically this primarily consists out of a pipeline of
[PhantomJS](http://phantomjs.org/) (headless WebKit browser for rendering HTML
and capturing PDF) with the [phantomjs-node](https://github.com/sgentle
/phantomjs-node) bindings for interfacing using
[Node.js](https://nodejs.org/). So all the credits really go out to them. This
package is mostly some frameworking and task automation around the
beforementioned, to make the job of crafting and rendering templates easier.

## Usage

To get a feel of Nota, run the following line in the package root:
````
./nota --template=example-aerix
````

When finished Nota has rendered a simple PDF page, consisting of some custom
rendering of preview data as declared in the template `bower.json`. Change the
company logo image and try modifing the example data to see how easy it is to
customise it and create your own invoice.

Try `./nota --list` for a list of example templates. Some of the simpler
static "Hello World" templates can be extended with any inline CSS, linked
stylesheets or JavaScript. You can also write in SASS and CoffeeScript and
have it automagically compiled by running `grunt` in the template root.

Add the switch `--template=<dir>` to select a template by directory. Add the
switch `--data=<path>` with a path if any JSON should rendered. Add the switch
`--port=<port>` with a port (larger than 1024) to select which port to use.
This is useful for situations in which you are working on lots of PDFs
simultaneously.

By default Nota will output the PDF in the root rolder of itself, in a file
called `output.pdf`. When this is not want you want, simply add
`--output=x.pdf` (which will save the file in the Nota root folder) or
`--output=/tmp/x.pdf` (which saves the file on the absolute path).

## Creating templates

### Template types

Right now we recommend copying either one of the following example templates:

* Static template example: `example-doc`
* Model driven scripted template example: `example-invoice`

### Difference between static, dynamic and model driven
Nota will scan the `template.html` for any `<script>` tag, and if there are none, it automatically assume it's stand-alone: `static`. This will make it wait for all page resources to have finished loading and then perform the capture automatically. This makes Nota a luxury equivalent of [rasterize.js](https://github.com/ariya/phantomjs/blob/master/examples/rasterize.js).

If there are script tags found Nota will also wait for all resources to finish loading, and then check if listen if the template calls the Nota API. If no `Nota.trigger 'template:init'` client API call has been made after 

 It will do this by waiting for a timeout to any API call as defined in `config-default.json` to see if the template called the Nota client API with  to know if it has

### Data driven templates
These 
If Nota finds there are 

. Otherwise, it will wait an API 

* Static HTML
* Dynamic through selfsufficient JavaScript: 
* Dynamic, driven by required data model(s) which Nota provides

Here's the internal keyword Nota uses to designate each, and the role Nota takes with each:

* `static`: 
* `dynamic-stand-alone`: Makes Nota like a photographer that waits untill the page has loaded and pose for the picture

takes a slightly different role for each

## Known problems

Nota is young, experimental, and built on a still developing tech stack. There
are still quite some shortcomings and bugs (none that aren't likely to be
fixed in the near future). That said, we've been able to use Nota in
production environments already. If you take care to test your setup, verify
the results and can live with some workarounds, you should be fine. Consider
the current version a showcase of the potential of this tech stack and the
future of Nota. Here's some things to take into account:

#### No clickable hyperlinks
Even though WebKit supports this, due to a
[bug](https://github.com/ariya/phantomjs/issues/10196) in QtWebKit which
PhantomJS builts on the current output PDFs have no clickable links. This has
quite some pressing attention, so it's likely to be fixed soon, but no fix
committed yet. For now we recommend making links that have URL as the text so
users can copy-paste that, or avoid them.

#### Selectable text
It seems PhantomJS only generates PDFs with selectable text on Linux due to a
[bug](https://github.com/ariya/phantomjs/issues/10373). For now we recommend
using the Vagrant spec to run Nota virtualized on Linux. Needs checking if
solved in PhantomJS 2.

#### Fonts
Due to [a bug](https://github.com/ariya/phantomjs/issues/10592) in
PhantomJS, the loading of webfonts (even if they're locally hosted) seems
broken. For now you'll have to install the fonts on the system itself, and
then they'll load as expected. Needs checking if solved in PhantomJS 2.

#### Color definitions revert to black
It looks like all use of color in the CSS (for text/borders/backgrounds etc.)
is lost and reverted to black upon rendering. This can be worked around for
the while by adding the `!important` keyword after all the color declaration,
e.g. like this `h1 { color: red !important }`. More research needed on why and
other solutions.

#### Paper size and zoom factor
It looks like when rendering the page receives a zoom factor of about 1.068 is
applied, causing the content flow to run longer than what is seen when
rendered in the web browser. This is likely to be fixed, or at least allow for
a compensating counter zoomfactor in PhantomJS 2 according to [this
bug](https://github.com/ariya/phantomjs/issues/12685). For now we recommend
creating extra space for content flow or making some seperate CSS declarations
for print, like a smaller font size to counter this.

## Meta

#### Developers
Nota was originally comissioned by [Aerix](https://www.aerix.nl) to automate
the task of invoice generations after alternatives like LaTex or MS Office
proved insufficient in the flexibility and easy of producing neatly designed
documents through a programmable interfaces.

Shortly after [inventid](https://www.inventid.nl) joined in on development
after it adopted Nota for automating the generation of event tickets.

Both Aerix and inventid are two young Dutch internetbureaus who are
passionate about making shiny apps and contributing to open source innovation.

#### How to suggest improvements?
We are still actively developing Nota for our internal use, but we would
already love to hear your feedback. In case you have some great ideas, you may
just [open an issue](https://github.com/inventid/nota/issues/new). Be sure to
check beforehand whether the same issue does not already exist.

#### How can I contribute?
We feel contributions from the community are extremely worthwhile. If you use
Nota in production and make some modification, please share it back to the
community. You can simply [fork the
repository](https://github.com/inventid/nota/fork), commit your changes to
your code and create a pull request back to this repository.

#### Collaborators
We would like to thank the developers which contributed to Nota, both big and
small.

- [FelixAkk](https://github.com/FelixAkk) (Original developer of Nota,
  developer @ [Aerix](https://www.aerix.nl))
- [joostverdoorn](https://github.com/joostverdoorn) (Developer @
  [inventid](https://www.inventid.nl))
- [rogierslag](https://github.com/rogierslag) (Developer @
  [inventid](https://www.inventid.nl))


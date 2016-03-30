# Nota
<img src="https://dl.dropboxusercontent.com/u/5121848/Nota/Diagram.png">
<img src="https://dl.dropboxusercontent.com/u/5121848/Nota/Example-job.png">

Nota hosts your HTML based template, allows you to render in your data and
excretes pretty documents. Stand-alone HTML, recommended for digital transfer,
or PDF, recommended for print (analog transfer). Perfect for automating things
like bulk invoice or ticket generation.

## Usage
There are several ways to interface with Nota.

#### CLI
Use [Nota CLI](https://github.com/aerix-nl/nota-cli) package to call Nota
using your shell. Currently supports single jobs only. See there readme on the
repository for usage options.

#### API
For batch rendering, directly interface with Nota in Node.js. Call queue with
an array of [job](https://github.com/aerix-nl/nota) objects:

```javascript
var nota = require('nota');
nota.setTemplate(template);
nota.queue([job1, job2, job3]);
```

Where a template looks like:
```javascript
template = {
  path: 'path/to/template-dir'
}
```

And a job object looks like:
```javascript
job = {
  // hash containing data for your template model
  data: {},
  // alternatively provide a path
  dataPath: 'path/to/data.json',
  // Optional. Can also extend with filename to fix output or if template doesn't specify one
  outputPath: 'path/to/output/dir',
  // if you don't want to overwrite an existing file if output get's same name
  preserve: true,
  // buildTarget: 'pdf' // or 'html' (alternatively your template can specify per job)

}
```

#### Web interface & REST API
To create your PDF's though a friendly UI where you can upload a JSON file and
get a PDF in return, try the webinterface. Or use the REST API to expose Nota
over the interwebs, LAN or secure VPN. Send a POST request with JSON, and get
a PDF download in return. Run [Nota CLI](https://github.com/aerix-nl/nota-cli)
with the `--listen` flag. For example, try in your shell:

```bash
nota --template=example-invoice --listen
```

## Prerequisites

You will need the following things properly installed on your computer.

* [Git](http://git-scm.com/)
* [Node.js](http://nodejs.org/) (with NPM)
* [Bower](http://bower.io/)
* [PhantomJS v1.9.8](http://phantomjs.org/)

## Setup
Due to some shortcomings (see [Known problems](https://github.com/FelixAkk/nota#known-problems))
in the depencencies that are still being worked out, Nota is a bit
picky on it's environment and dependencies. We recommend running Nota under
Linux.

## [Wiki](https://github.com/aerix-nl/nota/wiki)
Check out the wiki for documentation on the API, architecture, examples, how
to's, known problems, scability etc.

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


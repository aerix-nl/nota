# Nota
<img src="https://dl.dropboxusercontent.com/u/5121848/Nota_demo.png">

Nota eats your HTML based static or scripted template, allows you to mix in
your data and excretes pretty PDF documents. Perfect for automating things
like invoice or ticket generation, but also a convenient tool rendering a
simple static document to PDF.


## Features

#### Web interface
Run Nota as a webservice, and create your PDF's though a friendly UI where you can upload a JSON file and get a PDF in return. Or use the REST API to expose Nota over your the interwebs or LAN (or VPN). Send a POST request with JSON, and get a PDF download in return. Try in your shell:
```bash
nota --template=example-invoice --listen
```

#### Shell interface
Nota has lot of handy CLI options. Try running in the root:
```bash
nota --list
```
You'll see Nota comes with a few example templates out of the box. Try:
```bash
nota --template=example-invoice
```
When finished Nota has rendered a simple PDF page, consisting of some custom
rendering of preview data as declared in the template `bower.json`. Change the
company logo image and try modifing the example data to see how easy it is to
customise it and create your own invoice. Then render your own data with
`--data=<path>` and set the PDF destination with `--output=<path>` and you're
creating your own invoices!

#### Development ease
Develop and debug while feeling right at home in your favorite browser, with a
1:1 preview of what Nota turns into a PDF for you. Nota makes designing and
programming your documents a breeze with some ready examples that
automagically compile CoffeeScript and SASS. Try in your shell:
```bash
cd templates/examples-invoice && grunt
nota --template=example-invoice --preview
```
And you're ready to start customizing!

#### API
Spare yourself the mind numbing routine of creating series of
documents in Microsoft Word, Adobe CS, LaTeX or whatever ancient means of
getting your PDF fix. Use the Nota API to process your bulk jobs and banish
intellectual slave labour. Try in your Node CoffeeScript:
```coffeescript
nota = require('nota')
nota.queue [job1, job2, job3]
```


## Setup
Due to kinks (see [Known problems](https://github.com/FelixAkk/nota#known-
problems)) in the depencencies that are still being worked out, Nota is a bit
picky on it's environment and dependencies. We recommend running Nota under
Linux, and we've made a provisioning script that sets up all dependencies for
Linux (and unverified support for Mac and Windows under cywin).
```bash
chmod +x provision.sh
./provision.sh
```

## Architecture
Technically this primarily consists out of a pipeline of
[PhantomJS](http://phantomjs.org/) (headless WebKit browser for rendering HTML
and capturing PDF) with the [phantomjs-node](https://github.com/sgentle
/phantomjs-node) bindings for interfacing using
[Node.js](https://nodejs.org/). So all the credits really go out to them. This
package is mostly some CoffeeScript based API en UI frameworking around
the beforementioned, to make the job of crafting and rendering templates
easier.


## Creating templates
For now we recommend copying and adapting either one of the following
example templates:

* Static template example: `example-doc`
* (Model driven) scripted template example: `example-invoice`

They are extensively commented and should help you give an idea of teh
template structure.

#### Static templates
The most simple template is a static template. Nota will scan the
`template.html` for any `<script>` tag. If there are none, it automatically
assumes the template is `static`. When rendering in this mode Nota will wait
for all the template's page resources like images to have finished loading and
then perform the capture automatically. This makes Nota a luxury equivalent of
[rasterize.js](https://github.com/ariya/phantomjs/blob/master/examples/rasterize.js).

#### Scripted templates 
If there are script tags found Nota will also wait for all page resources to
finish loading before injecting data and capturing. After the resources have
been loaded Nota will allow the template some time set up and allow possible
template code to initialize. This timeout duration is defined in `default-
config.json` at `document.templateTimeout`.

After that timeout the `page:ready` event is automatically triggered
internally, and after the `document.renderTimeout` period the capture is
performed. If data has been provided for the job, the data is made available
and your template at the URI `/data.json`.

#### Nota client API for scripted and model driven templates
If twice this timeout is way more than you need, you can skip this wait by
talking to the Nota client API. Require the Nota client from the address
`/nota.js`, which will expose the `Nota` client object which exposes
`Nota.trigger` to send string events to the backend. The events are namespaced
with a semicolon as you'll see futher on.

By triggering `'template:loaded'` you can signal the template has finished
setup and initialization, and skip the remainder of the timeout.

If your tempalte needs more time to load then you can cancel this timeout by
triggering `'template:init'` at the start of your template initialisation.

If you've provided data for a job, you can then wait for it's injection by
listening to `Nota.on 'data:injected'` with a callback that will receive the
data. During preview you can use `Nota.getData(callback)` to fetch the data. A
little abstraction for AJAX'ing `/data.json`.

When your template is finished rendering you can skip the remainder of timeout
again by triggering `'template:render:done'` after which the capture is
performed.

If instead you need more time, you can cancel the timeout by triggering
`'template:render:start'`.

Per job your template can provide Nota with meta data about the current document
capture. During the caputure the Nota backend will request the meta data from the `Nota.getDocumentMeta` interface.

Use `Nota.setDocumentMeta` to set a object (or function that yields such an
object) like:
```
meta = {
  filename:       'Invoice_2014.0042-Client_Name.pdf'
  id:             '42'
  documentTitle:  'Invoice 2013.0042'
````
Currently only the `filename` is used by Nota, but you can supplement it with
whatever data you like, and have you application that builds on Nota use that.

The `filename` property provides a way for the Nota backend to 'asks' your
template for a suggested filename. If no output filename is provided, or the
output path is a directory, then this filename will be used.


## Scalability
On a MacBook Pro mid-2012 Core i7, 16GB RAM rendering the `example- invoice`
template with preview data takes about 0.37 seconds. Performance
degradations haven't been noticed for queues up to a 100 jobs. Testing beyond
that is still needed. Scability might be hindered because job queues are
rendered using recursion. This is because of the asynchronous nature
of libraries required for rendering. Some investigation on space and time
complexity is still need.


## Known problems
Nota is young, experimental, and built on a still developing tech stack. There
are still quite some shortcomings and bugs (none that aren't likely to be
fixed in the near future). That said, we've been able to use Nota in
production environments already. If you take care to test your setup, verify
the results and can live with some workarounds, you should be fine. Consider
the current version a showcase of the potential of this tech stack and the
future of Nota. Here's some things to take into account:

#### No clickable hyperlinks
Even though WebKit supports this, due to
[a bug](https://github.com/ariya/phantomjs/issues/10196) in QtWebKit which
PhantomJS builts on the current output PDFs have no clickable links. This has
quite some [pressing attention](https://www.bountysource.com/issues/303463
-suggestion-include-hyperlink-action-in-pdf-output-for-hyperlinks-in-
webpage/backers), so it's likely to be [fixed
soon](https://github.com/ariya/phantomjs/pull/13171), but no fix committed
yet. For now we recommend making links that have the URL as the text so users
can copy-paste that.

#### Hyperlink expansion
It seems that as an attempt to compensate for the lack of links, PhantomJS takes
the `href` value of a link and suffixes it to the link's inner HTML, rendering
a link like `<a href="www.somewhere.com">link</a>` into `<a
href="somewhere.com">link (www.somewhere.com)</a>`. This also causes a flow
expansion that breaks 1:1 correspondence of screen to print output, and can
even break layouts when context flow it lightly fitted. To prevent this, for
now Nota subsitutes all `<a>` tags with `<span class="hyperlink">` tags with
equal inner HTML. For identical styling, we recommend a selector like `a,
span.hyperlink` in your template CSS.

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
It looks like when rendering with PhantomJS 1.9.x the page receives a zoom
factor of about 1.068, causing the content flow to run longer than
what is seen when rendered in the web browser. This is likely to be fixed, or
at least allow for a compensating counter zoomfactor in PhantomJS 2 according
to [this bug](https://github.com/ariya/phantomjs/issues/12685). But at the
time of writing PhantomJS 2 has an even larger zoom factor, and a broken
zoomfactor setter. For now we recommend either creating extra space for
content flow or making a CSS stylesheet for print, with a smaller font size to
counter this.


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


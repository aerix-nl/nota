# Nota
<img src="https://dl.dropboxusercontent.com/u/5121848/Nota_demo.png">

Nota eats your HTML based static or scripted template, allows you to mix in
your data and excretes pretty PDF documents. Perfect for automating things
like invoice or ticket generation, but also a convenient tool rendering a
simple static document to PDF.

## Usage
There are several ways to interface with Nota.

#### Web interface and REST API
To create your PDF's though a friendly UI where you can upload a JSON file and
get a PDF in return, try the webinterface. Or use the REST API to expose Nota
over the interwebs, LAN or secure VPN. Send a POST request with JSON, and get
a PDF download in return. Set up the
[Nota CLI](https://github.com/aerix-nl /nota-cli) and try in your shell:

```bash
nota --template=example-invoice --listen
```

#### CLI
Alternatively you can use the command line to directly interface with Nota
using the [Nota CLI](https://github.com/aerix-nl/nota-cli) package. See there
readme on the repository for usage options.

#### API
Spare yourself the mind numbing routine of creating large batches of
documents in Microsoft Word, Adobe CS, LaTeX or whatever ancient means of
getting your PDF fix. Use the Nota API to process your bulk jobs and banish
intellectual slave labour. Try in your Node CoffeeScript:

```coffeescript
nota = require('nota')
nota.queue [job1, job2, job3]
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

#### Hyperlink length expansion
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
setting up Nota on a Linux server, or using Vagran to run Nota in a Linux
virtualization on MacOSX or Windows. Needs checking if solved in PhantomJS 2.

#### Custom fonts
Due to [a bug](https://github.com/ariya/phantomjs/issues/10592) in
PhantomJS, the loading of webfonts (even if they're locally hosted) seems
broken. For now you'll have to install the fonts on the system itself. This
works for MacOSX and Windows. Though on Linux PhantomJS should query to font
from Freedesktop.org's Fontconfig, I've been unable to get this to work.
Installing a font should be possible by converting the font files to Type1,
placing them in `/usr/share/fonts/type1`, rebuilding the font cache. It's
recommended to use `fc-cache -fv` to force it and print the verbose output so
you can check whether it picked up the new fonts and indexed it. Check that
your font is now recognized with `fc-match`. Despite all these signs of the
font being available, I've been unable to get PhantomJS to pick up new fonts
on Linux. Check out
[this guide](https://medium.com/@stockholmux/besting-phantomjs-font-problems-ee22795f5c0b)
for more details of how it should be possible. Needs verification from other
Linux users if indeed broken, and also needs checking if solved in PhantomJS
2.

#### Font weights being ignored
It seems PhantomJS only supports use of 'normal' and 'bold' values in the CSS
`font-weight` attribute. As a result thin fonts will be rendered with normal
weight. Needs checking if reproducible.

#### Color definitions revert to black
It looks like all use of color in the CSS (for text/borders/backgrounds etc.)
is lost and reverted to black upon rendering. This can be worked around for
the while by adding the `!important` keyword after all the color declaration,
e.g. like this `h1 { color: red !important }`. Note that this only works for
elements where the selector directly applies. Subelements who would normally
inherit a color definition still revert back to black. More research needed on
why and other solutions.

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

#### Styling page header and footer
It's possible to render page numbers on your page by setting
`Nota.setDocumentHeader` and `Nota.setDocumentFooter` with `{ content:
"<Handlebars.JS HTML template>", height: "x", width: "y" }` (width is
optional). See an example here. The variables `pageNum` and `numPages` are
available in the template for formatting page numbers. Both seem to be
rendered as new separate pages during capturetime, which are then inserted in
the template, so no styling or scripting of the original template is
accessible. Limitation of
PhantomJS.

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


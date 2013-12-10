Nota
====
Nota eats your JSON + HTML template and excretes pretty PDF documents. Perfect for things like automating invoice generation, but not limited to. Nota can be used for any kind of document typesetting, layout and markup jobs, especially those that require automation and custom processing/rendering of data. Nota allows you to focus on the design of your template and writing the logic, while providing you a framework for fast previewing and debugging in the web browser, and modern development convenience of writing in CoffeeScript and SASS.

Setup
=====
Check out `setup.sh`, which assuming that you have `apt-get`, `npm` and `node` (NodeJS) installed will resolve all the dependencies. Change the package managers according to your environment.

Architecture
=====
Technically it's a NodeJS package, consisting pretty much of PhantomJS (headless WebKit for rendering the HTML and capturing PDF) with node-phantom as a binding for NodeJS, and some frameworking and classes to make this job and building templates easier.

Usage
=====
To get a feel of Nota, run  the following line:
```
node javascript/render-invoice.js --template aerix
```
When finished Nota has rendered the example Aerix template (open `templates/aerix-example/template.html` in your browser), with some test JSON as input (`templates/aerix-example/test-model.json` to be more specific) to a PDf file in the Nota root directory. Notice that the filename also demonstrates how you can do programmatic
filenaming by exposing the `filesystemName` function in the template view class, which Nota-server will
poll to see if it yields a usable filename.

Add the switch `--list` to show all recognized templates.
Add the switch `--template <name>` to select a template by name as defined in the `define-template.json` file (not the template directory name).
Add the switch `--json <path>` with a path from the Nota root directory to the JSON that should be rendered.

### Building your own templates
More details and a tutorial will follow. For now; when developing your own template layout and logic I recommend copying the example template and adapting from there.
Just open the template `template.html` in your browser and enjoy the ease of development and debugging in your web-browser of choice. Check out `compile-example-template.sh` to read how templates are compiled.

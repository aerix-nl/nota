Nota
====
Nota eats JSON + your HTML template and excretes pretty PDF documents. Perfect for things like automating invoice generation.

Setup
=====
Check out setup.sh, which assuming that you will have NodeJS and Ruby installed will set up the environment.

Usage
=====
From the working directory of Nota, run the following line:
```
node javascript/render-invoice.js
```
Or when developing your own template layout and logic, just open the template .html in your browser and enjoy the ease
of development in your webbrowser of choice.

### Templates
Right now full template support isn't finished.

### JSON input
Right now Nota always uses `javascript/test-data.js` as the input, though this can be easily changed
in `javascript/render-invoice.js`, but command line direction using switches will be available soon.

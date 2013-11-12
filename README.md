Nota
====
Nota eats JSON + your HTML template and excretes pretty PDF documents. Perfect for things like automating invoice generation.

Setup
=====
Check out `setup.sh`, which assuming that you will have NodeJS and Ruby installed will set up the environment.

Usage
=====
From the working directory of Nota, run the following line:
```
node javascript/render-invoice.js
```
Which will place an `invoice.pdf` file in the working directory. 

### Templates
Right now full template support isn't finished. When developing your own template layout and logic I recommend 
adapting the example at the moment. Just open the template `invoice.html` in your browser and enjoy the
ease of development in your web-browser of choice.

### JSON input
Right now Nota always uses `javascript/test-data.js` as the input, though this can be easily changed
in `javascript/render-invoice.js`, but command line direction using switches will be available soon.

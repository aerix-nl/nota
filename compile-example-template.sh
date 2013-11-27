# Change the paths in case you're working with your own template
node_modules/coffee-script/bin/coffee --compile templates/example-aerix/javascript/*.coffee
# you might need to use: ~/.rvm/gems/ruby-1.9.3-p484/bin/sass sass --compass templates/example-aerix/stylesheets/invoice.css.scss:templates/example-aerix/stylesheets/invoice.css
sass --compass templates/example-aerix/stylesheets/invoice.css.scss:templates/example-aerix/stylesheets/invoice.css
(function() {
  requirejs.config({
    paths: {
      'backbone': '/vendor/backbone/backbone',
      'jquery': '/vendor/jquery/dist/jquery',
      'underscore': '/vendor/underscore/underscore',
      'json': '/vendor/requirejs-plugins/src/json',
      'text': '/vendor/requirejs-text/text',
      'requirejs': '/vendor/requirejs/require'
    }
  });

  define(['backbone', 'json'], function() {
    var $data, $filename, $upload, reader;
    $upload = $('#upload');
    $data = $('#data');
    $filename = $('#data-filename');
    reader = new FileReader();
    $upload.on('click', function(e) {
      e.preventDefault();
      return $data.click();
    });
    return $data.on('change', function(e) {
      var file;
      file = e.target.files[0];
      $filename.html(file.name);
      $('section.main form').addClass('hidden');
      $('section.main div.jumbotron').removeClass('hidden');
      reader.onload = function() {
        return $.ajax({
          type: 'POST',
          url: '/render',
          data: reader.result,
          contentType: 'application/json'
        }).done(function(res) {
          return console.log(res);
        }).fail(function(err) {
          return console.log(err);
        });
      };
      return reader.readAsText(file);
    });
  });

}).call(this);

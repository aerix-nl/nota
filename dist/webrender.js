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
    var $cancel, $dataProto, $filename, $form, $upload, showBlock;
    $upload = $('#upload');
    $dataProto = $('#data').remove();
    $filename = $('#data-filename');
    $form = $('section.main form');
    $cancel = $('#cancel');
    showBlock = function(block) {
      $('section.main form').toggleClass('hidden', block !== 'form');
      $('div.loading').toggleClass('hidden', block !== 'loading');
      $('div.fail').toggleClass('hidden', block !== 'fail');
      return $('div.done').toggleClass('hidden', block !== 'done');
    };
    $upload.on('click', function(e) {
      var $data;
      e.preventDefault();
      $data = $dataProto.clone();
      $form.append($data);
      $data.on('change', function(e) {
        var jsonFile, reader;
        jsonFile = e.target.files[0];
        $filename.html(jsonFile.name);
        reader = new FileReader;
        reader.onload = function(err) {
          var $dataRead;
          $dataRead = $("<input name='data'>").val(reader.result).hide();
          $form.append($dataRead);
          $form.submit();
          $data.remove();
          return $dataRead.remove();
        };
        reader.readAsText(jsonFile);
        return showBlock('loading');
      });
      return $data.click();
    });
    return $cancel.on('click', function(e) {
      return showBlock('form');
    });
  });

}).call(this);

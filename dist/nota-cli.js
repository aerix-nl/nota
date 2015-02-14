(function() {
  var Nota;

  Nota = (function() {
    function Nota(argv) {
      var data, dataPath, outputPath, preview, templatePath;
      dataPath = argv.data;
      templatePath = argv.template;
      preview = argv.show;
      outputPath = argv.output;
      if (argv.port != null) {
        this.serverPort = argv.port;
      }
      if (argv.list != null) {
        return this.listTemplatesIndex();
      }
      if (argv.template == null) {
        throw new Error("Please provide a template directory with '--template=<dir>'.");
      }
      if (argv.data == null) {
        throw new Error("Please provide a data JSON file with '--data=<file>'.");
      }
      if (!_.str.startsWith(templatePath, '/')) {
        templatePath = this.templatesPath + '/' + templatePath;
      }
      if (!(fs.existsSync(templatePath) && fs.statSync(templatePath).isDirectory())) {
        throw new Error("Failed to find template '" + templatePath + "'.");
      }
      if (!_.str.startsWith(dataPath, '/')) {
        dataPath = templatePath + '/' + dataPath;
      }
      if (!this.fileExists(dataPath)) {
        if (!_.str.endsWith(dataPath, '.json')) {
          dataPath = dataPath + '.json';
          if (!this.fileExists(dataPath)) {
            throw new Error("Failed to find data '" + dataPath + "'.");
          }
        }
      }
      data = JSON.parse(fs.readFileSync(dataPath, {
        encoding: 'utf8'
      }));
    }

    return Nota;

  })();

}).call(this);

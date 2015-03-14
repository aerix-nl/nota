(function() {
  module.exports = function(grunt) {
    grunt.initConfig({
      pkg: grunt.file.readJSON("package.json"),
      srcDir: "./src",
      outputDir: "./dist",
      coffee: {
        options: {
          bare: true
        },
        all: {
          files: [
            {
              expand: true,
              cwd: 'src/',
              src: ['**/*.coffee'],
              dest: 'src/',
              ext: '.js'
            }
          ]
        }
      },
      react: {
        all: {
          files: {
            "<%= outputDir %>": "<%= srcDir %>"
          }
        }
      },
      regarde: {
        coffee: {
          files: "<%= srcDir %>/**/*.coffee",
          tasks: ["coffee", "spawn_react"]
        }
      },
      clean: {
        output: "<%= outputDir %>"
      }
    });
    grunt.loadNpmTasks('grunt-contrib-coffee');
    grunt.loadNpmTasks('grunt-regarde');
    grunt.loadNpmTasks('grunt-contrib-clean');
    grunt.loadNpmTasks('grunt-react');
    grunt.registerTask('spawn_react', 'Run React in a subprocess', function() {
      var done;
      done = this.async();
      return grunt.util.spawn({
        grunt: true,
        args: ['react'],
        opts: {
          stdio: 'inherit'
        }
      }, function(err) {
        if (err) {
          grunt.log.writeln(">> Error compiling React JSX file!");
        }
        return done();
      });
    });
    return grunt.registerTask("build", ["coffee", "spawn_react"]);
  };

}).call(this);

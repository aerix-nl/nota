(function() {
  module.exports = function(grunt) {
    grunt.initConfig({
      pkg: grunt.file.readJSON("package.json"),
      coffee: {
        compile: {
          files: [
            {
              expand: true,
              cwd: 'src',
              src: ['**/*.coffee'],
              dest: 'dist',
              ext: '.js'
            }
          ]
        }
      },
      sass: {
        compile: {
          options: {
            compass: true
          },
          files: [
            {
              expand: true,
              cwd: 'stylesheets',
              src: ['**/*.scss'],
              dest: 'stylesheets',
              ext: '.css'
            }
          ]
        }
      },
      cjsx: {
        compile: {
          expand: true,
          sourceMap: true,
          cwd: 'src',
          src: ['**/*.cjsx'],
          dest: 'dist',
          ext: '.js'
        }
      },
      watch: {
        all: {
          files: ['src/**/*.cjsx', 'src/**/*.coffee', 'stylesheets/**/*.scss'],
          tasks: ['build']
        }
      }
    });
    grunt.loadNpmTasks('grunt-contrib-coffee');
    grunt.loadNpmTasks('grunt-contrib-sass');
    grunt.loadNpmTasks('grunt-coffee-react');
    grunt.loadNpmTasks('grunt-contrib-watch');
    grunt.registerTask('default', ['watch']);
    return grunt.registerTask('build', ['cjsx:compile', 'coffee:compile', 'sass:compile']);
  };

}).call(this);

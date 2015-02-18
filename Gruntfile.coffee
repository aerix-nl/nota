module.exports = ( grunt ) ->
  grunt.initConfig
    pkg: grunt.file.readJSON('package.json')

    coffee:
      source:
        files: [
          expand: true
          cwd: 'src'
          src: ['**/*.coffee']
          dest: 'dist'
          ext: '.js'
        ]

      templates:
        files: [
          expand: true
          cwd: 'templates'
          src: ['**/*.coffee']
          dest: 'templates'
          ext: '.js'
        ]

    sass:
      templates:
        options:
          compass: true
        files: [
          expand: true
          cwd: 'templates'
          src: ['**/*.scss']
          dest: 'templates'
          ext: '.css'
        ]

    watch:
      all:
        files: ['src/**/*.coffee', 'templates/**/*.coffee', 'templates/**/*.scss']
        tasks: ['build']

  grunt.loadNpmTasks 'grunt-contrib-coffee'
  grunt.loadNpmTasks 'grunt-contrib-sass'
  grunt.loadNpmTasks 'grunt-contrib-watch'

  grunt.registerTask 'default', ['watch']
  grunt.registerTask 'build',   ['coffee:source', 'coffee:templates', 'sass:templates']

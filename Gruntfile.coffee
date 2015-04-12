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

    sass:
      source:
        options:
          compass: true
        files: [
          expand: true
          cwd: 'assets/stylesheets'
          src: ['**/*.scss']
          dest: 'assets/stylesheets'
          ext: '.css'
        ]

    watch:
      all:
        files: ['src/**/*.coffee', 'assets/stylesheets/**/*.scss']
        tasks: ['build']

  grunt.loadNpmTasks 'grunt-contrib-coffee'
  grunt.loadNpmTasks 'grunt-contrib-sass'
  grunt.loadNpmTasks 'grunt-contrib-watch'

  grunt.registerTask 'default', ['watch']
  grunt.registerTask 'build',   ['coffee:source', 'sass:source']

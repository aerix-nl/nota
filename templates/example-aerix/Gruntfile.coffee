module.exports = (grunt) ->
  grunt.initConfig
    pkg: grunt.file.readJSON("package.json")

    srcDir: "./src"
    outputDir: "./dist"

    # Compile to JS first, then we will compile the JSX in another task and move to /dist
    coffee:
      options:
        # This is IMPORTANT, because the first line has to be a JSX comment
        bare: true
      all:
        files: [
          expand: true
          cwd: 'src/'
          src: ['**/*.coffee']
          dest: 'src/'
          ext: '.js'
        ]

    react:
      all:
        files:
          "<%= outputDir %>": "<%= srcDir %>"

    # Keep an eye on filesystem changes and rebuild
    watch:
      all:
        files: "<%= srcDir %>/**/*.coffee"
        tasks: ['build']

    # Clean up artifacts
    clean:
      output: "<%= outputDir %>"

  grunt.loadNpmTasks 'grunt-contrib-coffee'
  grunt.loadNpmTasks 'grunt-contrib-watch'
  grunt.loadNpmTasks 'grunt-contrib-clean'
  grunt.loadNpmTasks 'grunt-react'

  # Make sure we get an error on compilation instead of a hang
  grunt.registerTask 'spawn_react', 'Run React in a subprocess', () ->
    done = this.async()
    grunt.util.spawn grunt: true, args: ['react'], opts: {stdio: 'inherit'}, (err) ->
      if err
        grunt.log.writeln(">> Error compiling React JSX file!")
        grunt.log.writeln(err)
      done()

  grunt.registerTask 'default', ['watch']
  grunt.registerTask "build", ["coffee", "spawn_react"]
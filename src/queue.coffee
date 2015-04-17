_             = require('underscore')._

module.exports = class JobQueue extends Array

  # jobs = [{
  #   dataPath:   'dataPath'
  #   outputPath: 'outputPath'
  #   preserve:   'preserve'
  # }]

  # options = {
  #   type: 'static' or 'dynamic'
  #   callback: -> stuff
  # }
  constructor: (@jobs, @options) ->
    if @jobs.length is 0 then throw new Error "Creating empty job queue"
    @push job for job in @jobs
    # JobQueue.__super__ = @jobs.slice() # Make a copy
    @rendered = 0
    @meta     = new Array(@jobs.length)

  dequeue: -> @splice(0,1)

  completeJob: (jobMeta)->
    @meta[@rendered] = jobMeta
    @rendered += 1
    # Automatically complete with callback if finished
    if @isFinished()
      @options.callback?(@meta)

  # Returns job if there is one more in the queue (mutates the queue) or
  # returns null if finished.
  nextJob: ->
    deq = @dequeue()
    if deq.length is 1 then deq[0] else null

  isFinished: -> @length is 0

_             = require('underscore')._

module.exports = class JobQueue extends Array

  # jobs = [{
  #   dataPath:   'dataPath'
  #   outputPath: 'outputPath'
  #   preserve:   'preserve'
  # }]

  # template: {
  #   path: '/path/to/template'
  #   type: 'static' or 'scripted'
  # }

  # deferred: deferred that exposes .resolve(returnValue) which to resolve
  # when queue has finished rendering.

  constructor: (@jobs, @template, @deferred) ->
    if @jobs.length is 0 then throw new Error "Creating empty job queue"
    @push job for job in @jobs
    # JobQueue.__super__ = @jobs.slice() # Make a copy
    @meta = new Array(@jobs.length)

  jobCompleted: (job, jobMeta)->
    index = @jobIndex(job)
    if index is -1 then throw new Error 'Mentioned job is not known in this qeueue'
    @meta[index] = jobMeta

    # Automatically complete with resolving deferred when finished
    if @isFinished()
      @deferred?.resolve @meta

  jobFailed: (job, jobMeta)->
    # TODO: differentiate between completed jobs and failed jobs
    @jobCompleted job, jobMeta

  jobIndex: (job)->
    @jobs.indexOf(job)

  # Returns job if there is one more in the queue (mutates the queue) or
  # returns null if finished.
  nextJob: ->
    deq = @splice(0,1)
    if deq.length is 1 then deq[0] else null

  isFinished: ->
    @length is 0

  inProgress: ->
    inProgress = for job, i in @jobs
      # If the queue still contains the job, then it's still waiting for
      # rendering, i.e. not in progress. So we skip it.
      if _(@).contains job then continue
      # If the job meta data array has some mentioning at the index of the
      # job, it means the meta data has already came in, i.e. the job was
      # already checked off earlier (either completed or failed). We skipt it.
      if meta[i]? then continue
      # Else we add it to the list of in progress jobs
      job

    if inProgress.length is 0 then return null else return inProgress

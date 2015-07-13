var gulp = require('gulp'),
    coffee = require('gulp-coffee'),
    umd = require('gulp-umd');

gulp.task('coffee', function() {
  nota = gulp.src('./src/*.coffee')
      .pipe(coffee())
      .pipe(gulp.dest('./dist'));

  client = gulp.src('./src/client/*.coffee')
      .pipe(coffee({ bare: true }))
      .pipe(umd())
      .pipe(gulp.dest('./dist/client'));
});

gulp.task('watch', function() {
  gulp.watch('src/*.coffee', ['coffee']);
})

var pkg = require('./package.json'),
  browserify = require('browserify'),
  buffer = require('vinyl-buffer'),
  concat = require('gulp-concat'),
  del = require('del'),
  gulp = require('gulp'),
  header = require('gulp-header'),
  jshint = require('gulp-jshint'),
  karma = require('karma'),
  rename = require('gulp-rename'),
  replace = require('gulp-replace'),
  pages = require('gh-pages'),
  path = require('path'),
  source = require('vinyl-source-stream'),
  uglify = require('gulp-uglify');

gulp.task('default', ['clean', 'lint', 'test', 'compile']);
gulp.task('dev', ['compile', 'lint', 'test', 'watch']);

gulp.task('watch', function() {
  gulp.watch('lib/**/*.js', ['test', 'lint', 'compile']);
  gulp.watch('test/spec/**/*.js', ['test']);
});

gulp.task('clean', function() {
  del.sync(['dist', 'demo/dist', 'test/coverage']);
});

gulp.task('lint', function() {
  return gulp.src(['gulpfile.js', 'lib/**/*.js', 'specs/**/*.js'])
    .pipe(jshint('.jshintrc'))
    .pipe(jshint.reporter('jshint-stylish'));
});

gulp.task('test', function(done) {
  new karma.Server({ configFile: __dirname + '/karma.conf.js', singleRun: true })
    // prevent karma from calling process.exit
    .on('run_complete', function() { done(); })
    .start();
});

gulp.task('compile', ['clean'], function() {
  return browserify('lib/bespoke-overview.js', { standalone: 'bespoke.plugins.overview' }).bundle()
    .pipe(source('bespoke-overview.js'))
    .pipe(buffer())
    .pipe(header([
      '/*!',
      ' * <%= name %> v<%= version %>',
      ' *',
      ' * Copyright <%= new Date().getFullYear() %>, <%= author.name %>',
      ' * This content is released under the <%= license %> license',
      ' */\n\n'
    ].join('\n'), pkg))
    .pipe(gulp.dest('dist'))
    .pipe(rename('bespoke-overview.min.js'))
    .pipe(uglify())
    .pipe(header([
      '/*! <%= name %> v<%= version %> ',
      '© <%= new Date().getFullYear() %> <%= author.name %>, ',
      '<%= license %> License */\n'
    ].join(''), pkg))
    .pipe(gulp.dest('dist'));
});

gulp.task('compile:demo', ['compile:demo:css', 'compile:demo:html', 'compile:demo:js']);

gulp.task('compile:demo:css', ['clean'], function() {
  return gulp.src('demo/style.css')
    .pipe(gulp.dest('demo/dist'));
});

gulp.task('compile:demo:html', ['clean'], function() {
  return gulp.src('demo/index.html')
    .pipe(replace(/<script [\s\S]*<\/script>/, '<script src="build.js"></script>'))
    .pipe(gulp.dest('demo/dist'));
});

gulp.task('compile:demo:js', ['compile'], function() {
  return gulp.src([
      'node_modules/bespoke/dist/bespoke.js',
      'node_modules/bespoke-classes/dist/bespoke-classes.js',
      'node_modules/bespoke-nav/dist/bespoke-nav.js',
      'node_modules/bespoke-scale/dist/bespoke-scale.js',
      'dist/bespoke-overview.js',
      'demo/demo.js'
  ])
  .pipe(concat('build.js'))
  //.pipe(uglify())
  .pipe(gulp.dest('demo/dist'));
});

gulp.task('deploy', ['compile:demo'], function(done) {
  pages.publish(path.join(__dirname, 'demo/dist'), {}, done);
});

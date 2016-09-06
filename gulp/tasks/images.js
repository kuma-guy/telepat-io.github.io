'use strict';

var gulp = require('gulp-help')(require('gulp'));
var imagemin = require('gulp-imagemin');
var cache = require('gulp-cache');
var gulpif = require('gulp-if');

var config = require('./../config.js');

// Clear imagemin cache

gulp.task('clearCache', 'Clear Imagemin cache', function (done) {
  return cache.clearAll(done);
});

// Optimize images

gulp.task('images', 'Run Imagemin optimalizations and copy to `dist/`', function () {
  return gulp.src(config.images.src)
    .pipe(gulpif(config.optimizeImages, cache(imagemin(config.images.cfg))))
    .pipe(gulp.dest(config.images.dest));
});

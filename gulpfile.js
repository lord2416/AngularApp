var gulp = require('gulp');
var concat = require('gulp-concat');
var sourcemaps = require('gulp-sourcemaps');
var ngmin = require('gulp-ngmin');
var ngAnnotate = require('gulp-ng-annotate');
var uglify=require('gulp-uglify');
var stripDebug = require('gulp-strip-debug');
var env = process.env.NODE_ENV;

var configPath = {
	jsPath:{
		src:'static/js/**/*.js',
		dest:{
			normal:'static/dist/normal/js/',
			min:'static/dist/min/js/'
		}
	},
	cssPath:{
		src:'',
		dest:{
			normal:'',
			min:''
		}
	}
}

gulp.task('concat-js', function () {
	/*未压缩*/
	console.log('the js is concat at:'+new Date().toLocaleString());
	return	gulp.src(configPath.jsPath.src)
	.pipe(sourcemaps.init())
	.pipe(ngAnnotate())
	.pipe(concat('app.js', {newLine: '\n'}))
	.pipe(sourcemaps.write())
	.pipe(gulp.dest(configPath.jsPath.dest.normal));
});

gulp.task('compress-js',function(){
  /*压缩*/
 	console.log('the js is compressed at:'+new Date().toLocaleString());
	return	gulp.src(configPath.jsPath.src)
	.pipe(sourcemaps.init())
  .pipe(ngAnnotate())
  .pipe(ngmin({dynamic: false}))
//.pipe(stripDebug())  
  .pipe(uglify({outSourceMap: false}))
  .pipe(concat('all.min.js'))
	.pipe(sourcemaps.write())
  .pipe(gulp.dest(configPath.jsPath.dest.min));
});

gulp.task('watch', function() {
	gulp.watch(configPath.jsPath.src, ['concat-js','compress-js']);
});

gulp.task('start', ['concat-js','compress-js','watch']);

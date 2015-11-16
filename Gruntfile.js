module.exports = function(grunt) {
	// Load all tasks
	require('load-grunt-tasks')(grunt);
	// Show elapsed time
	require('time-grunt')(grunt);

	grunt.initConfig ({
		connect: {
			options: {
				base: '_site/'
			},
			dev: {
				options: {
					port: 15009
				}
			}
		},
		sass: {
			dev: {
				files: {
					'assets/css/main.css' : 'assets/scss/main.scss'
				},
				options: {
					style: 'compressed',
				}
			}
		},
		autoprefixer: {
			release: {
				expand: true,
				flatten: true,
				src: 'temp/<%= pkg.releaseName %>.min.css',
				dest: 'dist/'
			}
		},
		jekyll: {
			options: {
				bundleExec: true,
				src: '<%= app %>'
			},
			dist: {
				options: {
					dest: '<%= dist %>',
					config: '_config.yml'
				}
			}
		},
		watch: {
            options: {
                livereload: true
            },
			css: {
				files: ['assets/scss/*.scss'],
				tasks: ['sass', 'jekyll']
			},
			jekyll: {
				files: ['*.md', '_layouts/*.html', '_includes/*.html', '_posts/*.md'],
				tasks: ['jekyll']
			}
		}
	});

	grunt.registerTask('serve', ['sass', 'jekyll', 'connect', 'openport:watch.options.livereload:35729:40000', 'watch']);
};
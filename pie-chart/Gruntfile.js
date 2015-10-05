module.exports = function(grunt) {
	// Load all tasks
	require('load-grunt-tasks')(grunt);
	// Show elapsed time
	require('time-grunt')(grunt);

	var dependencies = grunt.file.readJSON('dependencies.json');

	grunt.initConfig ({
		pkg: grunt.file.readJSON('package.json'),
		connect: {
			options: {
				base: '../'
			},
			dev: {
				options: {
					port: 15009
				}
			},
			test: {
				options: {
					keepalive: false,
					port: 15008
				}
			}
		},
		qunit: {
			tests: {
				options: {
					httpBase: 'http://localhost:15008'
				},
				src: 'test/*.html'
			}
		},
		clean: {
			release: {
				src: ['dist/'],
			},
			up: {
				src: ['temp']
			}
		},
		sass: {
			dev: {
				files: {
					'src/style/chart.css' : 'src/style/chart.scss'
				},
				options: {
					loadPath: [
						'src/style',
						'src/style/themes/default'
					]
				}
			},
			release: {
				files: {
					'temp/<%= pkg.releaseName %>.min.css' : 'src/style/chart.scss'
				},
				options: {
					style: 'compressed',
					loadPath: [
						'src/style',
						'src/style/themes/default'
					]
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
		copy: {
			freeTier: {
				expand: true,
				cwd: 'dist',
				src: '<%= pkg.releaseName %>-commercial.js',
				dest: 'dist/',
				rename: function(dest, src) {
					return dest + src.replace(/-commercial/, '');
				},
				options: {
					process: function(content, path) {
						return content
							.replace(/\/\/COMMERCIALUSE /, '')
							.replace(/\/\/NODRM /, '');
					}
				}
			}
		},
		requirejs: {
			release: {
				options: {
					baseUrl: "./src/scripts",
					name: "almond",
					include: ["main"],
					out: "dist/<%= pkg.releaseName %>-commercial.js",
					paths: dependencies,
					shim: {
						'svg-js': {
							exports: 'SVG'
						}
					},
					optimize: 'none'
				}
			}
		},
		closurecompiler: {
			release: {
				files: {
					'dist/<%= pkg.releaseName %>.min.js': ['dist/<%= pkg.releaseName %>.js'],
					'dist/<%= pkg.releaseName %>-commercial.min.js': ['dist/<%= pkg.releaseName %>-commercial.js']
				},
				options: {
					'language_in': 'ECMASCRIPT5_STRICT',
					'compilation_level': 'SIMPLE_OPTIMIZATIONS',
					'banner': '/* Copyright Factmint Ltd, not for distribution without consent; version <%= pkg.version %>*/'
				}
			}
		},
		exec: {
			document: 'grep --only-matching --no-filename "options\\.[a-zA-Z]*" src/scripts/*.js | sort | uniq | cut -d. -f2 > dist/options.txt',
			isMaster: 'git branch | grep \\* | awk \'{print $2}\' | grep ^master$',
			areChangesOutstanding: 'if git status | grep modified: ; then exit 1; fi',
			areCommitsPushed: 'if git status | grep "Your branch is ahead"; then exit 1; fi'
		},
		watch: {
            options: {
                livereload: true
            },
			css: {
				files: ['src/style/*.scss'],
				tasks: ['sass']
			},
			js: {
				files: ['src/scripts/*.js'],
			}
		}
	});

	grunt.registerTask('serve', ['sass:dev', 'connect:dev', 'openport:watch.options.livereload:35729:40000', 'watch']);
	grunt.registerTask('test', ['sass:dev', 'autoprefixer', 'closurecompiler', 'connect:test', 'qunit']);
	grunt.registerTask('build', [
		'clean:release',					// Make sure no files from previous releases are left around
		'requirejs',						// Build the r.js single file script
		'copy',								// Remove //NODRM and //COMMERCIALUSE comments
		'closurecompiler',					// Minify
		'sass:release',						// Generate CSS
		'autoprefixer:release',				// Prefix CSS
		'clean:up',							// Clean up the temp directory(s)
		'exec:document',					// Document the use of any options (looks for pattern /options.[a-zA-Z]*/)
	]);
};
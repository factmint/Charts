module.exports = function(grunt) {
	// Load all tasks
	require('load-grunt-tasks')(grunt);
	// Show elapsed time
	require('time-grunt')(grunt);
	
	var dependencies = grunt.file.readJSON('dependencies.json');
	
	grunt.initConfig ({
		pkg: grunt.file.readJSON('package.json'),
		aws: grunt.file.readJSON('../aws-keys.json'),
		connect: {
			options: {
				base: '.'
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
					'src/style/<%= pkg.releaseName %>.css' : 'src/style/<%= pkg.releaseName %>.scss'
				},
			},
			release: {
				files: {
					'temp/<%= pkg.releaseName %>.min.css' : 'src/style/<%= pkg.releaseName %>.scss'
				},
				options: {
				  style: "compressed",
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
						'snap': {
							exports: 'Snap'
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
					'banner': '/* Copyright Factmint Ltd, not for distribution without consent; version <%= pkg.version %>; includes SnapSVG, https://github.com/adobe-webplatform/Snap.svg/blob/master/LICENSE */'
				}
			}
		},
		exec: {
			bower: 'bower update',
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
		},
		aws_s3: {
			options: {
				accessKeyId: '<%= aws.accessKey %>',
				secretAccessKey: '<%= aws.secretKey %>'
			},
			release: {
				options: {
					bucket: 'factmint-charts'
				},
				files: [
					{src: 'dist/<%= pkg.releaseName %>.min.js', dest: '<%= pkg.releaseName %>/current/free.min.js', params: {ContentType: 'application/javascript'}},
					{src: 'dist/<%= pkg.releaseName %>.min.css', dest: '<%= pkg.releaseName %>/current/default.min.css', params: {ContentType: 'text/css'}},
					{src: 'dist/options.txt', dest: '<%= pkg.releaseName %>/current/options.txt', params: {ContentType: 'text/css'}},

					{src: 'dist/<%= pkg.releaseName %>.min.js', dest: '<%= pkg.releaseName %>/archive/<%= pkg.version %>/free.min.js', params: {ContentType: 'application/javascript'}},
					{src: 'dist/<%= pkg.releaseName %>-commercial.min.js', dest: '<%= pkg.releaseName %>/archive/<%= pkg.version %>/commercial.min.js', params: {ContentType: 'application/javascript'}},
					{src: 'dist/<%= pkg.releaseName %>.min.css', dest: '<%= pkg.releaseName %>/archive/<%= pkg.version %>/default.min.css', params: {ContentType: 'text/css'}},
					{src: 'dist/options.txt', dest: '<%= pkg.releaseName %>/archive/<%= pkg.version %>/options.txt', params: {ContentType: 'text/css'}}
				]
			}
		},
		gittag: {
			release: {
				options: {
					tag: '<%= pkg.releaseName %>-<%= pkg.version %>',
					message: 'Tagging a release'
				}
			}
		},
		gitpush: {
			release: {
				options: {
					tags: true
				}
			}
		}
	});

	grunt.registerTask('serve', ['sass', 'connect:dev', 'openport:watch.options.livereload:35729:40000', 'watch']);
	grunt.registerTask('test', ['sass', 'autoprefixer', 'closurecompiler', 'connect:test', 'qunit']);
	grunt.registerTask('build', [
		'exec:bower',					// Make sure we are using latest bower components
		'clean:release',				// Make sure no files from previous releases are left around
		'requirejs',					// Build the r.js single file script
		'copy',							// Remove //NODRM and //COMMERCIALUSE comments
		'closurecompiler',				// Minify
		'sass:release',					// Generate CSS
		'autoprefixer:release',			// Prefix CSS
		'clean:up'						// Clean up the temp directory(s)
	]);
	grunt.registerTask('release', [
		'exec:bower',					// Make sure we are using latest bower components
		'exec:isMaster',				// Make sure we are one the master branch
		'exec:areChangesOutstanding',	// Make sure changes are committed
		'exec:areCommitsPushed',		// Make sure all commits are pushed
		'clean:release',				// Make sure no files from previous releases are left around
		'requirejs',					// Build the r.js single file script
		'copy',							// Remove //NODRM and //COMMERCIALUSE comments
		'closurecompiler',				// Minify
		'sass:release',					// Generate CSS
		'autoprefixer:release',			// Prefix CSS
		'clean:up',						// Clean up the temp directory(s)
		'exec:document',				// Document the use of any options (looks for pattern /options.[a-zA-Z]*/)
		'gittag',						// Tag the release (will fail if you haven't changed the version number, so do)
		'gitpush',						// Push the new tag to the upstream repo
		'aws_s3'						// Transfer the released artifacts to S3
	]);
};
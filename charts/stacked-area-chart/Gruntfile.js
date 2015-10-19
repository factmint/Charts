module.exports = function(grunt) {
	// Load all tasks
	require('load-grunt-tasks')(grunt);
	// Show elapsed time
	require('time-grunt')(grunt);
	
	var dependencies = grunt.file.readJSON('dependencies.json');
	
	grunt.initConfig ({
		pkg: grunt.file.readJSON('package.json'),
		clean: {
			options: {
				force: true
			},
			release: {
				src: [
					'../../dist/<%= pkg.releaseName %>-options.txt',
					'../../dist/<%= pkg.releaseName %>.min.js',
					'../../dist/<%= pkg.releaseName %>.min.css'
				],
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
				dest: '../../dist/'
			}
		},
		requirejs: {
			release: {
				options: {
					baseUrl: "./src/scripts",
					name: "almond",
					include: ["main"],
					out: "temp/<%= pkg.releaseName %>.js",
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
					'../../dist/<%= pkg.releaseName %>.min.js': ['temp/<%= pkg.releaseName %>.js']
				},
				options: {
					'language_in': 'ECMASCRIPT5_STRICT',
					'compilation_level': 'SIMPLE_OPTIMIZATIONS',
					'banner': '/* <%= pkg.name %> version <%= pkg.version %>; Copyright (c) Factmint Ltd (http://factmint.com); Licensed under the MIT License (http://opensource.org/licenses/MIT); Includes SnapSVG, https://github.com/adobe-webplatform/Snap.svg/blob/master/LICENSE */'
				}
			}
		},
		exec: {
			bower: 'bower update',
			document: 'grep --only-matching --no-filename "options\\.[a-zA-Z]*" src/scripts/*.js | sort | uniq | cut -d. -f2 > ../../dist/<%= pkg.releaseName %>-options.txt'
		}
	});

	grunt.registerTask('install', [
		'exec:bower' // Run bower update
	]);
	grunt.registerTask('build', [
		'clean:release', // Make sure no files from previous releases are left around
		'requirejs', // Build the r.js single file script
		'closurecompiler', // Minify
		'sass:release', // Generate CSS
		'autoprefixer:release', // Prefix CSS
		'clean:up', // Clean up the temp directory(s)
		'exec:document' // Document the use of any options (looks for pattern /options.[a-zA-Z]*/)
	]);
};
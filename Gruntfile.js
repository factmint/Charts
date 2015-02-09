module.exports = function(grunt) {
	grunt.initConfig ({
		pkg: grunt.file.readJSON('package.json'),
		connect: {
			options: {
				base: '.'
			},
			devel: {
				options: {
					keepalive: true
				}
			}/*,
			test: {
				options: {
					keepalive: false,
					port: 34157
				}
			}*/
		}/*,
		qunit: {
			tests: {
				options: {
					httpBase: 'http://localhost:34157'
				},
				src: 'test/runners/*.html'
			}
		}*/
	});

	grunt.loadNpmTasks('grunt-contrib-connect');
	/*grunt.loadNpmTasks('grunt-contrib-qunit');*/
	grunt.loadNpmTasks('grunt-openport');
	
	grunt.registerTask('serve', ['openport:connect.devel.options.port:15000:15010', 'connect:devel']);
	/*grunt.registerTask('test', ['connect:test', 'qunit']);*/
};

module.exports = function(grunt) {
	// Load all tasks
	require('load-grunt-tasks')(grunt);
	
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
			}
		}
	});

	grunt.registerTask('serve', ['openport:connect.devel.options.port:15000:15010', 'connect:devel']);
};

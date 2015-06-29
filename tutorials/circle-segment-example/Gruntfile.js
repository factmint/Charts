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
	});

	grunt.registerTask('serve', ['connect:dev', 'openport:watch.options.livereload:35729:40000', 'watch']);
};
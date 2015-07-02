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
			}/*,
			test: {
				options: {
					keepalive: false,
					port: 34157
				}
			}*/
		},
		requirejs: {
			release: {
				options: {
					baseUrl: ".",
					name: "almond",
					include: ["factmint-charts"],
					out: "dist/factmint-charts.js",
					paths: {
						"almond": "node_modules/almond/almond",
				        "classList": "node_modules/classList/classList",
				        "path": "node_modules/paths-js/dist/amd/path",
				        "svg-js": "node_modules/svg.js/dist/svg",
				        "circle-segment": "inventions/circle-segment",
				        "geometry": "utilities/geometry"
					},
					shim: {
						'svg-js': {
							exports: 'SVG'
						}
					},
					optimize: 'none'
				}
			}
		},
	});

	grunt.registerTask('serve', ['openport:connect.devel.options.port:15000:15010', 'connect:devel']);
	grunt.registerTask('build', ['requirejs']);
};

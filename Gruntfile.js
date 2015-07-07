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
				        "doughnut-segment": "inventions/doughnut-segment",
				        "dashed-bracket": "inventions/dashed-bracket",
				        "flow": "inventions/flow",
				        "tooltip-background": "inventions/tooltip-background",
				        
				        "G.unshift": "extensions/G.unshift",
				        
				        "centre": "etc/centre",
				        "float": "etc/float",
				        "grid": "etc/grid",
				        
				        "key": "components/key",
				        "color-scale-key": "components/color-scale-key",
				        "tooltip": "components/tooltip",
				        "two-section-tooltip": "components/two-section-tooltip",
				        "multi-measure-tooltip": "components/multi-measure-tooltip",
				        "text-area": "components/text-area",
				        
				        "geometry": "utilities/geometry",
				        "number": "utilities/number",
				        "scale": "utilities/scale",
				        "state": "utilities/state",
				        "mapper": "utilities/mapper",
				        "color": "utilities/color"
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

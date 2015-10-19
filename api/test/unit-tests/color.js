"use strict";
require.config({
	paths: {
		"QUnit": "/node_modules/qunitjs/qunit/qunit",
		"svg-js": "/node_modules/svg.js/dist/svg",
		"Color": "/api/utilities/color"
	},
	shim: {
		"QUnit": {
			exports: "QUnit",
			init: function() {
				QUnit.config.autoload = false;
				QUnit.config.autostart = false;
			}
		}
	}
});

require(["QUnit", "svg-js", "Color"], function(QUnit, SVG, Color) {
	
	QUnit.test("A harmonious colour series should produce the correct classes.", function() {
		QUnit.deepEqual(
			Color.harmonious(5),
			[
				Color.colorWheelClasses[0],
				Color.colorWheelClasses[11],
				Color.colorWheelClasses[2],
				Color.colorWheelClasses[6],
				Color.colorWheelClasses[8]
			],
			"5 harmonious colours should be an array of class names representing the following colours from the wheel (in order): 1, 12, 3, 7, and 9."
		);
		QUnit.equal(
			Color.harmonious(Color.colorWheelClasses.length + 1)[Color.colorWheelClasses.length],
			Color.colorWheelClasses[0],
			"A set of harmonious colours that extends the size of the colour wheel should start from the beginning."
		);
	});

	QUnit.load();
	QUnit.start();
});
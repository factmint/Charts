"use strict";
require.config({
	paths: {
		"QUnit": "/node_modules/qunitjs/qunit/qunit",
		"svg-js": "/node_modules/svg.js/dist/svg",
		"Geometry": "/api/utilities/geometry"
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

require(["QUnit", "svg-js", "Geometry"], function(QUnit, SVG, Geometry) {
	
	QUnit.test("The circle namespace should produce correct values", function() {
		QUnit.equal(
			Geometry.circle.tenth,
			0.6283185307179586,
			"One tenth of a circle in radians to 15 decimal places should be 0.6283185307179586."
		);
		QUnit.equal(
			Geometry.circle.eighth,
			0.7853981633974483,
			"One eighth of a circle in radians to 15 decimal places should be 0.7853981633974483."
		);
		QUnit.equal(
			Geometry.circle.quarter,
			1.5707963267948966,
			"One quarter of a circle in radians to 15 decimal places should be 1.5707963267948966."
		);
		QUnit.equal(
			Geometry.circle.half,
			3.141592653589793,
			"One half of a circle in radians to 15 decimal places should be 3.141592653589793."
		);
		QUnit.equal(
			Geometry.circle.whole,
			6.283185307179586,
			"One whole of a circle in radians to 15 decimal places should be 6.283185307179586."
		);
		QUnit.equal(
			Geometry.circle.getPointOnCircumference(100, 100, 100, Geometry.circle.eighth).x,
			170.71067811865476,
			"Given a theoretical circle at position x = 100, y = 100 and with a radius of 100, the x position of 1/8 of the way around the circumference should be 170.71067811865476."
		);
		QUnit.equal(
			Geometry.circle.getPointOnCircumference(100, 100, 100, Geometry.circle.eighth).y,
			29.289321881345245,
			"Given a theoretical circle at position x = 100, y = 100 and with a radius of 100, the y position of 1/8 of the way around the circumference should be 29.289321881345245."
		);
		QUnit.equal(
			Geometry.circle.getAngle(10, 500, 2 * Math.PI),
			0.12566370614359174,
			"For a full circle (total size of 2 * Math.PI radians) representing a data total of 500, the value 10 should be equivalent to 0.12566370614359174 radians."
		);
	});

	QUnit.load();
	QUnit.start();
});
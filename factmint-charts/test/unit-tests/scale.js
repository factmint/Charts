"use strict";
require.config({
	paths: {
		"QUnit": "/node_modules/qunitjs/qunit/qunit",
		"svg-js": "/node_modules/svg.js/dist/svg",
		"Scale": "/utilities/scale"
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

require(["QUnit", "svg-js", "Scale"], function(QUnit, SVG, Scale) {
	
	QUnit.test("A linear scale should map values proportionately.", function() {
		var scale = Scale()
			.project(new Scale().domains.RealNumbers(0, 100))
			.onto(new Scale().ranges.Linear(10, 20));

		var straddleZeroScale = Scale()
			.project(new Scale().domains.RealNumbers(0, 100))
			.onto(new Scale().ranges.Linear(-10, 20));

		var backwardsDomainScale = Scale()
			.project(new Scale().domains.RealNumbers(100, 0))
			.onto(new Scale().ranges.Linear(0, 20));

		var backwardsRangeScale = Scale()
			.project(new Scale().domains.RealNumbers(0, 100))
			.onto(new Scale().ranges.Linear(20, 10));

		QUnit.equal(scale.map(50), 15, "Halfway along a linear scale of 10 to 20 is 15.");
		QUnit.equal(straddleZeroScale.map(50), 5, "Halfway along a linear scale of -10 to 20 is 5.");
		QUnit.throws(
			function() {
				Scale().project(new Scale().domains.RealNumbers(0, 100))
					.onto(new Scale().ranges.Linear());
			},
			"A linear scale throws an error if both start and end points are omitted."
		);
		QUnit.throws(
			function() {
				Scale().project(new Scale().domains.RealNumbers(0, 100))
					.onto(new Scale().ranges.Linear(20));
			},
			"A linear scale throws an error if the end point is omitted."
		);
		QUnit.equal(backwardsDomainScale.map(50), 10, "Halfway along a linear scale of 10 to 20 with a domain start of 100 and domain end of 0 is 10.");
		QUnit.equal(backwardsRangeScale.map(50), 15, "Halfway along a linear scale of 20 to 10 is 15.");

	});

	QUnit.test("An angle scale should map values proportionately.", function() {
		var scale = Scale()
			.project(new Scale().domains.RealNumbers(0, 100))
			.onto(new Scale().ranges.Angle());

		var defaultScale = Scale()
			.project(new Scale().domains.RealNumbers(0, 100))
			.onto(new Scale().ranges.Angle(0, 2 * Math.PI));

		var straddleZeroScale = Scale()
			.project(new Scale().domains.RealNumbers(0, 100))
			.onto(new Scale().ranges.Angle(-Math.PI, Math.PI));

		QUnit.equal(scale.map(0), 0, "If no start point is provided, it should be set to 0.");
		QUnit.equal(scale.map(100), 2 * Math.PI, "If no end point is provided, it should be set to 2π.");
		QUnit.equal(defaultScale.map(50), Math.PI, "Halfway along an angle scale of 0 radians to 2π radians is π.");
		QUnit.equal(straddleZeroScale.map(75), Math.PI * 1/2, "Three quarters along an angle scale of -π radians to π radians is 1/2π.");
	});

	QUnit.load();
	QUnit.start();
});
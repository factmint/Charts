"use strict";
require.config({
	paths: {
		"Color-scale-key": "/components/color-scale-key",
		"number": "/utilities/number",
		"QUnit": "/node_modules/qunitjs/qunit/qunit",
		"scale": "/utilities/scale",
		"svg-js": "/node_modules/svg.js/dist/svg"
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

function createTestContainer(titleText) {
	var container = document.createElement('div');
	container.className = 'test-svg-container';
	
	var title = document.createElement('h4');
	title.innerHTML = titleText;
	container.appendChild(title);
	
	document.body.appendChild(container);
	
	return container;
}

require(["Color-scale-key", "number", "QUnit", "scale", "svg-js"], function(colorScaleKey, numberUtilities, QUnit, Scale, SVG) {

	QUnit.test("A vertical color scale key component should be rendered correctly.", function() {
		var paper = SVG(createTestContainer("Vertical colour scale key"));

		var scale = Scale()
			.withIncrements(4)
			.project(new Scale().domains.RealNumbers(0, 150))
			.onto(new Scale().ranges.Linear(0, 200));

		var MAX_TINT_NUMBER = 8;

		var tickMarks = scale.domain.increments.map(function(increment, incrementIndex, increments) {
			var tickMark = {
				value: increment
			};

			var tintStepSize = Math.ceil(MAX_TINT_NUMBER / (scale.domain.increments.length - 2));
			var tintNumber = parseInt(MAX_TINT_NUMBER - incrementIndex * tintStepSize);
			if (tintNumber > 0) {
				tickMark.tintClass = "tint-" + tintNumber;
			}

			return tickMark;
		});

		var verticalKey = colorScaleKey(
			paper,
			tickMarks,
			"fm-datum-color-wheel-a",
			scale,
			"vertical"
		);
		verticalKey.move(
			0,
			10
		);

		verticalKey.markValue(10);
		
		QUnit.ok(
			verticalKey instanceof SVG.G,
			"A vertical color scale key component should return an SVG group."
		);
		QUnit.ok(
			verticalKey.node.querySelectorAll("rect")[0].classList.contains("tint-8"),
			"A vertical color scale key component should have segments with the correct tint class"
		);
		QUnit.ok(
			verticalKey.node.querySelectorAll("rect")[1].classList.contains("tint-4"),
			"A vertical color scale key component should have segments with the correct tint class"
		);
	});

	QUnit.test("A horizontal color scale key component should be rendered correctly.", function() {
		var paper = SVG(createTestContainer("Horizontal colour scale key"));

		var scale = Scale()
			.withIncrements(4)
			.project(new Scale().domains.RealNumbers(0, 350))
			.onto(new Scale().ranges.Linear(0, 250));

		var MAX_TINT_NUMBER = 7;

		var tickMarks = scale.domain.increments.map(function(increment, incrementIndex, increments) {
			var tickMark = {
				value: increment
			};

			var tintStepSize = Math.ceil(MAX_TINT_NUMBER / (scale.domain.increments.length - 2));
			var tintNumber = parseInt(MAX_TINT_NUMBER - incrementIndex * tintStepSize);
			if (tintNumber > 0) {
				tickMark.tintClass = "tint-" + tintNumber;
			}

			return tickMark;
		});

		var horizontalKey = colorScaleKey(
			paper,
			tickMarks,
			"fm-datum-color-wheel-c",
			scale,
			"horizontal"
		);
		horizontalKey.move(
			30,
			0
		);

		horizontalKey.markValue(230);

		QUnit.ok(
			horizontalKey instanceof SVG.G,
			"A horizontal color scale key component should return an SVG group."
		);
		QUnit.ok(
			horizontalKey.node.querySelectorAll("rect")[0].classList.contains("tint-7"),
			"A horizontal color scale key component should have segments with the correct tint class"
		);
		QUnit.ok(
			horizontalKey.node.querySelectorAll("rect")[1].classList.contains("tint-3"),
			"A horizontal color scale key component should have segments with the correct tint class"
		);
	});

	QUnit.load();
	QUnit.start();
});
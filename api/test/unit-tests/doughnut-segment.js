"use strict";
require.config({
	paths: {
		"QUnit": "/node_modules/qunitjs/qunit/qunit",
		"svg-js": "/node_modules/svg.js/dist/svg",
		"Doughnut-segment": "/inventions/doughnut-segment",
		"path": "../../node_modules/paths-js/dist/amd/path",
		"geometry": "/utilities/geometry"
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

require(["QUnit", "svg-js", "Doughnut-segment"], function(QUnit, SVG) {

	var paperOne = SVG(createTestContainer("Is background path string correct?"));

	var segment = paperOne.doughnutSegment(
		10,
		100,
		100,
		50,
		0,
		Math.PI / 2
	);

	QUnit.test("A doughnut segment should have the correct path string.", function() {

		QUnit.equal(
			segment.node.getAttribute("d"),
			"M 10 0 A 100 100 0 0 1 110 100 L 60 100 A 50 50 0 0 0 10 50 Z ",
			"A circle segment should have the correct path string."
		);

	});

	QUnit.load();
	QUnit.start();
});
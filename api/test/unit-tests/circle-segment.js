"use strict";
require.config({
	paths: {
		"QUnit": "/node_modules/qunitjs/qunit/qunit",
		"svg-js": "/node_modules/svg.js/dist/svg",
		"Circle-segment": "/api/inventions/circle-segment",
		"path": "/node_modules/paths-js/dist/amd/path",
		"geometry": "/api/utilities/geometry"
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

require(["QUnit", "svg-js", "Circle-segment"], function(QUnit, SVG) {

	var paperOne = SVG(createTestContainer("Is background path string correct?"));

	var segment = paperOne.circleSegment(
		10,
		100,
		100,
		0,
		Math.PI / 2
	);

	QUnit.test("A circle segment should have the correct path string.", function() {

		QUnit.equal(
			segment.node.getAttribute("d"),
			"M 10 100 L 10 0 A 100 100 0 0 1 110 100 Z ",
			"A circle segment should have the correct path string."
		);

	});

	QUnit.load();
	QUnit.start();
});
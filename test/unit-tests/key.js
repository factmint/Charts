"use strict";
require.config({
	paths: {
		"Color": "/utilities/color",
		"path": "../../node_modules/paths-js/dist/amd/path",
		"Key": "/components/key",
		"QUnit": "/node_modules/qunitjs/qunit/qunit",
		"svg-js": "/node_modules/svg.js/dist/svg",
		'flow': '/inventions/flow',
		'float': '/etc/float',
		'grid': '/etc/grid',
		'centre': '/etc/centre'
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

require(["Color",  "path", "Key", "QUnit", "svg-js", "flow"], function(Color, path, key, QUnit, SVG, Flow) {

	var paper = SVG(createTestContainer("Test container"));

	QUnit.test("The key component should render correctly.", function() {

		var width = 200;
		var values = ["One", "Two", "Three", "Four", "Five", "Six", "Seven"];
		var colorClasses = Color.harmonious(7);

		var testKey = key(paper, width, values, colorClasses);

		QUnit.ok(testKey.node.querySelector(".fm-key-top-border"), "The key should have a top border.");

		QUnit.ok(testKey instanceof SVG.G, "The key component should return an SVG group.");

		QUnit.equal(
			7,
			testKey.node.querySelectorAll(".fm-key-value-indicator").length,
			"There should be seven value indicators when seven values are passed to the key."
		);

		QUnit.equal(
			7,
			testKey.node.querySelectorAll(".fm-key-value-title").length,
			"There should be seven value titles when seven values are passed to the key."
		);
	});

	QUnit.load();
	QUnit.start();
});
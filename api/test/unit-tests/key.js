"use strict";
require.config({
	paths: {
		"Color": "/api/utilities/color",
		"path": "/node_modules/paths-js/dist/amd/path",
		"Key": "/api/components/key",
		"QUnit": "/node_modules/qunitjs/qunit/qunit",
		"svg-js": "/node_modules/svg.js/dist/svg",
		'flow': '/api/inventions/flow',
		'float': '/api/etc/float',
		'grid': '/api/etc/grid',
		'center': '/api/etc/center'
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

require(["Color", "path", "Key", "QUnit", "svg-js", "flow"], function(Color, path, key, QUnit, SVG, Flow) {

	var paperOne = SVG(createTestContainer("Basic key"));
	var paperTwo = SVG(createTestContainer("Single colour override"));

	QUnit.test("The key component should render correctly.", function() {

		var width = 200;
		var values = ["One", "Two", "Three", "Four", "Five", "Six", "Seven"];
		var colorClasses = Color.harmonious(7);

		var testKey = key(paperOne, width, values, colorClasses);
		
		var colorOverrides = ["", "#ff0000"];
		var testKeyWithColorOverrides = key(paperTwo, width, values, colorClasses, colorOverrides);

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
		
		QUnit.equal(
			true,
			testKeyWithColorOverrides.node.querySelectorAll(".fm-key-value-indicator")[0].classList.contains("fm-datum-color-wheel-a"),
			"A value indicator should keep the default colour wheel class when a colour override array has been passed but the corresponding index has no value."
		);
		
		QUnit.equal(
			"#ff0000",
			testKeyWithColorOverrides.node.querySelectorAll(".fm-key-value-indicator")[1].getAttribute("fill"),
			"A value indicator should assume the fill colour specified in the colour override array."
		);
	});

	QUnit.load();
	QUnit.start();
});
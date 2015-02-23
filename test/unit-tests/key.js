"use strict";
require.config({
	paths: {
		"Color": "/utilities/color",
		"path": "/node_modules/paths-js",
		"key": "/components/key",
		"QUnit": "/node_modules/qunitjs/qunit/qunit",
		"svg-js": "/node_modules/svg.js/dist/svg",
		'Flow': '/inventions/flow',
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

require(["Color",  "path", "key", "QUnit", "svg-js"], function(Color, path, key, QUnit, SVG) {

	function createTestContainer(titleText) {
		var container = document.createElement('div');
		container.className = 'test-svg-container';
		
		var title = document.createElement('h4');
		title.innerHTML = titleText;
		container.appendChild(title);
		
		document.body.appendChild(container);
		
		return container;
	}

	var chart = createTestContainer("Test container");

	QUnit.test("The key component should return an SVG group.", function() {

		var width = 200;
		var values = ["One", "Two", "Three", "Four", "Five", "Six", "Seven"];
		var colorClasses = Color.harmonious(7);

		var testKey = key(chart, width, values, colorClasses);

	});

	QUnit.load();
	QUnit.start();
});
"use strict";
require.config({
	paths: {
		"QUnit": "/node_modules/qunitjs/qunit/qunit",
		"svg-js": "/node_modules/svg.js/dist/svg",
		"color-scale-key": "/components/color-scale-key"
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

require(["QUnit", "svg-js", "color-scale-key"], function(QUnit, SVG, Color) {
	
	var key = colorScaleKey();
	
	QUnit.test("A harmonious colour series should produce the correct classes.", function() {
	

		QUnit.equal(
			Color.harmonious(Color.colorWheelClasses.length + 1)[Color.colorWheelClasses.length],
			Color.colorWheelClasses[0],
			"A set of harmonious colours that extends the size of the colour wheel should start from the beginning."
		);
	});

	QUnit.load();
	QUnit.start();
});
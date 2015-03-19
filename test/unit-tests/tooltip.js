"use strict";
require.config({
	paths: {
		"QUnit": "/node_modules/qunitjs/qunit/qunit",
		"svg-js": "/node_modules/svg.js/dist/svg",
		"Tooltip": "/components/tooltip",
		"tooltip-background": "/inventions/tooltip-background",
		"G.unshift": "/extensions/G.unshift",
		"path": "../../node_modules/paths-js/dist/amd/path"
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

require(["QUnit", "svg-js", "Tooltip"], function(QUnit, SVG, Tooltip) {

	var paper = SVG(createTestContainer("Is background path string correct?"));

	QUnit.test("A tooltip background should have the correct path string.", function() {

		var leftTooltipStartX = 10;
		var leftTooltipStartY = 20;

		var tooltipTextString = "Test";
		var tooltipText = paper
			.text(tooltipTextString)
			.attr({
				"dominant-baseline": "central",
				"font-family": "Lato, sans-serif",
				"font-size": "12px",
				"opacity": "0"
			});
		var tooltipTextBBox = tooltipText.bbox();
		
		var leftTooltip = Tooltip(
			paper,
			leftTooltipStartX,
			leftTooltipStartY,
			tooltipTextString,
			"left"
		);

		var leftTooltipBBox = leftTooltip.bbox();

		var rightTooltipStartX = leftTooltipBBox.x2;
		var rightTooltipStartY = leftTooltipStartY + leftTooltipBBox.y2;

		var rightTooltip = Tooltip(
			paper,
			rightTooltipStartX,
			rightTooltipStartY,
			tooltipTextString,
			"right"
		);

		QUnit.equal(
			leftTooltip.background.node.getAttribute("d"),
			"M 10 20 L 17 15 L 17 10.4921875 S 17 5.4921875 22 5.4921875 L 48.921875 5.4921875 S 53.921875 5.4921875 53.921875 10.4921875 L 53.921875 29.5078125 S 53.921875 34.5078125 48.921875 34.5078125 L 22 34.5078125 S 17 34.5078125 17 29.5078125 L 17 25 Z ",
			"A tooltip with the arrow on the left should have the correct path string."
		);

		QUnit.equal(
			rightTooltip.background.node.getAttribute("d"),
			"M 53.921875 54.5078125 L 46.921875 49.5078125 L 46.921875 45 S 46.921875 40 41.921875 40 L 15 40 S 10 40 10 45 L 10 64.015625 S 10 69.015625 15 69.015625 L 41.921875 69.015625 S 46.921875 69.015625 46.921875 64.015625 L 46.921875 59.5078125 Z ",
			"A tooltip with the arrow on the right should have the correct path string."
		);
	});

	QUnit.load();
	QUnit.start();
});
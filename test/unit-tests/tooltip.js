"use strict";
require.config({
	paths: {
		"QUnit": "/node_modules/qunitjs/qunit/qunit",
		"svg-js": "/node_modules/svg.js/dist/svg",
		"Tooltip": "/components/tooltip",
		"TwoSectionTooltip": "/components/two-section-tooltip",
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

require(["QUnit", "svg-js", "Tooltip", "TwoSectionTooltip"], function(QUnit, SVG, Tooltip, TwoSectionTooltip) {

	var paper = SVG(createTestContainer("Is background path string correct?"));
	
	var SPACING = 10;

	var leftTooltip = Tooltip(
		paper,
		400,
		180,
		"Left tooltip",
		"left"
	);

	var rightTooltip = Tooltip(
		paper,
		100,
		180,
		"Right tooltip",
		"right"
	);

	var topTooltip = Tooltip(
		paper,
		250,
		350,
		"Top tooltip",
		"top"
	);

	var bottomTooltip = Tooltip(
		paper,
		250,
		90,
		"Bottom tooltip",
		"bottom"
	);

	var topLeftTooltip = TwoSectionTooltip(
		paper,
		350,
		275,
		"Top left tooltip",
		"50",
		"topLeft"
	);
	
	var topRightTooltip = TwoSectionTooltip(
		paper,
		170,
		275,
		"Top right tooltip",
		"50",
		"topRight"
	);

	var bottomLeftTooltip = TwoSectionTooltip(
		paper,
		350,
		150,
		"Bottom left tooltip",
		"50",
		"bottomLeft"
	);
	
	var bottomRightTooltip = TwoSectionTooltip(
		paper,
		170,
		150,
		"Bottom right tooltip",
		"50",
		"bottomRight"
	);
	
	var twoSectionLeftTooltip = TwoSectionTooltip(
		paper,
		400,
		240,
		"Left tooltip",
		"50",
		"left"
	);
	
	var twoSectionRightTooltip = TwoSectionTooltip(
		paper,
		120,
		240,
		"Right tooltip",
		"50",
		"right"
	);

	QUnit.test("A single section tooltip background should have the correct path string.", function() {

		QUnit.equal(
			leftTooltip.background.node.getAttribute("d"),
			"M 400 180 L 407 175 L 407 170.492188 S 407 165.492188 412 165.492188 L 474.734375 165.492188 S 479.734375 165.492188 479.734375 170.492188 L 479.734375 189.507813 S 479.734375 194.507813 474.734375 194.507813 L 412 194.507813 S 407 194.507813 407 189.507813 L 407 185 Z ",
			"A tooltip with the arrow on the left should have the correct path string."
		);
		
		QUnit.equal(
			rightTooltip.background.node.getAttribute("d"),
			"M 100 180 L 107 175 L 107 170.492188 S 107 165.492188 112 165.492188 L 181.359375 165.492188 S 186.359375 165.492188 186.359375 170.492188 L 186.359375 189.507813 S 186.359375 194.507813 181.359375 194.507813 L 112 194.507813 S 107 194.507813 107 189.507813 L 107 185 Z ",
			"A tooltip with the arrow on the right should have the correct path string."
		);
		
		QUnit.equal(
			topTooltip.background.node.getAttribute("d"),
			"M 250 350 L 245 357 L 218.828125 357 S 213.828125 357 213.828125 362 L 213.828125 381.015625 S 213.828125 386.015625 218.828125 386.015625 L 281.171875 386.015625 S 286.171875 386.015625 286.171875 381.015625 L 286.171875 362 S 286.171875 357 281.171875 357 L 255 357 Z ",
			"A tooltip with the arrow on the top should have the correct path string."
		);
		
		QUnit.equal(
			bottomTooltip.background.node.getAttribute("d"),
			"M 250 90 L 245 97 L 209.21875 97 S 204.21875 97 204.21875 102 L 204.21875 121.015625 S 204.21875 126.015625 209.21875 126.015625 L 290.78125 126.015625 S 295.78125 126.015625 295.78125 121.015625 L 295.78125 102 S 295.78125 97 290.78125 97 L 255 97 Z ",
			"A tooltip with the arrow on the bottom should have the correct path string."
		);

	});
	
	QUnit.test("A multi-section tooltip should have two background paths with the correct path strings.", function() {

		QUnit.equal(
			topLeftTooltip.background.leftSection.node.getAttribute("d"),
			"M 350 275 L 345 282 L 308.453125 282 S 303.453125 282 303.453125 287 L 303.453125 306.015625 S 303.453125 311.015625 308.453125 311.015625 L 396.546875 311.015625 L 396.546875 282 L 355 282 L 350 275",
			"A left section with an arrow on the top should have the correct path string."
		);
		
		QUnit.equal(
			topLeftTooltip.background.rightSection.node.getAttribute("d"),
			"M 398.546875 282 L 375.625 282 S 370.625 282 370.625 287 L 370.625 306.015625 S 370.625 311.015625 375.625 311.015625 L 398.546875 311.015625 Z ",
			"A right section with no arrow should have the correct path string."
		);
		
		QUnit.equal(
			topRightTooltip.background.leftSection.node.getAttribute("d"),
			"M 154.039063 275 L 59.132813 275 S 54.132813 275 54.132813 280 L 54.132813 299.015625 S 54.132813 304.015625 59.132813 304.015625 L 154.039063 304.015625 Z ",
			"A left section with no arrow should have the correct path string."
		);
		
		QUnit.equal(
			topRightTooltip.background.rightSection.node.getAttribute("d"),
			"M 170 275 L 165 282 L 161.039063 282 S 156.039063 282 156.039063 287 L 156.039063 306.015625 S 156.039063 311.015625 161.039063 311.015625 L 183.960938 311.015625 L 183.960938 282 L 175 282 L 170 275",
			"A right section with an arrow on the top should have the correct path string."
		);
		
		QUnit.equal(
			bottomLeftTooltip.background.leftSection.node.getAttribute("d"),
			"M 350 150 L 345 157 L 298.84375 157 S 293.84375 157 293.84375 162 L 293.84375 181.015625 S 293.84375 186.015625 298.84375 186.015625 L 406.15625 186.015625 L 406.15625 157 L 355 157 L 350 150",
			"A left section with an arrow on the bottom should have the correct path string."
		);
		
		QUnit.equal(
			bottomRightTooltip.background.rightSection.node.getAttribute("d"),
			"M 170 150 L 165 157 L 161.039063 157 S 156.039063 157 156.039063 162 L 156.039063 181.015625 S 156.039063 186.015625 161.039063 186.015625 L 183.960938 186.015625 L 183.960938 157 L 175 157 L 170 150",
			"A right section with an arrow on the bottom should have the correct path string."
		);
		
	});

	QUnit.load();
	QUnit.start();
});
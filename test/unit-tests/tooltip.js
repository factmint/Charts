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

	var paperOne = SVG(createTestContainer("Is background path string correct?"));
	var paperTwo = SVG(createTestContainer("Is background path string correct?"));
	var paperThree = SVG(createTestContainer("Is background path string correct?"));
	var paperFour = SVG(createTestContainer("Is background path string correct?"));
	var paperFive = SVG(createTestContainer("Is background path string correct?"));
	var paperSix = SVG(createTestContainer("Is background path string correct?"));
	var paperSeven = SVG(createTestContainer("Is background path string correct?"));
	var paperEight = SVG(createTestContainer("Is background path string correct?"));
	var paperNine = SVG(createTestContainer("Is background path string correct?"));
	var paperTen = SVG(createTestContainer("Is background path string correct?"));

	var SPACING = 10;

	var leftTooltip = Tooltip(
		paperOne,
		"Left tooltip",
		"left"
	)
		.move(0, 20);

	var rightTooltip = Tooltip(
		paperTwo,
		"Right tooltip",
		"right"
	)
		.move(100, 20);

	var topTooltip = Tooltip(
		paperThree,
		"Top tooltip",
		"top"
	)
		.move(50, 0);

	var bottomTooltip = Tooltip(
		paperFour,
		"Bottom tooltip",
		"bottom"
	)
		.move(50, 50);

	var topLeftTooltip = TwoSectionTooltip(
		paperFive,
		"Top left tooltip",
		"50",
		"topLeft"
	)
		.move(60, 20);
	
	var topRightTooltip = TwoSectionTooltip(
		paperSix,
		"Top right tooltip",
		"50",
		"topRight"
	)
		.move(130, 20);

	var bottomLeftTooltip = TwoSectionTooltip(
		paperSeven,
		"Bottom left tooltip",
		"50",
		"bottomLeft"
	)
		.move(60, 50);
	
	var bottomRightTooltip = TwoSectionTooltip(
		paperEight,
		"Bottom right tooltip",
		"50",
		"bottomRight"
	)
		.move(140, 50);
	
	var twoSectionLeftTooltip = TwoSectionTooltip(
		paperNine,
		"Left tooltip",
		"50",
		"left"
	)
		.move(0, 30);
	
	var twoSectionRightTooltip = TwoSectionTooltip(
		paperTen,
		"Right tooltip",
		"50",
		"right"
	)
		.move(130, 30);

	QUnit.test("A single section tooltip background should have the correct path string.", function() {

		QUnit.equal(
			leftTooltip.background.node.getAttribute("d"),
			"M 0 20 L 7 15 L 7 10.492188 S 7 5.492188 12 5.492188 L 74.734375 5.492188 S 79.734375 5.492188 79.734375 10.492188 L 79.734375 29.507813 S 79.734375 34.507813 74.734375 34.507813 L 12 34.507813 S 7 34.507813 7 29.507813 L 7 25 Z ",
			"A tooltip with the arrow on the left should have the correct path string."
		);
		
		QUnit.equal(
			rightTooltip.background.node.getAttribute("d"),
			"M 100 20 L 107 15 L 107 10.492188 S 107 5.492188 112 5.492188 L 181.359375 5.492188 S 186.359375 5.492188 186.359375 10.492188 L 186.359375 29.507813 S 186.359375 34.507813 181.359375 34.507813 L 112 34.507813 S 107 34.507813 107 29.507813 L 107 25 Z ",
			"A tooltip with the arrow on the right should have the correct path string."
		);
		
		QUnit.equal(
			topTooltip.background.node.getAttribute("d"),
			"M 50 0 L 45 7 L 18.828125 7 S 13.828125 7 13.828125 12 L 13.828125 31.015625 S 13.828125 36.015625 18.828125 36.015625 L 81.171875 36.015625 S 86.171875 36.015625 86.171875 31.015625 L 86.171875 12 S 86.171875 7 81.171875 7 L 55 7 Z ",
			"A tooltip with the arrow on the top should have the correct path string."
		);
		
		QUnit.equal(
			bottomTooltip.background.node.getAttribute("d"),
			"M 50 50 L 45 57 L 9.21875 57 S 4.21875 57 4.21875 62 L 4.21875 81.015625 S 4.21875 86.015625 9.21875 86.015625 L 90.78125 86.015625 S 95.78125 86.015625 95.78125 81.015625 L 95.78125 62 S 95.78125 57 90.78125 57 L 55 57 Z ",
			"A tooltip with the arrow on the bottom should have the correct path string."
		);

	});
	
	QUnit.test("A multi-section tooltip should have two background paths with the correct path strings.", function() {

		QUnit.equal(
			topLeftTooltip.background.leftSection.node.getAttribute("d"),
			"M 60 20 L 55 27 L 18.453125 27 S 13.453125 27 13.453125 32 L 13.453125 51.015625 S 13.453125 56.015625 18.453125 56.015625 L 106.546875 56.015625 L 106.546875 27 L 65 27 L 60 20",
			"A left section with an arrow on the top should have the correct path string."
		);
		
		QUnit.equal(
			topLeftTooltip.background.rightSection.node.getAttribute("d"),
			"M 107.546875 27 L 84.625 27 S 79.625 27 79.625 32 L 79.625 51.015625 S 79.625 56.015625 84.625 56.015625 L 107.546875 56.015625 Z ",
			"A right section with no arrow should have the correct path string."
		);
		
		QUnit.equal(
			topRightTooltip.background.leftSection.node.getAttribute("d"),
			"M 115.039063 20 L 20.132813 20 S 15.132813 20 15.132813 25 L 15.132813 44.015625 S 15.132813 49.015625 20.132813 49.015625 L 115.039063 49.015625 Z ",
			"A left section with no arrow should have the correct path string."
		);
		
		QUnit.equal(
			topRightTooltip.background.rightSection.node.getAttribute("d"),
			"M 130 20 L 125 27 L 121.039063 27 S 116.039063 27 116.039063 32 L 116.039063 51.015625 S 116.039063 56.015625 121.039063 56.015625 L 143.960938 56.015625 L 143.960938 27 L 135 27 L 130 20",
			"A right section with an arrow on the top should have the correct path string."
		);
		
		QUnit.equal(
			bottomLeftTooltip.background.leftSection.node.getAttribute("d"),
			"M 60 50 L 55 57 L 8.84375 57 S 3.84375 57 3.84375 62 L 3.84375 81.015625 S 3.84375 86.015625 8.84375 86.015625 L 116.15625 86.015625 L 116.15625 57 L 65 57 L 60 50",
			"A left section with an arrow on the bottom should have the correct path string."
		);
		
		QUnit.equal(
			bottomRightTooltip.background.rightSection.node.getAttribute("d"),
			"M 140 50 L 135 57 L 131.039063 57 S 126.039063 57 126.039063 62 L 126.039063 81.015625 S 126.039063 86.015625 131.039063 86.015625 L 153.960938 86.015625 L 153.960938 57 L 145 57 L 140 50",
			"A right section with an arrow on the bottom should have the correct path string."
		);
		
	});

	QUnit.load();
	QUnit.start();
});
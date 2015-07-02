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
			"M 0 0 L 7 -5 L 7 -9.507813 S 7 -14.507813 12 -14.507813 L 74.734375 -14.507813 S 79.734375 -14.507813 79.734375 -9.507813 L 79.734375 9.507813 S 79.734375 14.507813 74.734375 14.507813 L 12 14.507813 S 7 14.507813 7 9.507813 L 7 5 Z ",
			"A tooltip with the arrow on the left should have the correct path string."
		);
		
		QUnit.equal(
			rightTooltip.background.node.getAttribute("d"),
			"M 0 0 L 7 -5 L 7 -9.507813 S 7 -14.507813 12 -14.507813 L 81.359375 -14.507813 S 86.359375 -14.507813 86.359375 -9.507813 L 86.359375 9.507813 S 86.359375 14.507813 81.359375 14.507813 L 12 14.507813 S 7 14.507813 7 9.507813 L 7 5 Z ",
			"A tooltip with the arrow on the right should have the correct path string."
		);
		
		QUnit.equal(
			topTooltip.background.node.getAttribute("d"),
			"M 0 0 L -5 7 L -31.171875 7 S -36.171875 7 -36.171875 12 L -36.171875 31.015625 S -36.171875 36.015625 -31.171875 36.015625 L 31.171875 36.015625 S 36.171875 36.015625 36.171875 31.015625 L 36.171875 12 S 36.171875 7 31.171875 7 L 5 7 Z ",
			"A tooltip with the arrow on the top should have the correct path string."
		);
		
		QUnit.equal(
			bottomTooltip.background.node.getAttribute("d"),
			"M 0 0 L -5 7 L -40.78125 7 S -45.78125 7 -45.78125 12 L -45.78125 31.015625 S -45.78125 36.015625 -40.78125 36.015625 L 40.78125 36.015625 S 45.78125 36.015625 45.78125 31.015625 L 45.78125 12 S 45.78125 7 40.78125 7 L 5 7 Z ",
			"A tooltip with the arrow on the bottom should have the correct path string."
		);

	});
	
	QUnit.test("A multi-section tooltip should have two background paths with the correct path strings.", function() {

		QUnit.equal(
			topLeftTooltip.background.leftSection.node.getAttribute("d"),
			"M 0 0 L -5 7 L -41.546875 7 S -46.546875 7 -46.546875 12 L -46.546875 31.015625 S -46.546875 36.015625 -41.546875 36.015625 L 46.546875 36.015625 L 46.546875 7 L 5 7 L 0 0",
			"A left section with an arrow on the top should have the correct path string."
		);
		
		QUnit.equal(
			topLeftTooltip.background.rightSection.node.getAttribute("d"),
			"M-47.546875 7L-70.46875 7S-75.46875 7 -75.46875 12L-75.46875 31.015625S-75.46875 36.015625 -70.46875 36.015625L-47.546875 36.015625Z ",
			"A right section with no arrow should have the correct path string."
		);
		
		QUnit.equal(
			topRightTooltip.background.leftSection.node.getAttribute("d"),
			"M-14.9609375 0L-109.8671875 0S-114.8671875 0 -114.8671875 5L-114.8671875 24.015625S-114.8671875 29.015625 -109.8671875 29.015625L-14.9609375 29.015625Z ",
			"A left section with no arrow should have the correct path string."
		);
		
		QUnit.equal(
			topRightTooltip.background.rightSection.node.getAttribute("d"),
			"M 0 0 L -5 7 L -8.960938 7 S -13.960938 7 -13.960938 12 L -13.960938 31.015625 S -13.960938 36.015625 -8.960938 36.015625 L 13.960938 36.015625 L 13.960938 7 L 5 7 L 0 0",
			"A right section with an arrow on the top should have the correct path string."
		);
		
		QUnit.equal(
			bottomLeftTooltip.background.leftSection.node.getAttribute("d"),
			"M 0 0 L -5 7 L -51.15625 7 S -56.15625 7 -56.15625 12 L -56.15625 31.015625 S -56.15625 36.015625 -51.15625 36.015625 L 56.15625 36.015625 L 56.15625 7 L 5 7 L 0 0",
			"A left section with an arrow on the bottom should have the correct path string."
		);
		
		QUnit.equal(
			bottomRightTooltip.background.rightSection.node.getAttribute("d"),
			"M 0 0 L -5 7 L -8.960938 7 S -13.960938 7 -13.960938 12 L -13.960938 31.015625 S -13.960938 36.015625 -8.960938 36.015625 L 13.960938 36.015625 L 13.960938 7 L 5 7 L 0 0",
			"A right section with an arrow on the bottom should have the correct path string."
		);
		
	});

	QUnit.load();
	QUnit.start();
});
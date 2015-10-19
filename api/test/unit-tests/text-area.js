"use strict";
require.config({
	paths: {
		"QUnit": "/node_modules/qunitjs/qunit/qunit",
		"svg-js": "/node_modules/svg.js/dist/svg",
		"TextArea": "/api/components/text-area"
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

require(["QUnit", "svg-js", "TextArea"], function(QUnit, SVG, TextArea) {

	var paperOne = SVG(createTestContainer("Is text wrapping correctly?"));
    
    var textAreaOne = TextArea(
    	paperOne,
     	200,
    	200,
    	"Donec ullamcorper nulla non metus auctor fringilla.",
    	"fm-test"
    );

	var paperTwo = SVG(createTestContainer("Is text wrapping correctly?"));
    
    var textAreaTwo = TextArea(
    	paperTwo,
     	200,
    	200,
    	"Integer posuere erat a ante venenatis dapibus posuere velit aliquet.",
    	"fm-test"
    );

	var paperThree = SVG(createTestContainer("Is text wrapping correctly?"));
    
    var textAreaThree = TextArea(
    	paperThree,
     	200,
    	200,
    	"Venenatisvenenatisvenenatisvenenatis.",
    	"fm-test"
    );

	QUnit.test("Text should wrap correctly.", function() {

        var textAreaOneTspanCount = textAreaOne.node.querySelectorAll("tspan").length;
        var textAreaTwoTspanCount = textAreaTwo.node.querySelectorAll("tspan").length;
        
		QUnit.equal(
			textAreaOneTspanCount,
			2,
			"A string of text that is more than 100% of the specified area width but less than 200% should be wrapped onto two lines by using two <tspan> elements."
		);
		
		QUnit.equal(
			textAreaTwoTspanCount,
			3,
			"A string of text that is more than 200% of the specified area width but less than 300% should be wrapped onto two lines by using three <tspan> elements."
		);
		
		QUnit.equal(
			textAreaTwoTspanCount,
			2,
			"A single word that is longer than the specified width should wrap surplus characters onto a new line."
		);
		
	});

	QUnit.load();
	QUnit.start();
});
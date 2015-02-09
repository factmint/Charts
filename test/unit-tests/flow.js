"use strict";
require.config({
	paths: {
		'QUnit': '/node_modules/qunitjs/qunit/qunit',
		'svg-js': '/node_modules/svg.js/dist/svg',
		'Flow': '/inventions/flow',
		'float': '/etc/float',
		'grid': '/etc/grid'
	},
	shim: {
		'QUnit': {
			exports: 'QUnit',
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

require(['QUnit', 'svg-js', 'Flow'], function(QUnit, SVG) {
	
	var XPADDING = 5;
	var YPADDING = 10;
	var SQUARE_LENGTH = 10;
	var FLOW_WIDTH = 50;
	
	QUnit.test('A flow element should be extended from a group', function() {
		var paper = SVG(createTestContainer('A flow element should be extended from a group'));
		var flow = paper.flow();
		
		QUnit.ok(flow instanceof SVG.G);
	});
	
	QUnit.test('A float-left flow should put squares next to each other', function() {
		var paper = SVG(createTestContainer('A float-left flow should put squares next to each other'));
		var flow = paper.flow(FLOW_WIDTH, XPADDING, YPADDING);
		
		flow.add(paper.rect(SQUARE_LENGTH, SQUARE_LENGTH));
		flow.add(paper.rect(SQUARE_LENGTH, SQUARE_LENGTH));
		
		flow.floatLeft();
		
		QUnit.equal(flow.bbox().width, SQUARE_LENGTH * 2 + XPADDING, "for 2 squares the flow should occupy double width + single padding");
		QUnit.equal(flow.bbox().height, SQUARE_LENGTH, "for 2 squares the flow should occupy single height");
		
		flow.add(paper.rect(SQUARE_LENGTH, SQUARE_LENGTH));
		flow.add(paper.rect(SQUARE_LENGTH, SQUARE_LENGTH));
		flow.add(paper.rect(SQUARE_LENGTH, SQUARE_LENGTH));
		flow.add(paper.rect(SQUARE_LENGTH, SQUARE_LENGTH));
		
		flow.floatLeft();
		
		QUnit.equal(flow.bbox().width, SQUARE_LENGTH * 3 + XPADDING * 2, "for 6 squares the flow should occupy triple width + double padding");
		QUnit.equal(flow.bbox().height, SQUARE_LENGTH * 2 + YPADDING, "for 6 squares the flow should occupy double height + single padding");
		QUnit.equal(flow.get(5).bbox().x, SQUARE_LENGTH * 2 + XPADDING * 2, "The 6th square is on the far right");
		
		flow.add(paper.rect(SQUARE_LENGTH, SQUARE_LENGTH));
		
		flow.floatLeft();
		
		QUnit.equal(flow.bbox().height, SQUARE_LENGTH * 3 + YPADDING * 2, "for 7 squares the flow should occupy triple height + double padding");
		QUnit.equal(flow.get(6).bbox().x, 0, "The 7th square is on the far left");
	});
	
	QUnit.test('A float-right flow should put squares next to each other, starting from the right', function() {
		var paper = SVG(createTestContainer('A float-right flow should put squares next to each other, starting from the right'));
		var flow = paper.flow(FLOW_WIDTH, XPADDING, YPADDING);
		
		flow.add(paper.rect(SQUARE_LENGTH, SQUARE_LENGTH));
		flow.add(paper.rect(SQUARE_LENGTH * 2, SQUARE_LENGTH));
		flow.add(paper.rect(SQUARE_LENGTH, SQUARE_LENGTH));
		flow.add(paper.rect(SQUARE_LENGTH * 3/2, SQUARE_LENGTH));
		flow.add(paper.rect(SQUARE_LENGTH * 2, SQUARE_LENGTH));
		flow.add(paper.rect(SQUARE_LENGTH, SQUARE_LENGTH));
		flow.add(paper.rect(SQUARE_LENGTH * 1/3, SQUARE_LENGTH));
		flow.add(paper.rect(SQUARE_LENGTH, SQUARE_LENGTH));
		
		flow.floatRight();
		
		QUnit.equal(flow.bbox().width, SQUARE_LENGTH * 4 + XPADDING * 2, "The top row is largest, occupying 4 square lengths and 2 paddings");
		QUnit.equal(flow.bbox().height, SQUARE_LENGTH * 3 + YPADDING * 2, "for 8 squares the flow should occupy triple height + double padding");
		QUnit.equal(flow.get(5).bbox().x2, FLOW_WIDTH, "The 6th square is on the far right");
	});
	
	QUnit.test('A grid-left flow should put squares in columns', function() {
		var paper = SVG(createTestContainer('A grid-left flow should put squares in columns'));
		var flow = paper.flow(FLOW_WIDTH, XPADDING, YPADDING);
		
		flow.add(paper.rect(SQUARE_LENGTH, SQUARE_LENGTH));
		flow.add(paper.rect(SQUARE_LENGTH, SQUARE_LENGTH));
		flow.add(paper.rect(SQUARE_LENGTH, SQUARE_LENGTH));
		
		flow.gridLeft();
		
		QUnit.equal(flow.bbox().width, SQUARE_LENGTH * 3 + XPADDING * 2, "for 3 10px columns the flow should occupy triple width + double padding");
		QUnit.equal(flow.bbox().height, SQUARE_LENGTH, "for 3 10px columns the flow should occupy single height");
		
		flow.add(paper.rect(SQUARE_LENGTH * 2, SQUARE_LENGTH));
		
		flow.gridLeft();
		
		QUnit.equal(flow.bbox().width, SQUARE_LENGTH * 4 + XPADDING, "for 4 20px columns the flow should occupy quadruple width + single padding");
		QUnit.equal(flow.bbox().height, SQUARE_LENGTH * 2 + YPADDING, "for 4 20px columns the flow should occupy double height + single padding");
	});
	
	QUnit.test('A grid-right flow should put squares in columns, starting from the right', function() {
		var paper = SVG(createTestContainer('A grid-right flow should put squares in columns, starting from the right'));
		var flow = paper.flow(FLOW_WIDTH, XPADDING, YPADDING);
		
		flow.add(paper.rect(SQUARE_LENGTH * 3/2, SQUARE_LENGTH));
		flow.add(paper.rect(SQUARE_LENGTH * 2, SQUARE_LENGTH));
		flow.add(paper.rect(SQUARE_LENGTH, SQUARE_LENGTH));
		flow.add(paper.rect(SQUARE_LENGTH * 1/2, SQUARE_LENGTH));
		flow.add(paper.rect(SQUARE_LENGTH, SQUARE_LENGTH));
		
		flow.gridRight();
		
		QUnit.equal(flow.get(0).bbox().x2, FLOW_WIDTH, "The 1st square is on the far right");
		QUnit.equal(flow.get(1).bbox().x2, FLOW_WIDTH - XPADDING - SQUARE_LENGTH * 2, "The 2nd square is in the second column");
		QUnit.equal(flow.get(2).bbox().x2, FLOW_WIDTH, "The 3rd square is on the far right");
		QUnit.equal(flow.get(3).bbox().x2, FLOW_WIDTH - XPADDING - SQUARE_LENGTH * 2, "The 4th square is in the second column");
		QUnit.equal(flow.get(4).bbox().x2, FLOW_WIDTH, "The 5th square is on the far right");
	});

	QUnit.load();
	QUnit.start();
});
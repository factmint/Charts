"use strict";
require.config({
	paths: {
		"QUnit": "/node_modules/qunitjs/qunit/qunit",
		"svg-js": "/node_modules/svg.js/dist/svg",
		"Mapper": "/utilities/mapper"
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

require(["QUnit", "svg-js", "Mapper"], function(QUnit, SVG, HtmlTable) {
	
	var tableNode = document.querySelector("table");
	var htmlTable = new HtmlTable(tableNode);

	QUnit.test("Rows should be mapped to a data object.", function() {
		var dataObject = htmlTable.mapRows(function(rowObject, rowIndex, currentRow, headerRow) {
			console.log(rowObject);
			return {
				title: rowObject[0],
				value: rowObject[1],
				titleLabel: headerRow[0],
				valueLabel: headerRow[1]
			};
		});

		QUnit.equal(dataObject.length, 3, "There are three rows in the HTML table so an object of length three should be produced.");
		QUnit.equal(dataObject[0].title, "One", "The first column in the first row in the HTML table contains the string \"One\", so this should be the first title in the data object.");
		QUnit.equal(dataObject[0].value, "A", "The second column in the first row in the HTML table contains the string \"A\", so this should be the first value in the data object.");
		QUnit.equal(dataObject[0].titleLabel, "Title", "The first column in the header row contains the string \"Title\", and this should be set as each data item's titleLabel property.");
		QUnit.equal(dataObject[0].valueLabel, "Value", "The second column in the header row contains the string \"Value\", and this should be set as each data item's valueLabel property.");
	});

	QUnit.load();
	QUnit.start();
});
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
		var dataObject = htmlTable.mapRows(function(currentRow, rowIndex, headerRow) {
			return {
				title: currentRow[0],
				value: currentRow[1],
				rowTitle: headerRow[1]
			};
		});

		QUnit.equal(dataObject.length, 3, "There are three rows in the HTML table so an object of length three should be produced.");
		QUnit.equal(dataObject[0].title, "One", "The first column in the first row in the HTML table contains the string \"One\", so this should be the first title in the data object.");
		QUnit.equal(dataObject[0].value, "A", "There are three rows in the HTML table so an object of length three should be produced.");
		QUnit.equal(dataObject[0].rowTitle, "Value", "There are three rows in the HTML table so an object of length three should be produced.");
	});

	QUnit.test("Rows with no data should be ignored.", function() {
		var dataObject = htmlTable.mapRows(function(currentRow, rowIndex) {
			if (rowIndex === 1) {
				return null;
			}

			return {
				title: currentRow[0],
				value: currentRow[1]
			};
		});

		QUnit.equal(dataObject.length, 2, "There are three rows in the HTML table so an object of length three should be produced.");
	});

	QUnit.test("Columns should be mapped to a data object.", function() {
		var dataObject = htmlTable.mapColumns(function(currentColumn, columnIndex) {
			return {
				title: currentColumn[0],
				value: currentColumn[1]
			};
		});

		QUnit.equal(dataObject.length, 2, "There are two columns in the HTML table so an object of length two should be produced.");
	});

	QUnit.load();
	QUnit.start();
});
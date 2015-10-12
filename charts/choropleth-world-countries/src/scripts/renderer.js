define([
	"chart",
	"classList",
	"color",
	"configuration",
	"key",
	"mapper",
	"map-data/countries-with-continents",
	"number",
	"scale",
	"states",
	"utilities"
],
function(
	Chart,
	classList,
	Color,
	Configuration,
	Key,
	HtmlTable,
	mapData,
	NumberUtils,
	Scale,
	States,
	Utilities
) {

return function(left, top, width, height, options, data, chart, renderMode) {

	/*
	 * Set up the chart layout regions. Needs to be called with the layout definition object as the context
	 */
	function configureLayout(keyBBox) {
		var layout = this;

		if (layout.keyOrientation == "vertical") {
			layout.drawRegions.keyArea.width = keyBBox.width + 2 * Configuration.KEY_AREA_PADDING;
			layout.drawRegions.keyArea.height = height;
			layout.drawRegions.keyArea.x = left;
			layout.drawRegions.keyArea.y = top;

			layout.drawRegions.mapArea.width = width - layout.drawRegions.keyArea.width;
			layout.drawRegions.mapArea.height = height;
			layout.drawRegions.mapArea.x = layout.drawRegions.keyArea.width;
			layout.drawRegions.mapArea.y = top;
		} else {
			layout.drawRegions.keyArea.width = width;
			layout.drawRegions.keyArea.height = keyBBox.height;
			layout.drawRegions.keyArea.x = left;
			layout.drawRegions.keyArea.y = top + height - keyBBox.height;

			layout.drawRegions.mapArea.width = width;
			layout.drawRegions.mapArea.height = height - layout.drawRegions.keyArea.height;
			layout.drawRegions.mapArea.x = left;
			layout.drawRegions.mapArea.y = top;
			if (options.keyType == "scalar") {
				layout.drawRegions.keyArea.height += 2 * Configuration.KEY_AREA_PADDING;
				layout.drawRegions.keyArea.y -= 2 * Configuration.KEY_AREA_PADDING;
				layout.drawRegions.mapArea.height -= 2 * Configuration.KEY_AREA_PADDING;
			}
		}
	}

	/*
	 * Determine whether the key should be vertical or horizontal
	 */
	function getKeyOrientation() {
		var keyOrientation;
		
		if (width > Configuration.SMALL_BREAKPOINT && options.keyType == "scalar") {
			keyOrientation = "vertical";
		} else {
			keyOrientation = "horizontal";
		}

		return keyOrientation;
	}

	/*
	 * Draw the invisible area behind the chart to allow click handlers on background
	 */
	function drawBackground(chart) {
		var background = chart.rect(
			width,
			height
		);
		background.move(
			left,
			top
		);
		background.attr({
			"opacity": "0"
		});

		return background;
	}

	/*
	 * Function to pass to HtmlTable.map() method, mapping row data to a new JSON array
	 */
	var dataTableMapper = function(rowObject, rowIndex, currentRow, headerRowObject, colorClasses, attributes) {
		var value = parseFloat(rowObject[1].replace(/,([0-9]{3})/g, "$1"));

		var row = {
			title: rowObject[0],
			value: value
		};
		
		var colorOverride = attributes.getNamedItem("data-fm-color");
		if (colorOverride) {
			row.colorOverride = colorOverride.value;
		}
		
		return row;
	}

	var multiMeasureDataTableMapper = function(rowObject, rowIndex, currentRow, headerRowObject) {
		var dataItem = {
			title: rowObject[0],
			majority: {},
			values: {}
		};

		var rowObjectIndex = 1;
		while(rowObject[rowObjectIndex]) {
			dataItem.values[headerRowObject[rowObjectIndex]] = parseFloat(rowObject[rowObjectIndex].replace(/,([0-9]{3})/g, "$1"));
			rowObjectIndex++;
		}

		for (key in dataItem.values) {
			if (Object.keys(dataItem.majority).length === 0
					|| dataItem.values[key] > dataItem.majority.value) {
				dataItem.majority.title = key;
				dataItem.majority.value = dataItem.values[key];
			}
		}

		return dataItem;
	}

	/*
	 * Get the scheme for layout definition object
	 */
	function getLayoutSchema() {
		return {
			drawRegions: {
				mapArea: {
					width: 0,
					height: 0,
					x: 0,
					y: 0
				},
				keyArea: {
					width: 0,
					height: 0,
					x: 0,
					y: 0
				}	
			}
		};
	}

	/*
	 *	Draw the chart with the aid of utility functions above
	 */
	var drawChart = function(rows, chartDescription) {
		chartDescription.layout = getLayoutSchema();
		chartDescription.layout.keyOrientation = getKeyOrientation();

		var background = drawBackground(chart);

		var keySize;
		if (chartDescription.layout.keyOrientation == "horizontal") {
			keySize = Math.min(
				Configuration.MAX_KEY_WIDTH,
				width - Configuration.KEY_AREA_PADDING * 2
			);
		} else {
			keySize = Math.min(
				Configuration.MAX_KEY_HEIGHT,
				height - Configuration.KEY_AREA_PADDING * 2
			);
		}

		var scale = Utilities.createScale(
			rows,
			options.targetNumberOfIncrements,
			keySize
		);

		chartDescription.chart = chart;
		chartDescription.height = height;
		chartDescription.keyType = options.keyType;
		chartDescription.width = width;

		var key = Chart.drawKey(
			chartDescription,
			rows,
			scale,
			options.keyType
		);
		var keyBBox = key.bbox();

		configureLayout.call(chartDescription.layout, keyBBox);

		var stateMachine = States(chart, rows, key);
		stateMachine.start("Neutral");

		Chart.positionKey(chartDescription, key, keyBBox);

		//Utilities.drawTestRegions(chart, chartDescription.layout);

		var map = Chart.drawMap(
			chartDescription,
			key,
			mapData,
			rows,
			scale,
			stateMachine
		);

		Utilities.applyBorderFilter(chart, map);

		background.on("click", function() {
			Chart.reset(chartDescription, key, map, stateMachine);
		});

		if (renderMode == "htmlTable") {
			table.classList.add("fm-hidden");
		}
	}
	
	var table;
	var rows = data;
	var chartDescription = {};
	
	if (renderMode == "htmlTable") {
		var dataTable = new HtmlTable(data);
		
		if (dataTable.keys.length > 2) {
			options.keyType = "non-scalar";
			rows = dataTable.mapRows(multiMeasureDataTableMapper);
			chartDescription.groups = Utilities.getGroupsFromKeys(dataTable.keys);
			chartDescription.colorClasses = Color.harmonious(chartDescription.groups.length);
			chartDescription.colorGroupMap = Utilities.buildColorGroupMap(
				chartDescription.groups, chartDescription.colorClasses
			);
		} else {
			options.keyType = "scalar";
			rows = dataTable.mapRows(dataTableMapper);
		}
		table = data;
	} else {
		if (! data.groups) {
			data.groups = [];
		}
		if (data.groups.length > 2) {
			options.keyType = "non-scalar";
			chartDescription.groups = data.groups;
			chartDescription.colorClasses = Color.harmonious(chartDescription.groups.length);
			chartDescription.colorGroupMap = Utilities.buildColorGroupMap(
				chartDescription.groups, chartDescription.colorClasses
			);
		} else {
			options.keyType = "scalar";
		}
	}

	drawChart(rows, chartDescription);
}

});
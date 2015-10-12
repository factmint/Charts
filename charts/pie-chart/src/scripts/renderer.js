define([
	"chart",
	"color",
	"configuration",
	"geometry",
	"number",
	"mapper",
	"scale",
	"states",
	"utilities"
],
function(
	Chart,
	Color,
	Configuration,
	Geometry,
	NumberUtils,
	HtmlTable,
	Scale,
	States,
	Utilities
) {

return function(left, top, width, height, options, data, chart, renderMode) {

	options = Utilities.setDefaultOptions(options);
	
	/*
	 * Function to pass to HtmlTable.map() method, mapping row data to a new JSON array
	 */
	var dataTableMapper = function(rowObject, rowIndex, currentRow, headerRowObject, colorClasses, attributes) {
		var value = parseFloat(rowObject[1].replace(/,([0-9]{3})/g, "$1"));

		var row = {
			title: rowObject[0],
			details: rowObject[2],
			value: value,
			renderedValue: options.valuePrefix + NumberUtils.renderValue(value) + options.valueSuffix
		};
		
		var colorOverride = attributes.getNamedItem("data-fm-color");
		if (colorOverride && colorOverride.value !== "") {
			row.colorOverride = colorOverride.value;
		}
		
		return row;
	};
	
	/**
	 *
	 * Method to check for boolean values, etc
	 * 
	 */
	var fixOptions = function(options) {
		if (typeof(options.useOuterLabels) != "undefined") {
			if (options.useOuterLabels === "false") {
				options.useOuterLabels = false;
			} else if (options.useOuterLabels === "true") {
				options.useOuterLabels = true;
			}
		}
		
		if (typeof(options.showInnerLabels) != "undefined") {
			if (options.showInnerLabels === "false") {
				options.showInnerLabels = false;
			} else if (options.showInnerLabels === "true") {
				options.showInnerLabels = true;
			}
		}
		
		if (typeof(options.hideKey) != "undefined") {
			if (options.hideKey === "false") {
				options.hideKey = false;
			} else if (options.hideKey === "true") {
				options.hideKey = true;
			}
		}
		
		return options;
	};
	
	var drawChart = function(mappedRows) {
		
		var dataTotal = NumberUtils.getDataTotal(mappedRows);
		var overflowItemCount = Utilities.getOverflowItemCount(mappedRows, dataTotal);
		
		var rows = Utilities.processOverflowData(mappedRows, dataTotal, overflowItemCount);
		
		var maxTooltipDimensions = Utilities.getMaxTooltipDimensions(chart, rows);
		
		var whitespace = Utilities.drawBackground(chart, width, height, left, top)
			.addClass("fm-whitespace");
		
		var chartDescription = {
			chart: chart,
			colorClasses: Color.harmonious(rows.length),
			height: height,
			layout: {
				drawRegions: {}
			},
			options: fixOptions(options),
			radius: radius,
			top: top
		};
		
		var aspectRatio = width/height;

		var radius;
		var key;
					
		var keyAreaWidth;
		var pieAreaWidth;
		var pieAreaHeight;
		if (aspectRatio >= Configuration.ASPECT_RATIO_BREAKPOINT) {
			chartDescription.orientation = "landscape";
			
			keyAreaWidth = 3/10 * width;
			pieAreaWidth = width - keyAreaWidth;
			pieAreaHeight = height;
			
			chartDescription.layout.drawRegions.keyArea = {
				x: left + width - keyAreaWidth,
				y: top,
				width: keyAreaWidth,
				height: height
			};
			
			chartDescription.layout.drawRegions.pieArea = {
				x: left,
				y: top,
				width: pieAreaWidth,
				height: height
			};
			
			key = Chart.drawKey(rows, chartDescription);

		} else {
			chartDescription.orientation = "portrait";
			
			keyAreaWidth = width;
			pieAreaWidth = width;
			
			chartDescription.layout.drawRegions.keyArea = {
				x: left,
				y: 0,
				width: keyAreaWidth,
			};
			
			key = Chart.drawKey(rows, chartDescription);
			
			var keyHeight = key.bbox().height;

			key.move(
				0,
				top + height - keyHeight
			);
			
			pieAreaHeight = height - keyHeight - maxTooltipDimensions.height;

			chartDescription.layout.drawRegions.pieArea = {
				x: left,
				y: top,
				width: pieAreaWidth,
				height: pieAreaHeight
			};
			
			chartDescription.layout.drawRegions.keyArea.height = height - pieAreaHeight;
		}
		
		if (maxTooltipDimensions.width > 1/5 * width) {
			options.hideKey = true;
			options.useOuterLabels = true;
		}
		
		var overflowRadius = (overflowItemCount > 0) ? Configuration.OVERFLOW_OUTER_RADIUS : 1;
		
		if (chartDescription.radius < Configuration.MIN_RADIUS) {
			options.hideKey = true;
			options.useOuterLabels = true;
		}
		
		if (! options.hideKey) {
			chartDescription.radius = Math.min(
				pieAreaWidth / 2 - maxTooltipDimensions.width,
				(pieAreaHeight / (2 * overflowRadius))
			);
			
			if (chartDescription.radius < Configuration.MIN_RADIUS) {
				options.hideKey = true;
				options.useOuterLabels = true;
			}
		}
		
		if (options.hideKey) {
			key.remove();
		
			var heightToCompare = (height / (2 * overflowRadius));
			if (options.useOuterLabels) {
				var testDetail = chart.text("thequickbrownfoxjumpedoverthelazydog")
					.addClass("fm-externalDetails");
				var testDetailHeight = testDetail.bbox().height;
				testDetail.remove();
				
				heightToCompare -= testDetailHeight;
			}
				
			chartDescription.radius = Math.min(
				width / 2,
				heightToCompare
			);
		
			chartDescription.layout.drawRegions.pieArea = {
				x: left,
				y: top,
				width: width,
				height: height
			};
							
			if (overflowItemCount == 0) {
				chartDescription.radius = chartDescription.radius * 0.9;
			}
		}

		//Utilities.drawTestRegions(chart, chartDescription.layout);

		chartDescription.valueScale = Scale()
			.project(new Scale().domains.RealNumbers(0, dataTotal))
			.onto(new Scale().ranges.Angle());

		var outerSegments;
		var dashedBracket;
		if (rows[rows.length - 1].hasOwnProperty("overflow")) {                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       
			var otherSegmentAngle = chartDescription.valueScale.map(rows[rows.length - 1].value);
			var overflowSegmentMidpoint = otherSegmentAngle / 2;
			
			chartDescription.overflowValueScaleStart = -(Math.PI / Configuration.OVERFLOW_SPREAD) - overflowSegmentMidpoint;
			chartDescription.overflowValueScaleEnd = (Math.PI * 1/Configuration.OVERFLOW_SPREAD) - overflowSegmentMidpoint;
			
			var overflowData = rows[rows.length - 1].overflow;
			var overflowDataTotal = NumberUtils.getDataTotal(overflowData);
	
			chartDescription.overflowValueScale = Scale()
				.project(new Scale().domains.RealNumbers(0, overflowDataTotal))
				.onto(
					new Scale().ranges.Angle(
						chartDescription.overflowValueScaleStart,
						chartDescription.overflowValueScaleEnd
					)
				);
			
			outerSegments = Chart.drawOuterSegments(rows, chartDescription);
			dashedBracket = Chart.drawDashedBracket(chartDescription);
		} else {
			outerSegments = chart.group();
			dashedBracket = chart.group();
		}
		
		var innerSegments = Chart.drawInnerSegments(rows, chartDescription);

		var stateMachine = States(chartDescription, rows, innerSegments, outerSegments, dashedBracket, key);
		stateMachine.start("Neutral");
		
		Chart.applyMouseEventHandlers(rows, chartDescription, stateMachine, whitespace, innerSegments, outerSegments, key);
		
		if (renderMode == "htmlTable") {
			table.classList.add("fm-hidden");
		}
	}
	
	var table;
	var mappedRows = data;
	if (renderMode == "htmlTable") {
		mappedRows = new HtmlTable(data).mapRows(dataTableMapper);
		table = data;
	}

	drawChart(mappedRows);

}

});
define([
	"configuration",
	"geometry",
	"number",
	"two-section-tooltip"
], function(
	Configuration,
	Geometry,
	NumberUtils,
	TwoSectionTooltip
) {
	
	/*
	 * Check if a given bounding box fits within a segment
	 */
	function checkBBoxFitsInSegment(element, chartDescription, centerX, centerY, segmentStartAngle, segmentEndAngle) {
		var elementBBox = element.bbox();
		var segmentLabelCorners = [
			{x: elementBBox.x, y: elementBBox.y},
			{x: elementBBox.x2, y: elementBBox.y},
			{x: elementBBox.x, y: elementBBox.y2},
			{x: elementBBox.x2, y: elementBBox.y2}
		];
		var overlapping = false;
		segmentLabelCorners.forEach(function(corner) {
			if (! overlapping) {
				var vector = {
					x: corner.x - centerX,
					y: corner.y - centerY
				};
				var angle = Math.atan2(vector.x, -vector.y);
				if (angle < 0) {
					angle += 2 * Math.PI;
				}
				
				if (angle > segmentEndAngle || angle < segmentStartAngle) {
					overlapping = true;
				} else {
					var vectorLength = Math.sqrt(Math.pow(vector.x, 2) + Math.pow(vector.y, 2));
					if (vectorLength > chartDescription.radius) {
						overlapping = true;
					}
				}
			}
		});
		
		return overlapping;
	}
	
	/*
	 * Draw a label inside a segment
	 */
	function createSegmentLabel(chartDescription, centerX, centerY, middleAngle, label, value, segment) {
		var segmentTextPosition = {
			x: centerX + chartDescription.radius * 3/5 * Math.sin(middleAngle),
			y: centerY - chartDescription.radius * 3/5 * Math.cos(middleAngle)
		};

		var segmentBBox = segment.bbox();
		
		var segmentLabel = chartDescription.chart.text(label)
			.move(segmentTextPosition.x, segmentTextPosition.y)
			.addClass('fm-segment-label');
			
		var segmentLabelBBox = segmentLabel.bbox();
		
		segmentLabel.move(
			segmentTextPosition.x,
			segmentTextPosition.y - segmentLabelBBox.height	
		);
		
		var segmentValue = chartDescription.chart.text(value)
			.move(segmentTextPosition.x, segmentTextPosition.y)
			.addClass('fm-segment-label');
		
		segmentValue.attr({
			y: segmentLabelBBox.y2 - segmentLabelBBox.height
		});
		
		var labelGroup = chartDescription.chart.group()
			.attr({ "pointer-events": "none" });
		labelGroup.add(segmentLabel);
		labelGroup.add(segmentValue);
		
		return labelGroup;
	}
	
	/*
	 * Draw the invisible area behind the chart to allow click handlers on background
	 */
	function drawBackground(chart, width, height, left, top) {
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
	 * Draw test regions for debugging the layout
	 */
	function drawTestRegions(chart, layout) {
		var pieArea = chart.rect(
			layout.drawRegions.pieArea.width,
			layout.drawRegions.pieArea.height
		)
		.move(
			layout.drawRegions.pieArea.x,
			layout.drawRegions.pieArea.y
		);
	
		var keyArea = chart.rect(
			layout.drawRegions.keyArea.width,
			layout.drawRegions.keyArea.height
		)
			.move(
				layout.drawRegions.keyArea.x,
				layout.drawRegions.keyArea.y
			)
			.attr({ "fill" : "blue" });
	}
	
	function getMaxTooltipDimensions(chart, rows) {
		var tooltipGroup = chart.group();
		
		rows.forEach(function(row, index) {
			tooltipGroup.add(TwoSectionTooltip(
				chart,
				0,
				0,
				row.title,
				row.renderedValue,
				"left"
			));
		});
		
		var tooltipGroupBBox = tooltipGroup.bbox();
		tooltipGroup.remove();
		
		return {
			height: tooltipGroupBBox.height,
			width: tooltipGroupBBox.width
		};
	}
	
	var getApproximateKeyColumnWidth = function(chart, rows) {
		var approximateWidth = 0;
		rows.forEach(function(row) {
			var text = chart.text("" + row.title)
				.addClass("fm-key-value-title");
			var textWidth = text.bbox().width;
			text.remove();
			
			if (textWidth > approximateWidth) {
				approximateWidth = textWidth;
			}
		});
		approximateWidth += 13 + 7 + 10 + 20 + 20;
	}
	
	var getOverflowItemCount = function(rows, dataTotal) {
		var overflowItemCount = 0;
		rows.forEach(function(row) {
			if (Geometry.circle.getAngle(row.value, dataTotal) <= Configuration.MIN_RADIANS) {
				overflowItemCount++;
			}
		});
		
		return overflowItemCount;
	};
	
	/*
	 * Determine overflow items and append them to the end of the dataset
	 */
	var processOverflowData = function(rows, dataTotal, overflowItemCount) {
		var OVERFLOW_LABEL = "Other";
		
		var items = [];
		var overflowItems = [];
		rows.forEach(function(row, rowIndex) {
			if (overflowItemCount < 2 || Geometry.circle.getAngle(row.value, dataTotal) > Configuration.MIN_RADIANS) {
				items.push(row);
			} else {
				overflowItems.push(row);
			}
		});
		
		items.sort(function(a, b) {
			return b.value - a.value;
		});
		
		overflowItems.sort(function(a, b) {
			return b.value - a.value;
		});
		
		if (overflowItems.length > 0) {
			var overflowValue = NumberUtils.getDataTotal(overflowItems);
			items.push({
				title: OVERFLOW_LABEL,
				value: overflowValue,
				overflow: overflowItems
			});
		}

		return items;
	};
	
	/*
	 * Set up options with default values if not manually set
	 */
	function setDefaultOptions(options) {
		options.valuePrefix = (options.valuePrefix) ? options.valuePrefix : "";
		options.valueSuffix = (options.valueSuffix) ? options.valueSuffix : "";
		options.showInnerLabels = (options.showInnerLabels === "true") ? true : false;
		options.useOuterLabels = (options.useOuterLabels === "true") ? true : false;
		options.hideKey = (options.hideKey === "true") ? true : false;
		
		return options;
	}
    
    return {
		checkBBoxFitsInSegment: checkBBoxFitsInSegment,
		createSegmentLabel: createSegmentLabel,
		drawBackground: drawBackground,
		drawTestRegions: drawTestRegions,
		getApproximateKeyColumnWidth: getApproximateKeyColumnWidth,
		getMaxTooltipDimensions: getMaxTooltipDimensions,
		getOverflowItemCount: getOverflowItemCount,
		processOverflowData: processOverflowData,
		setDefaultOptions: setDefaultOptions
    };
});
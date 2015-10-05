define([
	"circle-segment",
	"configuration",
	"dashed-bracket",
	"doughnut-segment",
	"geometry",
	"key",
	"number",
	"path",
	"scale",
	"svg-js",
	"tooltip",
	"two-section-tooltip",
	"utilities",
	"G.move"
],
function(
	circleSegment,
	Configuration,
	dashedBracket,
	doughnutSegment,
	Geometry,
	key,
	NumberUtils,
	Path,
	Scale,
	SVG,
	Tooltip,
	TwoSectionTooltip,
	Utilities
) {

/**
 * Apply mouse event handlers to parts of the pie chart
 */
var applyMouseEventHandlers = function(data, chartDescription, stateMachine, whitespace, innerSegments, outerSegments, key) {

	var whitespaceClickHandler = function() {
		stateMachine.transition("Neutral");
	};

	whitespace.click(whitespaceClickHandler);
	
	function deActivateAllSegments() {
		innerSegments.each(function() {
			this.isCurrentlyActive = false;
		});
	}

	var segmentClickHandler = function() {
		if (this.isCurrentlyActive || stateMachine.isInState("ShowOverflowAndDataInKey")) {
			stateMachine.transition("Neutral");
		} else {
			deActivateAllSegments();
			this.isCurrentlyActive = true;
			var segmentInfo = {
				title: this.title,
				body: this.details,
				colorClass: this.colorClass,
				colorOverride: this.colorOverride
			};
			if (this.isOuterSegment) {
				stateMachine.transition("ShowingOverflowAndDataInKey", segmentInfo);
			} else {
				stateMachine.transition("ShowingDataInKey", segmentInfo);		
			}
		}
	};

	var overflowSegmentClickHandler = function() {
		if (stateMachine.isInState("ShowingOverflow")) {
			stateMachine.transition("Neutral");
		} else {
			stateMachine.transition("ShowingOverflow");
		}
	};

	innerSegments.each(function() {
		if (! this.details && ! this.overflow || chartDescription.options.hideKey && ! this.overflow) {
			this.addClass("click-disabled");
		} else {
			this.click(segmentClickHandler);
		}
		
		this.on("mouseover", function() {
			if (chartDescription.options.useOuterLabels) {
				showExternalDetails(this, chartDescription, innerSegments);	
			} else {
				showTooltip(this, chartDescription, stateMachine);
			}
		});
		this.on("mouseout", function() {
			if (chartDescription.options.useOuterLabels) {
				hideExternalDetails(chartDescription.chart);
			} else {
				removeTooltip(chartDescription.chart);
			}
		});
	});

	if (data[data.length - 1].hasOwnProperty("overflow")) {
		innerSegments.get(data.length - 1).click(overflowSegmentClickHandler);
	}

	var outerSegmentClickHandler = function() {
		stateMachine.transition("ShowingOverflowAndDataInKey");
	};
	
	outerSegments.each(function() {
		if (! this.details && ! this.overflow || chartDescription.options.hideKey) {
			this.addClass("click-disabled");
		} else {
			this.click(segmentClickHandler);
		}

		this.on("mouseover", function() {
			if (chartDescription.options.useOuterLabels) {
				showExternalDetails(this, chartDescription, innerSegments);	
			} else {
				showTooltip(this, chartDescription, stateMachine);
			}
		});
		this.on("mouseout", function() {
			if (chartDescription.options.useOuterLabels) {
				hideExternalDetails(chartDescription.chart);
			} else {
				removeTooltip(chartDescription.chart);
			}
		});
	});

};

function showExternalDetails(segment, chartDescription, innerSegments) {
	var text;
	if (segment.overflow) {
		text = segment.title;
	} else {
		text = segment.title + ": " + segment.value;
	}
	
	var details = chartDescription.chart.text(text)
		.addClass("fm-external-details");
	
	if (segment.colorOverride) {
		details.attr({ fill: segment.colorOverride.morph("#000").at(0.45).toHex() });
	} else {
		details.addClass(segment.colorClass);
	}
		
	var detailsBBox = details.bbox();
	var innerSegmentsBBox = innerSegments.bbox();
	
	var xPosition = chartDescription.layout.drawRegions.pieArea.width / 2 - detailsBBox.width / 2;
	var yPosition = innerSegmentsBBox.y2;

	details.move(
		xPosition,
		yPosition
	);
	
	chartDescription.chart.externalDetails = details;
	
}

function hideExternalDetails(chart) {
	chart.externalDetails.remove();
}

function removeTooltip(chart) {
	chart.tooltip.remove();
}

/**
 * Show a tooltip for a given map area
 */
function showTooltip(segment, chartDescription) {
	
	var midX = chartDescription.layout.drawRegions.pieArea.x
				+ chartDescription.layout.drawRegions.pieArea.width / 2;
	var midY = chartDescription.layout.drawRegions.pieArea.y
				+ chartDescription.layout.drawRegions.pieArea.height / 2;
		
	var middleAngle = (segment.startAngle + segment.endAngle) / 2;
	
	if (segment.endAngle < segment.startAngle) middleAngle += Math.PI;
	
	var circumferenceRadius;
	var midpoint;
	
	if (segment.isOuterSegment) {
		circumferenceRadius = chartDescription.radius * Configuration.OVERFLOW_OUTER_RADIUS + Configuration.TOOLTIP_DISTANCE_FROM_CIRCUMFERENCE;
	} else {
		circumferenceRadius = chartDescription.radius + Configuration.TOOLTIP_DISTANCE_FROM_CIRCUMFERENCE;
	}
	
	midpoint = Geometry.circle.getPointOnCircumference(
		midX,
		midY,
		circumferenceRadius,
		middleAngle
	);
	
	var arrowPosition;
	if (segment.overflow) {
		arrowPosition = "bottom";
	} else if (middleAngle < Geometry.circle.eighth || middleAngle >= 7 * Geometry.circle.eighth) {
		if (middleAngle <= Math.PI * 1/4) {
			arrowPosition = 'bottomLeft';
		} else {
			arrowPosition = 'bottomRight';
		}
	} else if (middleAngle >= Geometry.circle.eighth && middleAngle < 3 * Geometry.circle.eighth) {
		arrowPosition = 'left';
	} else if (middleAngle >= 3 * Geometry.circle.eighth && middleAngle < 5 * Geometry.circle.eighth) {
		if (middleAngle <= Geometry.circle.half) {
			arrowPosition = 'topLeft';
		}
		else {
			arrowPosition = 'topRight';
		}
	} else if (middleAngle >= 5 * Geometry.circle.eighth && middleAngle < 7 * Geometry.circle.eighth) {
		arrowPosition = 'right';
	}
	
	var tooltip;
	if (arrowPosition == "top" || arrowPosition == "bottom") {
		tooltip = Tooltip(
			chartDescription.chart,
			segment.title,
			arrowPosition
		);
	} else {
		tooltip = TwoSectionTooltip(
			chartDescription.chart,
			segment.title,
			segment.value,
			arrowPosition,
			(segment.colorOverride) ? segment.colorOverride : null
		);
	}

	if (segment.overflow) {
		tooltip.background.addClass(segment.colorClass);
	} else if (segment.colorOverride) {
		tooltip.background.leftSection.attr({ fill: segment.colorOverride });
		tooltip.background.rightSection.attr({ fill: segment.colorOverride.morph("#fff").at(0.4).toHex() });
	} else {
		tooltip.background.leftSection.addClass(segment.colorClass);
		tooltip.background.rightSection.addClass(segment.colorClass + " tint-5");
	}
	
	tooltip.move(
		midpoint.x,
		midpoint.y
	);

	chartDescription.chart.tooltip = tooltip;
}


/**
 * Draw the main pie
 */
var drawInnerSegments = function(data, chartDescription) {

	var innerSegments = chartDescription.chart.group();

	var startValue;
	var endValue = 0;

	var centerX = chartDescription.layout.drawRegions.pieArea.x
						+ chartDescription.layout.drawRegions.pieArea.width / 2;
	var centerY = chartDescription.layout.drawRegions.pieArea.y
						+ chartDescription.layout.drawRegions.pieArea.height / 2;
	
	var continueDrawingLabels = true;
	data.forEach(function(dataItem, dataItemIndex) {
		startValue = endValue;
		endValue += dataItem.value;

		var startAngle = chartDescription.valueScale.map(startValue);
		var endAngle = chartDescription.valueScale.map(endValue);

		var segment = chartDescription.chart.circleSegment(
			centerX,
			centerY,
			chartDescription.radius,
			startAngle,
			endAngle
		)
			.addClass("fm-segment fm-inner-segment");
		
		segment.title = dataItem.title;
		segment.value = dataItem.renderedValue;
		segment.details = dataItem.details;
		segment.startAngle = startAngle;
		segment.endAngle = endAngle;

		var middleAngle = ((startAngle + endAngle) / 2);

		var colorClass;
		if (dataItem.hasOwnProperty("overflow")) {
			colorClass = "fm-datum-color-overflow";
			segment.overflow = true;
		} else {
			colorClass = chartDescription.colorClasses[dataItemIndex];
		}
		
		if (dataItem.hasOwnProperty("colorOverride")) {
			segment.colorOverride = new SVG.Color(dataItem.colorOverride);
			segment.attr("fill", dataItem.colorOverride);
		} else {
			segment.addClass(colorClass);
			segment.colorClass = colorClass;
		}

		if (chartDescription.options.showInnerLabels && continueDrawingLabels) {
			var segmentLabel = Utilities.createSegmentLabel(
				chartDescription,
				centerX,
				centerY,
				middleAngle,
				dataItem.title,
				dataItem.renderedValue,
				segment
			);
			
			if (Utilities.checkBBoxFitsInSegment(segmentLabel, chartDescription, centerX, centerY, startAngle, endAngle)) {
				segmentLabel.remove();
				continueDrawingLabels = false;
			} else {
				segment.after(segmentLabel);
			}
		}

		innerSegments.add(segment);
	});

	return innerSegments;

};

/**
 * Draw the key
 */
var drawKey = function(data, chartDescription) {
	
	var keyValues = [];
	var colorOverrides = [];
	data.forEach(function(dataItem, dataItemIndex) {
		keyValues.push(dataItem.title);
		if (dataItem.colorOverride) {
			colorOverrides[dataItemIndex] = dataItem.colorOverride;
		}
	});

	var keyObject = key(
		chartDescription.chart,
		chartDescription.layout.drawRegions.keyArea.width,
		keyValues,
		chartDescription.colorClasses,
		colorOverrides,
		(data[data.length - 1].hasOwnProperty("overflow"))
	);

	var yPosition = chartDescription.layout.drawRegions.keyArea.y;
	
	if (chartDescription.orientation == "landscape") {
		yPosition += chartDescription.layout.drawRegions.keyArea.height / 2 - keyObject.background.bbox().height / 2;
	}

	keyObject.move(
		chartDescription.layout.drawRegions.keyArea.x,
		yPosition
	);

	return keyObject;

};

var drawDashedBracket = function(chartDescription) {

	var xPosition = chartDescription.layout.drawRegions.pieArea.x
						+ chartDescription.layout.drawRegions.pieArea.width / 2;
	var yPosition = chartDescription.layout.drawRegions.pieArea.y
						+ chartDescription.layout.drawRegions.pieArea.height / 2;

	var dashedBracket = chartDescription.chart.dashedBracket(
		xPosition,
		yPosition,
		chartDescription.radius + chartDescription.radius * Configuration.BRACKET_INNER_RADIUS_ADJUST,
        chartDescription.radius + chartDescription.radius * Configuration.BRACKET_MIDDLE_RADIUS_ADJUST,
        chartDescription.radius + chartDescription.radius * Configuration.BRACKET_OUTER_RADIUS_ADJUST,
        chartDescription.overflowValueScaleStart,
        chartDescription.overflowValueScaleEnd
	).addClass("fm-hidden");
	
	return dashedBracket;
}

/**
 * Draw the overflow (doughnut) segments
 */
var drawOuterSegments = function(data, chartDescription) {

	var overflowData = data[data.length - 1].overflow;
	var dataTotal = NumberUtils.getDataTotal(overflowData);

	var outerSegments = chartDescription.chart.group();

	var middleOfOverflow = 0;

	var startValue;
	var totalValueSoFar = 0;

	overflowData.forEach(function(dataItem, dataItemIndex) {
		var startValue = totalValueSoFar;
		totalValueSoFar += dataItem.value;

		var centerX = chartDescription.layout.drawRegions.pieArea.x
							+ chartDescription.layout.drawRegions.pieArea.width / 2;
		var centerY = chartDescription.layout.drawRegions.pieArea.y
							+ chartDescription.layout.drawRegions.pieArea.height / 2;

		var startAngle = chartDescription.overflowValueScale.map(startValue);
		var endAngle = chartDescription.overflowValueScale.map(totalValueSoFar);

		var segment = chartDescription.chart.doughnutSegment(
			centerX,
			centerY,
			chartDescription.radius * Configuration.OVERFLOW_OUTER_RADIUS,
			chartDescription.radius * Configuration.OVERFLOW_INNER_RADIUS,
			startAngle,
			endAngle
		)
			.addClass("fm-segment fm-outer-segment " + chartDescription.colorClasses[dataItemIndex]);
		
		segment.title = dataItem.title;
		segment.value = dataItem.renderedValue;
		segment.details = dataItem.details;
		segment.startAngle = startAngle;
		segment.endAngle = endAngle;
		segment.colorClass = chartDescription.colorClasses[dataItemIndex];
		segment.isOuterSegment = true;

		outerSegments.add(segment);
	});

	return outerSegments;

};

return {
	applyMouseEventHandlers: applyMouseEventHandlers,
	drawDashedBracket: drawDashedBracket,
	drawInnerSegments: drawInnerSegments,
	drawKey: drawKey,
	drawOuterSegments: drawOuterSegments
};

});
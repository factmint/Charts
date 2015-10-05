define([
	"svg-js",
	"tooltip-background",
	"G.unshift"
], function(
	SVG,
	TooltipBackground,
	Unshift
) {

return function(
	chart,
	title,
	measures,
	colorClasses,
	arrowPosition
) {

	var configuration = {
		INDICATOR_SIZE: 7,
		LINE_SPACING: 5,
		PADDING: 10,
		COLUMN_SPACING: 10
	};

	var tooltip = chart.group().addClass("fm-tooltip fm-multi-measure-tooltip");

	tooltip.configuration = configuration;

	tooltip.title = chart.text("" + title)
		.attr({
			"text-anchor": "middle"
		})
		.addClass("fm-multi-measure-tooltip-title");
	tooltip.add(tooltip.title);
	var titleObjectBBox = tooltip.title.bbox();

	tooltip.measures = [];
	var measureGroup = chart.group();
	measures.forEach(function(measureItem, measureIndex) {
		var indicator = chart.circle(
			configuration.INDICATOR_SIZE,
			configuration.INDICATOR_SIZE
		)
			.addClass("fm-multi-measure-tooltip-measure-indicator " + colorClasses[measureIndex]);

		var measure = {
			indicator: indicator,
			title: chart.text(measureItem.title).addClass("fm-multi-measure-tooltip-measure-label"),
			value: chart.text("" + measureItem.value).addClass("fm-multi-measure-tooltip-measure-value")
		};

		measureGroup.add(measure.indicator);
		measureGroup.add(measure.title);
		measureGroup.add(measure.value);

		tooltip.measures.push(measure);
	});

	tooltip.add(measureGroup);

	var tooltipBackgroundHeight = titleObjectBBox.height
		+ configuration.PADDING * 2
		+ configuration.LINE_SPACING;
	var maxMeasureTitleWidth;
	var maxMeasureValueWidth;

	tooltip.measures.forEach(function(measureItem, measureIndex) {
		var measureItemTitleBBox = measureItem.title.bbox();
		var measureItemValueBBox = measureItem.value.bbox();

		tooltipBackgroundHeight += Math.max(
			measureItemTitleBBox.height,
			measureItemTitleBBox.height
		);
		if (measureIndex > 0) {
			tooltipBackgroundHeight += configuration.LINE_SPACING;
		}
		if (measureIndex === 0) {
			maxMeasureTitleWidth = measureItemTitleBBox.width;
			maxMeasureValueWidth = measureItemValueBBox.width;
		}
		if (measureItemTitleBBox.width > maxMeasureTitleWidth) {
			maxMeasureTitleWidth = measureItemTitleBBox.width;
		}

		if (measureItemValueBBox.width > maxMeasureValueWidth) {
			maxMeasureValueWidth = measureItemValueBBox.width;
		}
	});

	var tooltipBackgroundWidth = configuration.INDICATOR_SIZE 
		+ Math.max(maxMeasureTitleWidth, titleObjectBBox.width)
		+ maxMeasureValueWidth
		+ configuration.COLUMN_SPACING * 2
		+ configuration.PADDING * 2;

	var tooltipBackgroundType;
	if (arrowPosition == "left") {
		tooltipBackgroundType = "singleLeft";
	} else if (arrowPosition == "right") {
		tooltipBackgroundType = "singleRight";
	} else {
		throw "Invalid arrow position for multi-tier tooltip";
	}
	
	tooltip.background = chart.tooltipBackground(
		tooltipBackgroundType,
		tooltipBackgroundWidth,
		tooltipBackgroundHeight
	);

	tooltip.unshift(tooltip.background);

	if (arrowPosition == "left") {
		var titleXPosition = tooltip.background.configuration.ARROW_LENGTH
			+ tooltipBackgroundWidth / 2;
	
		var baseYPosition = -(tooltipBackgroundHeight - configuration.PADDING * 2) / 2;

		tooltip.title.move(
			titleXPosition,
			baseYPosition
		);

		var measureTitleXPosition = tooltip.background.configuration.ARROW_LENGTH
			+ configuration.PADDING
			+ configuration.INDICATOR_SIZE
			+ configuration.COLUMN_SPACING;

		var measureValueXPosition = tooltip.background.configuration.ARROW_LENGTH
			+ tooltipBackgroundWidth
			- configuration.PADDING;

		var indicatorXPosition = tooltip.background.configuration.ARROW_LENGTH
			+ configuration.PADDING;
		var yTracker = baseYPosition + titleObjectBBox.height + configuration.LINE_SPACING;

		tooltip.measures.forEach(function(measureItem) {
			var measureItemTitleBBox = measureItem.title.bbox();
			var measureItemValueBBox = measureItem.value.bbox();

			measureItem.title.move(
				measureTitleXPosition,
				yTracker
			);

			measureItem.indicator.move(
				indicatorXPosition,
				yTracker + measureItemTitleBBox.height / 2
			);

			measureItem.value.move(
				measureValueXPosition,
				yTracker
			);

			measureItem.value.attr({
				"text-anchor": "end"
			});

			yTracker += Math.max(
				measureItemTitleBBox.height,
				measureItemValueBBox.height
			) + configuration.LINE_SPACING;
		});
	} else {
		var titleXPosition = -tooltip.background.configuration.ARROW_LENGTH
			- tooltipBackgroundWidth / 2;

		var baseYPosition = -(tooltipBackgroundHeight - configuration.PADDING * 2) / 2;

		tooltip.title.move(
			titleXPosition,
			baseYPosition
		);

		var measureTitleXPosition = -tooltipBackgroundWidth
			- tooltip.background.configuration.ARROW_LENGTH
			+ configuration.PADDING
			+ configuration.INDICATOR_SIZE
			+ configuration.COLUMN_SPACING;

		var measureValueXPosition = -tooltip.background.configuration.ARROW_LENGTH
			- configuration.PADDING;

		var indicatorXPosition = -tooltipBackgroundWidth
			- tooltip.background.configuration.ARROW_LENGTH
			+ configuration.PADDING;
		var yTracker = baseYPosition + titleObjectBBox.height + configuration.LINE_SPACING;

		tooltip.measures.forEach(function(measureItem) {
			var measureItemTitleBBox = measureItem.title.bbox();
			var measureItemValueBBox = measureItem.value.bbox();

			measureItem.title.move(
				measureTitleXPosition,
				yTracker
			);

			measureItem.title.attr({
				"text-anchor": "start"
			});

			measureItem.indicator.move(
				indicatorXPosition,
				yTracker + measureItemTitleBBox.height / 2
			);

			measureItem.value.move(
				measureValueXPosition,
				yTracker
			);

			measureItem.value.attr({
				"text-anchor": "end"
			});

			yTracker += Math.max(
				measureItemTitleBBox.height,
				measureItemValueBBox.height
			) + configuration.LINE_SPACING;
		});
	}

	return tooltip;
}

});
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
	x,
	y,
	mainText,
	arrowPosition,
	icon
) {
	var configuration = {
		PADDING: 7,
		ICON_SPACING: 5
	};

	var tooltip = chart.group().addClass("fm-tooltip");

	tooltip.configuration = configuration;

	tooltip.mainTextObject = chart.text(mainText);
	tooltip.add(tooltip.mainTextObject);
	mainTextObjectBBox = tooltip.mainTextObject.bbox();

	var backgroundWidth = mainTextObjectBBox.width + configuration.PADDING * 2;
	var backgroundHeight = mainTextObjectBBox.height + configuration.PADDING * 2;

	var iconWidth = 0;
	var iconHeight = 0;
	if (icon) {
		var iconBBox = icon.bbox();
		iconWidth = iconBBox.width;
		iconHeight = iconBBox.height;

		backgroundWidth += iconWidth + configuration.ICON_SPACING;
		backgroundHeight = Math.max(iconHeight, mainTextObjectBBox.height) + configuration.PADDING * 2;

		tooltip.add(icon);
	}

	tooltip.background = chart.tooltipBackground(
		x,
		y,
		backgroundWidth,
		backgroundHeight,
		arrowPosition
	);

	tooltip.unshift(tooltip.background);

	var xTracker;
	if (arrowPosition == "left") {
		xTracker = x + tooltip.background.configuration.ARROW_WIDTH + configuration.PADDING;
		if (icon) {
			icon.move(
				xTracker,
				y - iconHeight / 2
			);
			xTracker += iconWidth + configuration.ICON_SPACING;
		}
		tooltip.mainTextObject.move(
			xTracker,
			y - mainTextObjectBBox.height / 2
		);
	} else if (arrowPosition == "right") {
		xTracker = x - tooltip.background.configuration.ARROW_WIDTH - configuration.PADDING;
		if (icon) {
			icon.move(
				xTracker - iconWidth,
				y - iconHeight / 2
			);
			xTracker -= iconWidth + configuration.ICON_SPACING;
		}
		tooltip.mainTextObject.attr({ "text-anchor": "end" });
		tooltip.mainTextObject.move(
			xTracker,
			y - mainTextObjectBBox.height / 2
		);	
	} else if (arrowPosition == "top") {
		console.log("Not yet implemented");
	} else if (arrowPosition == "bottom") {
		console.log("Not yet implemented");	
	}

	return tooltip;
}

});
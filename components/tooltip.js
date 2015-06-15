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
		ICON_SPACING: 9
	};

	var tooltip = chart.group().addClass("fm-tooltip");

	tooltip.configuration = configuration;

	tooltip.mainTextObject = chart.text(mainText);
	tooltip.add(tooltip.mainTextObject);
	var mainTextObjectBBox = tooltip.mainTextObject.bbox();

	var backgroundWidth = mainTextObjectBBox.width + 2 * configuration.PADDING;
	var backgroundHeight = mainTextObjectBBox.height + 2 * configuration.PADDING;

	var iconWidth = 0;
	var iconHeight = 0;
	if (icon) {
		var iconBBox = icon.bbox();
		iconWidth = iconBBox.width;
		iconHeight = iconBBox.height;

		backgroundWidth = mainTextObjectBBox.width + iconWidth + 2 * configuration.ICON_SPACING + configuration.PADDING;
		backgroundHeight = Math.max(iconHeight, mainTextObjectBBox.height) + 2 * configuration.PADDING;

		tooltip.add(icon);
	}

	var backgroundType;
	switch (arrowPosition) {
		case "left": 
			backgroundType = "singleLeft";
			break;
		case "right":
			backgroundType = "singleRight";
			break;
		case "top":
			backgroundType = "singleTop";
			break;
		case "bottom":
			backgroundType = "singleBottom";
			break;
		default: 
			backgroundType = "singleLeft";
			break;
	}

	tooltip.background = chart.tooltipBackground(
		x,
		y,
		backgroundType,
		backgroundWidth,
		backgroundHeight
	);

	tooltip.unshift(tooltip.background);

	var xTracker;
	if (arrowPosition == "left") {
		xTracker = x + tooltip.background.configuration.ARROW_LENGTH;
		if (icon) {
			xTracker += configuration.ICON_SPACING;
			icon.move(
				xTracker,
				y - iconHeight / 2
			);
			xTracker += iconWidth + configuration.ICON_SPACING;
		} else {
			xTracker += configuration.PADDING
		}
		tooltip.mainTextObject.move(
			xTracker,
			y - mainTextObjectBBox.height / 2
		);
	} else if (arrowPosition == "right") {
		xTracker = x - tooltip.background.configuration.ARROW_LENGTH;
		if (icon) {
			xTracker -= configuration.ICON_SPACING;
			icon.move(
				xTracker - iconWidth,
				y - iconHeight / 2
			);
			xTracker -= iconWidth + configuration.ICON_SPACING;
		} else {
			xTracker -= configuration.PADDING;
		}
		tooltip.mainTextObject.attr({ "text-anchor": "end" });
		tooltip.mainTextObject.move(
			xTracker,
			y - mainTextObjectBBox.height / 2
		);	
	} else if (arrowPosition == "top") {
		xTracker = x - configuration.PADDING;
		if (icon) {
			xTracker += configuration.ICON_SPACING;
			icon.move(
				xTracker,
				y - iconHeight / 2
			);
			xTracker += iconWidth + configuration.ICON_SPACING;
		} else {
			xTracker += configuration.PADDING
		}
		tooltip.mainTextObject.attr({ "text-anchor": "middle" });
		tooltip.mainTextObject.move(
			xTracker,
			y + tooltip.background.configuration.ARROW_LENGTH + mainTextObjectBBox.height / 2
		);
	} else if (arrowPosition == "bottom") {
		xTracker = x - configuration.PADDING;
		if (icon) {
			xTracker += configuration.ICON_SPACING;
			icon.move(
				xTracker,
				y - iconHeight / 2
			);
			xTracker += iconWidth + configuration.ICON_SPACING;
		} else {
			xTracker += configuration.PADDING
		}
		tooltip.mainTextObject.attr({ "text-anchor": "middle" });
		tooltip.mainTextObject.move(
			xTracker,
			y - tooltip.background.configuration.ARROW_LENGTH - mainTextObjectBBox.height / 2 - backgroundHeight / 2
		);
	}

	return tooltip;
}

});
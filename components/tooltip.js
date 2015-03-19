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
	arrowPosition
) {

	var configuration = {
		PADDING: 7
	};

	var tooltip = chart.group().addClass("fm-tooltip");

	tooltip.configuration = configuration;

	tooltip.mainTextObject = chart.text(mainText);
	tooltip.add(tooltip.mainTextObject);
	mainTextObjectBBox = tooltip.mainTextObject.bbox();

	tooltip.background = chart.tooltipBackground(
		x,
		y,
		mainTextObjectBBox.height + configuration.PADDING * 2,
		mainTextObjectBBox.width + configuration.PADDING * 2,
		arrowPosition
	);

	tooltip.unshift(tooltip.background);

	if (arrowPosition == "left") {
		tooltip.mainTextObject.move(
			x + tooltip.background.configuration.ARROW_WIDTH + configuration.PADDING,
			y - mainTextObjectBBox.height / 2
		);
	} else {
		tooltip.mainTextObject.attr({ "text-anchor": "end" });
		tooltip.mainTextObject.move(
			x - tooltip.background.configuration.ARROW_WIDTH - configuration.PADDING,
			y - mainTextObjectBBox.height / 2
		);	
	}

	return tooltip;
}

});
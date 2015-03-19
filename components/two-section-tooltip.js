define([
	"svg-js",
	"two-section-tooltip-background"
], function(
	SVG,
	TwoSectionTooltipBackground
) {

return function(
	chart,
	x,
	y,
	mainText,
	secondaryText,
	arrowPosition
) {

	var PADDING = 5;

	var tooltip = chart.group().addClass("fm-tooltip");

	var mainTextObject = chart.text(mainText)
	var secondaryTextObject = chart.text(secondaryText)

	var mainTextObjectBBox = mainTextObject.bbox();
	var secondaryTextObjectBBox = secondaryTextObject.bbox();

	var tooltipBackground = chart.twoSectionTooltipBackground(
		x,
		y,
		Math.max(mainTextObjectBBox.height, secondaryTextObjectBBox.height) + 2 * PADDING,
		mainTextObjectBBox.width + 2 * PADDING,
		secondaryTextObjectBBox.width + 2 * PADDING,
		arrowPosition
	);

	tooltip.add(tooltipBackground);
	tooltip.add(mainTextObject);
	tooltip.add(secondaryTextObject);

	mainTextObject.move(
		x + tooltipBackground.configuration.ARROW_WIDTH + PADDING,
		y - mainTextObjectBBox.height / 2
	);

	var secondaryTextXPosition = 
		x + tooltipBackground.configuration.ARROW_WIDTH
		+ mainTextObjectBBox.width
		+ tooltipBackground.configuration.GAP_SIZE
		+ PADDING * 3;

	secondaryTextObject.move(
		secondaryTextXPosition,
		y - mainTextObjectBBox.height / 2
	);

	return tooltip;
}

});
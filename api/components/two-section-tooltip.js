define([
	"svg-js",
	"tooltip-background",
	"G.unshift"
], function(
	SVG,
	TwoSectionTooltipBackground,
	Unshift
) {

return function(
	chart,
	mainText,
	secondaryText,
	arrowPosition
) {

	var PADDING = 7;
	var GAP_SIZE = 1;

	var tooltip = chart.group().addClass("fm-tooltip");
	
	secondaryText = (secondaryText) ? secondaryText : "";

	tooltip.mainTextObject = chart.text("" + mainText);
	tooltip.secondaryTextObject = chart.text("" + secondaryText);
	tooltip.background = chart.group();
	
	tooltip.add(tooltip.mainTextObject);
	tooltip.add(tooltip.secondaryTextObject);
	tooltip.unshift(tooltip.background);

	var mainTextObjectBBox = tooltip.mainTextObject.bbox();
	var secondaryTextObjectBBox = tooltip.secondaryTextObject.bbox();
	var maxTextHeight = Math.max(mainTextObjectBBox.height, secondaryTextObjectBBox.height);
	var height = maxTextHeight + 2 * PADDING;
	var largeSectionWidth = mainTextObjectBBox.width + 2 * PADDING;
	var smallSectionWidth = secondaryTextObjectBBox.width + 2 * PADDING;
	
	var xTracker = 0;
	var yPosition;
	
	if (arrowPosition == "left") {
		setUpTooltipWithArrowOnLeft();
	} else if (arrowPosition == "right") {
		setUpTooltipWithArrowOnRight();
	} else if (arrowPosition == "topLeft") {
		setUpTooltipWithArrowOnTopLeft();
	} else if (arrowPosition == "bottomLeft") {
		setUpTooltipWithArrowOnBottomLeft();
	} else if (arrowPosition == "bottomRight") {
		setUpTooltipWithArrowOnBottomRight();
	} else if (arrowPosition == "topRight") {
		setUpTooltipWithArrowOnTopRight();
	}

	function setUpTooltipWithArrowOnLeft() {
		tooltip.background.leftSection = chart.tooltipBackground(
			"leftSectionWithLeftArrow",
			largeSectionWidth, 
			height
		);
		tooltip.background.rightSection = chart.tooltipBackground(
			"rightSection",
			smallSectionWidth,
			height
		)
			.move(
				-(smallSectionWidth + largeSectionWidth + tooltip.background.leftSection.configuration.ARROW_LENGTH + GAP_SIZE),
				-height / 2
			);
		
		tooltip.background.add(tooltip.background.leftSection);
		tooltip.background.add(tooltip.background.rightSection);
		
		xTracker = xTracker
			+ tooltip.background.leftSection.configuration.ARROW_LENGTH
			+ PADDING;
		
		tooltip.mainTextObject.move(
			xTracker,
			-mainTextObjectBBox.height / 2
		);
		
		xTracker = xTracker
			+ PADDING * 2
			+ GAP_SIZE
			+ mainTextObjectBBox.width;
		
		tooltip.secondaryTextObject.move(
			xTracker,
			-mainTextObjectBBox.height / 2
		);
	}
	
	function setUpTooltipWithArrowOnRight() {
		tooltip.background.leftSection = chart.tooltipBackground(
			"leftSection",
			largeSectionWidth, 
			height
		);
		tooltip.background.rightSection = chart.tooltipBackground(
			"rightSectionWithRightArrow",
			smallSectionWidth,
			height
		);
		
		tooltip.background.leftSection.move(
			-tooltip.background.leftSection.configuration.ARROW_LENGTH - smallSectionWidth - largeSectionWidth - GAP_SIZE,
			-height / 2
		);
		
		tooltip.background.add(tooltip.background.leftSection);
		tooltip.background.add(tooltip.background.rightSection);
		
		xTracker = xTracker
			- tooltip.background.rightSection.configuration.ARROW_LENGTH
			- PADDING;

		tooltip.secondaryTextObject.attr({ "text-anchor": "end" });
		tooltip.secondaryTextObject.move(
			xTracker,
			-secondaryTextObjectBBox.height / 2
		);

		xTracker = xTracker
			- PADDING * 2
			- GAP_SIZE
			- secondaryTextObjectBBox.width;
			
		tooltip.mainTextObject.attr({ "text-anchor": "end" });
		tooltip.mainTextObject.move(
			xTracker,
			-mainTextObjectBBox.height / 2
		);
	}
	
	function setUpTooltipWithArrowOnTopLeft() {
		tooltip.background.leftSection = chart.tooltipBackground(
			"leftSectionWithTopArrow",
			largeSectionWidth, 
			height
		);
		tooltip.background.rightSection = chart.tooltipBackground(
			"rightSection",
			smallSectionWidth,
			height
		)
			.move(
				-(largeSectionWidth / 2 + GAP_SIZE + smallSectionWidth),
				tooltip.background.leftSection.configuration.ARROW_LENGTH
			);
		
		tooltip.background.add(tooltip.background.leftSection);
		tooltip.background.add(tooltip.background.rightSection);
		
		yPosition = -Math.max(mainTextObjectBBox.height, secondaryTextObjectBBox.height) / 2 + tooltip.background.leftSection.configuration.ARROW_LENGTH + height / 2;
		tooltip.mainTextObject.attr({ "text-anchor": "middle" });
		tooltip.mainTextObject.move(
			xTracker,
			yPosition
		);
		
		xTracker = xTracker
			+ largeSectionWidth / 2
			+ GAP_SIZE
			+ PADDING;
		
		tooltip.secondaryTextObject.move(
			xTracker,
			yPosition
		);
	}
	
	function setUpTooltipWithArrowOnBottomLeft() {
		tooltip.background.leftSection = chart.tooltipBackground(
			"leftSectionWithBottomArrow",
			largeSectionWidth, 
			height
		);

		tooltip.background.rightSection = chart.tooltipBackground(
			"rightSection",
			smallSectionWidth,
			height
		)
			.move(
				-(largeSectionWidth / 2 + GAP_SIZE + smallSectionWidth),
				-height - tooltip.background.leftSection.configuration.ARROW_LENGTH
			);
		
		tooltip.background.add(tooltip.background.leftSection);
		tooltip.background.add(tooltip.background.rightSection);
		
		yPosition = -Math.max(mainTextObjectBBox.height, secondaryTextObjectBBox.height) / 2 - tooltip.background.leftSection.configuration.ARROW_LENGTH - height / 2;
		tooltip.mainTextObject.attr({ "text-anchor": "middle" });
		tooltip.mainTextObject.move(
			xTracker,
			yPosition
		);
		
		xTracker = xTracker
			+ largeSectionWidth / 2
			+ secondaryTextObjectBBox.width
			+ PADDING
			+ GAP_SIZE;
			
		tooltip.secondaryTextObject.attr({ "text-anchor": "end" });
		tooltip.secondaryTextObject.move(
			xTracker,
			yPosition
		);
	}
	
	function setUpTooltipWithArrowOnBottomRight() {
		tooltip.background.leftSection = chart.tooltipBackground(
			"leftSection",
			largeSectionWidth, 
			height
		)
			.move(
				-smallSectionWidth / 2 - GAP_SIZE - largeSectionWidth,
				0
			);
		tooltip.background.leftSection.translate(0, -tooltip.background.leftSection.configuration.ARROW_LENGTH - height);
		tooltip.background.rightSection = chart.tooltipBackground(
			"rightSectionWithBottomArrow",
			smallSectionWidth,
			height
		);
		
		tooltip.background.add(tooltip.background.leftSection);
		tooltip.background.add(tooltip.background.rightSection);
		
		yPosition = -Math.max(mainTextObjectBBox.height, secondaryTextObjectBBox.height) / 2 - tooltip.background.leftSection.configuration.ARROW_LENGTH - height / 2;
		tooltip.secondaryTextObject.attr({ "text-anchor": "middle" });
		tooltip.secondaryTextObject.move(
			xTracker,
			yPosition
		);
		
		xTracker = xTracker
			- smallSectionWidth / 2
			- GAP_SIZE
			- mainTextObjectBBox.width
			- PADDING;
		tooltip.mainTextObject.move(
			xTracker,
			yPosition
		);
		
	}
	
	function setUpTooltipWithArrowOnTopRight() {
		tooltip.background.leftSection = chart.tooltipBackground(
			"leftSection",
			largeSectionWidth, 
			height
		)
			.move(
				-smallSectionWidth / 2 - GAP_SIZE - largeSectionWidth,
				0
			);
		tooltip.background.leftSection.translate(0, tooltip.background.leftSection.configuration.ARROW_LENGTH);
		tooltip.background.rightSection = chart.tooltipBackground(
			"rightSectionWithTopArrow",
			smallSectionWidth,
			height
		);
		
		tooltip.background.add(tooltip.background.leftSection);
		tooltip.background.add(tooltip.background.rightSection);
		
		yPosition = -Math.max(mainTextObjectBBox.height, secondaryTextObjectBBox.height) / 2 + tooltip.background.leftSection.configuration.ARROW_LENGTH + height / 2;
		tooltip.secondaryTextObject.attr({ "text-anchor": "middle" });
		tooltip.secondaryTextObject.move(
			xTracker,
			yPosition
		);
		
		xTracker = xTracker
			- smallSectionWidth / 2
			- GAP_SIZE
			- mainTextObjectBBox.width
			- PADDING;
		tooltip.mainTextObject.move(
			xTracker,
			yPosition
		);
	}
	
	tooltip.unshift(tooltip.background);

	return tooltip;
}

});
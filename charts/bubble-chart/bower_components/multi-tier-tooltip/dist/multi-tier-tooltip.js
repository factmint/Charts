define(['tooltip', 'multitext'],
function(Tooltip) {

	var TOOLTIP_OFFSET_X = 10;
	var TOOLTIP_OFFSET_Y = 20;
	var TOOLTIP_PADDING_TOP = 7;
	var TOOLTIP_PADDING_BOTTOM = 10;
	var TOOLTIP_PADDING_LEFT = 10;
	var TOOLTIP_PADDING_RIGHT = 10;
	var TOOLTIP_BORDER_RADIUS = 4;

	var GROUP_SPACING = 10;
	var TOOLTIP_LINE_HEIGHT = 1.4;

	var TEXT_SIZE_SMALL = "12px";
	var FONT_FAMILY = "'Lato', sans-serif";

	function MultiTierTooltip(paper, tooltipClass, colorClass) {

		Tooltip.call(this, paper, tooltipClass, colorClass);

	}

	MultiTierTooltip.prototype = Object.create(Tooltip.prototype);

	MultiTierTooltip.prototype.render = function(title, details, extraDetails) {

		var paper = this._paper;
		var tmpBBox = null;

		if (this.snapElement !== null) {
			this.remove();
		}
		this.snapElement = paper.g();

		// Render the text
		var tooltipText;
		var tooltipText = paper.g();

		var titleText = paper.text(TOOLTIP_PADDING_LEFT, TOOLTIP_PADDING_TOP, title)
		titleText.attr({
			"dy": parseInt(TEXT_SIZE_SMALL, 10),
		});
		tooltipText.append(titleText);

		var detailTitles = [];
		var detailValues = [];
		details.forEach(function(detail) {
			detailTitles.push(detail.title + ':');
			detailValues.push(detail.value);
		});

		var detailTitlesElement = paper.multitext(
			TOOLTIP_PADDING_LEFT,
			titleText.getBBox().y + titleText.getBBox().height,
			detailTitles.join('\n'),
			TOOLTIP_LINE_HEIGHT + 'em'
		);
		detailTitlesElement.transform('t0 ' + (detailTitlesElement.getBBox().height));

		var detailValuesElement = paper.multitext(
			TOOLTIP_PADDING_LEFT,
			titleText.getBBox().y + titleText.getBBox().height,
			detailValues.join('\n'),
			TOOLTIP_LINE_HEIGHT + 'em',
			'end'
		);

		var extraDetailTitles = [];
		var extraDetailValues = [];
		extraDetails.forEach(function(detail) {
			extraDetailTitles.push(detail.title + ':');
			extraDetailValues.push(detail.value);
		});

		var extraDetailTitlesElement = paper.multitext(
			TOOLTIP_PADDING_LEFT,
			detailTitlesElement.getBBox().y + GROUP_SPACING * 2 + parseInt(TEXT_SIZE_SMALL, 10) * 2,
			extraDetailTitles.join('\n'),
			TOOLTIP_LINE_HEIGHT + 'em'
		);

		var extraDetailValuesElement = paper.multitext(
			TOOLTIP_PADDING_LEFT,
			detailTitlesElement.getBBox().y + GROUP_SPACING * 2 + parseInt(TEXT_SIZE_SMALL, 10) * 2,
			extraDetailValues.join('\n'),
			TOOLTIP_LINE_HEIGHT + 'em',
			'end'
		);

		var detailTitlesElementBBox = detailTitlesElement.getBBox();
		var extraDetailTitlesElementBBox = extraDetailTitlesElement.getBBox();

		var largestTitlesElementWidth;
		if (detailTitlesElementBBox.width > extraDetailTitlesElementBBox.width) {
			largestTitlesElementWidth = detailTitlesElementBBox.width;
		} else {
			largestTitlesElementWidth = extraDetailTitlesElementBBox.width;
		}

		var detailValuesElementBBox = detailValuesElement.getBBox();
		var extraDetailValuesElementBBox = extraDetailValuesElement.getBBox();

		var largestValuesElementWidth;
		if (detailValuesElementBBox.width > extraDetailValuesElementBBox.width) {
			largestValuesElementWidth = detailValuesElementBBox.width;
		} else {
			largestValuesElementWidth = extraDetailValuesElementBBox.width;
		}

		detailValuesElement.transform('t ' + (largestTitlesElementWidth + largestValuesElementWidth) + ' ' + (detailValuesElement.getBBox().height));
		extraDetailValuesElement.transform('t ' + (largestTitlesElementWidth + largestValuesElementWidth) + ' 0');
		
		tooltipText.append(detailTitlesElement);
		tooltipText.append(detailValuesElement);
		tooltipText.append(extraDetailTitlesElement);
		tooltipText.append(extraDetailValuesElement);

		tooltipText.attr({
			"fill": "#fff",
			"font-family": FONT_FAMILY,
			"font-size": TEXT_SIZE_SMALL
		});

		this._tooltipText = tooltipText;

		// Render the background
		tmpBBox = tooltipText.getBBox();
		var tooltipBG = paper.rect(
			0,
			0,
			tmpBBox.width + TOOLTIP_PADDING_RIGHT + TOOLTIP_PADDING_LEFT,
			tmpBBox.height + TOOLTIP_PADDING_TOP + TOOLTIP_PADDING_BOTTOM,
			TOOLTIP_BORDER_RADIUS
		);
		tooltipBG.addClass(this.colorClass);
		this._tooltipBG = tooltipBG;

		var tooltipBGBBox = tooltipBG.getBBox();
		this.groupBoundary = detailTitlesElement.getBBox().y + GROUP_SPACING + parseInt(TEXT_SIZE_SMALL, 10);

		var separator = paper.line(
			0,
			this.groupBoundary,
			tooltipBGBBox.width,
			this.groupBoundary
		)
			.attr({
				stroke: 'white'
			});

		var tooltipBGOverlay = paper.rect(
			tooltipBGBBox.x,
			tooltipBGBBox.y,
			tooltipBGBBox.width,
			tooltipBGBBox.height,
			TOOLTIP_BORDER_RADIUS
		);
		var tooltipBGMask = paper.rect(
			tooltipBGBBox.x,
			this.groupBoundary,
			tooltipBGBBox.width,
			tooltipBGBBox.height - this.groupBoundary
		)
			.attr('fill', 'white');
		tooltipBGOverlay.attr('mask', tooltipBGMask);
		tooltipBGOverlay.addClass(this.colorClass + ' tint-1');

		titleText.transform('t ' + (tmpBBox.width / 2 - titleText.getBBox().width / 2) + ' 0');

		// Render the arrow
		var tooltipArrow = paper.polygon([-3.5, 0.2, 6.5, -5, 6.5, 5]);
		var tooltipArrowMask = paper.rect(-6, -6, 11, 12).attr("fill", "#fff");
		tooltipArrow.attr({
			"mask": tooltipArrowMask
		})
			.addClass(this.colorClass);
		this._tooltipArrow = tooltipArrow;
		this._positionTooltipArrow(this._tooltipPlacement);

		// Add to the group
		this.snapElement.append(tooltipBG);
		this.snapElement.append(tooltipBGOverlay);
		this.snapElement.append(tooltipText);
		this.snapElement.append(tooltipArrow);
		this.snapElement.append(separator);

		this.snapElement.addClass('fm-tooltip');

		this.hide();

		return this.snapElement;
	};

  	/**
	 * Sets the position for the tooltip to go
	 * @param {Number} x								
	 * @param {Number} y								
	 * @param {String} tooltipPlacement The position for the tooltip to go
	 */
	MultiTierTooltip.prototype.setPosition = function(x, y, tooltipPlacement) {

		if (! this.snapElement) {
			return;
		}

		if( tooltipPlacement === undefined ){
			tooltipPlacement = this._tooltipPlacement;
		} else if(tooltipPlacement !== this._tooltipPlacement) {
			this._positionTooltipArrow(tooltipPlacement);
		}

		var tooltipArrowBBox = this._tooltipArrow.getBBox();
		var tooltipBGBBox = this._tooltipBG.getBBox();

		switch(tooltipPlacement) {
			case "left":
				x = x - tooltipArrowBBox.width - tooltipBGBBox.width;
				y = y - (this.groupBoundary / 2) - 2;
				break;

			case "right":
				x = x + tooltipArrowBBox.width;
				y = y - (this.groupBoundary / 2) - 2;
				break;

			case "top":
				x = x - tooltipArrowBBox.width - tooltipBGBBox.width;
				y = y - tooltipArrowBBox.height;
				break;

			case "bottom":
				x = x + tooltipArrowBBox.width;
				y = y + tooltipArrowBBox.height;
				break;
				
			case "none":
				x = x;
				y = y;
				break;
		}

		this.snapElement.transform("T" + x + "," + y);

	};
    
	MultiTierTooltip.prototype._positionTooltipArrow = function(tooltipPlacement) {

		var transformMatrix = Snap.matrix();
		var tooltipBGBBox = this._tooltipBG.getBBox();

		switch(tooltipPlacement){

			case "left":
				transformMatrix.translate(tooltipBGBBox.width + 4, this.groupBoundary / 2 + 3);
				transformMatrix.rotate(180);
				this._tooltipArrow.transform( transformMatrix.toTransformString() );
				break;

			case "right":
				transformMatrix.translate(-4, this.groupBoundary / 2 + 3);
				this._tooltipArrow.transform( transformMatrix.toTransformString() );
				break;

			case "top":
				transformMatrix.translate(tooltipBGBBox.width / 2, tooltipBGBBox.height + 4);
				transformMatrix.rotate(-90);
				this._tooltipArrow.transform(transformMatrix.toTransformString());
				break;

			case "bottom":
				transformMatrix.translate(tooltipBGBBox.width / 2, -4);
				transformMatrix.rotate(90);
				this._tooltipArrow.transform(transformMatrix.toTransformString());
				break;
				
			case "none":
				this._tooltipArrow.remove();
				break;


		}

		this._tooltipPlacement = tooltipPlacement;

	};

	return MultiTierTooltip;

});
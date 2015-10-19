define(['config', 'multitext'],
function(Config,   multitext) {

	var PADDING_TOP = 10;
	var PADDING_BOTTOM = 10;
	var PADDING_LEFT = 10;
	var PADDING_RIGHT = 10;
	var TITLE_MARGIN_BOTTOM = 5;
	var DETAIL_MARGIN_LEFT = 5;
	var BORDER_RADIUS = 4;

	var TEXT_SIZE_SMALL = "12px";
	var FONT_FAMILY = "'Lato', sans-serif";

	var MAX_VALUE_LENGTH;
	if (Config.TOOLTIP_MAX_VALUE_LENGTH) {
		MAX_VALUE_LENGTH = Config.TOOLTIP_MAX_VALUE_LENGTH;
	} else {
		MAX_VALUE_LENGTH: 20;
	}

	function Tooltip(paper, tooltipClass, colorClass, enableBlackBorder, colorOverride) {
		
		this.enableBlackBorder = enableBlackBorder;
		if (enableBlackBorder && ! document.getElementById('black-border')) {
			paper.node.querySelector('defs').innerHTML += 
						'<filter id="black-border" x="-5%" y="-5%" width="110%" height="110%">'
					+		'<feMorphology in="SourceAlpha" operator="dilate" radius="1" result="border"></feMorphology>'
					+		'<feGaussianBlur stdDeviation="0.2" in="border" result="blurred-border"></feGaussianBlur>'
					+		'<feMerge>'
  					+			'<feMergeNode in="blurred-border">'
  					+			'</feMergeNode>'
  					+			'<feMergeNode in="SourceGraphic">'
  					+			'</feMergeNode>'
					+		'</feMerge>'
					+	'</filter>';
		}


		this.tooltipClass = tooltipClass;
		this.colorClass = colorClass;
		this.colorOverride = colorOverride;
		this._paper = paper;
		this._parent = paper.node;
		this._tooltipArrow = null;
		this._tooltipBG = null;
		this._tooltipPlacement = "right";
		this._tooltipText = null;

		this.snapElement = null;

	}

	Tooltip.prototype = {

		/**
		 * Repositions the arrow based on the tooltipPlacement
		 * @private
		 * @param {String} tooltipPlacement Can be left, right, top or bottom
		 */
		"_positionTooltipArrow": function(tooltipPlacement) {

			var transformMatrix = Snap.matrix();
			var tooltipBGBBox = this._tooltipBG.getBBox();

			switch (tooltipPlacement) {

				case "left":
					transformMatrix.translate(tooltipBGBBox.width + 4, tooltipBGBBox.height / 2);
					transformMatrix.rotate(180);
					this._tooltipArrow.transform( transformMatrix.toTransformString() );
					break;

				case "right":
					transformMatrix.translate(-4, tooltipBGBBox.height / 2);
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

			}

			this._tooltipPlacement = tooltipPlacement;

		},

		/**
		 * @constructor
		 */
		"constructor": Tooltip,

		/**
		 * Hides the tooltip
		 */
		"hide": function() {
			if (!this.snapElement) {
				return;
			}
			this.snapElement.attr("display", "none");
		},

		/**
		 * Removes the tooltip from the dom
		 */
		"remove": function() {
			this._tooltipArrow = null;
			this._tooltipBG = null;
			this._tooltipText = null;
			this.snapElement.remove();
			this.snapElement = null;
		},

		/**
		 * Renders the tooltip
		 * @param {String/Number} name	
		 * @param {String/Number} value
		 */
		"render": function(title, details) {

			var paper = this._paper;
			var tmpBBox = null;

			if (this.snapElement !== null) {
				this.remove();
			}
			this.snapElement = paper.g();

			// Render the text
			var tooltipText;
			var isMultiLineLabel = (Object.prototype.toString.call(details) === '[object Array]') ? true : false;
			if (title.length > MAX_VALUE_LENGTH) {
				title = title.substring(0, MAX_VALUE_LENGTH - 3) + '...';
			}
			if (! isMultiLineLabel) {
				var tooltipText = paper.text(
					PADDING_LEFT,
					PADDING_TOP,
					title + ": " + details
				);
				tooltipText.attr({
					"dy": parseInt(TEXT_SIZE_SMALL, 10)
				});
			} else {
				var tooltipText = paper.g();
				tooltipText.attr({
					"fill": "#fff"
				});

				var titleText = paper.text(PADDING_LEFT, PADDING_TOP, title)
				titleText.attr({
					"dy": parseInt(TEXT_SIZE_SMALL, 10),
					"font-family": FONT_FAMILY,
					"font-size": TEXT_SIZE_SMALL
				});
				tooltipText.append(titleText);

				var detailTitles = [];
				var detailValues = [];
				details.forEach(function(detail) {
					var detailTitle;
					var detailValue;
					
					if (detail.title.length > MAX_VALUE_LENGTH) {
						detailTitle = detail.title.substring(0, MAX_VALUE_LENGTH - 3) + '...';
					} else {
						detailTitle = detail.title;
					}
					if (detail.value.length > MAX_VALUE_LENGTH) {
						detailValue = detail.value.substring(0, MAX_VALUE_LENGTH - 3) + '...';
					} else {
						detailValue = detail.value;
					}

					detailTitles.push(detailTitle + ':');
					detailValues.push(detailValue);
				});

				var detailTitlesElement = paper.multitext(
					PADDING_LEFT,
					PADDING_TOP * 2 + titleText.getBBox().height + TITLE_MARGIN_BOTTOM,
					detailTitles.join('\n'),
					'1.2em'
				).attr({
					"font-family": FONT_FAMILY,
					"font-size": TEXT_SIZE_SMALL
				});

				var detailValuesElement = paper.multitext(
					PADDING_LEFT,
					PADDING_TOP * 2 + titleText.getBBox().height + TITLE_MARGIN_BOTTOM,
					detailValues.join('\n'),
					'1.2em',
					'end'
				).attr({
					"font-family": FONT_FAMILY,
					"font-size": TEXT_SIZE_SMALL
				});

				detailValuesElement.transform('t ' + (detailTitlesElement.getBBox().width + detailValuesElement.getBBox().width + DETAIL_MARGIN_LEFT) + ' 0');
				
				tooltipText.append(detailTitlesElement);
				tooltipText.append(detailValuesElement);

			}

			this._tooltipText = tooltipText;

			this.snapElement.append(tooltipText);
			this.snapElement.addClass('fm-tooltip ' + this.tooltipClass);

			// Render the background
			tmpBBox = tooltipText.getBBox();
			var tooltipBG = paper.rect(
				0,
				0,
				tmpBBox.width + PADDING_RIGHT + PADDING_LEFT,
				tmpBBox.height + PADDING_TOP + PADDING_BOTTOM,
				BORDER_RADIUS
			);
			tooltipBG.addClass(this.colorClass);
			if (this.colorOverride) {
				tooltipBG.attr({fill: this.colorOverride});
			}
			this._tooltipBG = tooltipBG;

			if (isMultiLineLabel) {
				titleText.transform('t ' + (tmpBBox.width / 2 - titleText.getBBox().width / 2) + ' 0');
			}

			// Render the arrow
			var tooltipArrow = paper.polygon([-5,0.2,5,-5,5,5])
				.addClass(this.colorClass);

			if (this.colorOverride) {
				tooltipArrow.attr({fill: this.colorOverride});
			}
			this._tooltipArrow = tooltipArrow;
			this._positionTooltipArrow(this._tooltipPlacement); // Always try default position (useful for mouse move)

			// Add to the group
			this.snapElement.prepend(tooltipBG);
			this.snapElement.append(tooltipArrow);

			this.hide();
			
			if (this.enableBlackBorder) {
				this.snapElement.attr({
					filter: 'url(#black-border)'
				});
			}

			return this.snapElement;
		},

		/**
		 * Sets the position for the tooltip to go
		 * @param {Number} x								
		 * @param {Number} y								
		 * @param {String} tooltipPlacement The position for the tooltip to go
		 */
		"setPosition": function(x, y, tooltipPlacement) {

			if (!this.snapElement) {
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
					y = y - tooltipBGBBox.height / 2;
					break;

				case "right":
					x = x + tooltipArrowBBox.width;
					y = y - tooltipBGBBox.height / 2;
					break;
				
				case "bottom":
					x = x - tooltipBGBBox.width / 2;
					y = y + tooltipArrowBBox.height;
					break;

				case "top":
					x = x - tooltipBGBBox.width / 2;
					y = y - tooltipBGBBox.height - tooltipArrowBBox.height;
					break;

			}

			this.snapElement.transform("T" + x + "," + y);

		},

		/**
		 * Show the tooltip
		 */
		"show": function() {
			if (!this.snapElement) {
				return;
			}
			this.snapElement.parent().append(this.snapElement);
			this.snapElement.attr("display", "block");
		}

	};

	return Tooltip;

});

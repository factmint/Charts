define(['config', 'key', 'number-utils'],
	function(Config, Key, NumberUtils) {

		function BubbleKey(paper, x, y, width, columnWidth, values, maxValues, maxValueLength, scaleSettings) {

			Key.call(this, paper, x, y, width, 1, columnWidth, false, values, maxValues, maxValueLength);

			this._scaleSettings = scaleSettings;

			this.state = {
				"fixed": {
					"bubble": null,
					"scale": null
				},
				"hover": {
					"bubble": null,
					"scale": null
				}
			};

		}
		
		function verticallyCenterKeyItems(node) {
			var keyItemGroup = node.select('.fm-key-items');
			
			var keyItemsOffsetY = node.getBBox().cy - keyItemGroup.getBBox().cy;

			keyItemGroup.transform('t' + Config.KEY_SIDE_PADDING + ',' + keyItemsOffsetY);
		}

		BubbleKey.prototype = Object.create(Key.prototype);

		/**
		 * Creates ands places the bubble on the scale
		 * @private
		 * @param	{Object} state					 The state in which to store the
		 *																	information. This might can be the hover
		 *																	or fixed state.
		 * @param	{Snap.Element} bubble					
		 * @param	{Number} maxCircleRadius 
		 */
		BubbleKey.prototype._createScaleCircle = function( state, bubble, maxCircleRadius ){

			var paper = this._paper;
			var circle = bubble.clone();
			var circleText = null;
			var circleRadius = null;
			var circleYOffset = 0;

			state.scale = paper.g();

			circleRadius = circle.attr("r");
			circleYOffset = maxCircleRadius - circleRadius;

			circle.attr({
				"cx": 0,
				"cy": maxCircleRadius + circleYOffset
			});
			circle.addClass("fm-scatter-bubble-active");
			state.scale.append( circle );

			circleText = paper.text(0, maxCircleRadius + circleYOffset + parseInt(Config.TEXT_SIZE_MEDIUM, 10) / 2, bubble.data("area value")).attr({
				"fill": "#fff",
				"font-family": Config.FONT_FAMILY,
				"font-size": Config.TEXT_SIZE_MEDIUM,
				"text-anchor": "middle"
			});
			state.scale.append(circleText);

			this.node.select(".fm-key-scale-bubblegroup").append( state.scale );

		};

		/**
		 * Hides the text labels on the bubble scale group
		 * @private
		 */
		BubbleKey.prototype._hideScaleLabels = function() {
			this.node.selectAll(".fm-key-scale-maxbubble text, .fm-key-scale-midbubble text, .fm-key-scale-minbubble text").forEach(function _hideScaleLabels(text) {
				text.attr("display", "none");
			});
		};

		/**
		 * Shoes the text labels on the bubble scale group
		 * @private
		 */
		BubbleKey.prototype._showScaleLabels = function() {
			this.node.selectAll(".fm-key-scale-maxbubble text, .fm-key-scale-midbubble text, .fm-key-scale-minbubble text").forEach(function _hideScaleLabels(text) {
				text.attr("display", "block");
			});
		};

		/**
		 * @constructor
		 */
		BubbleKey.prototype.constructor = BubbleKey;

		/**
		 * Renders the key and the bubble scale group
		 */
		BubbleKey.prototype.render = function() {

			Key.prototype.render.apply(this);

			var paper = this._paper;
			var offsetY = 0;
			var maxCircleRadius = 0;
			var midCircleRadius = 0;
			var minCircleRadius = 0;
			var styleEmptyCircle = {
				"fill": "none",
				"stroke": "#8D8E8D",
				"stroke-dasharray": "4,4"
			};
			var styleEmptyText = {
				"fill": "#8D8E8D",
				"font-family": Config.FONT_FAMILY,
				"font-size": Config.TEXT_SIZE_SMALL,
				"text-anchor": "middle"
			};
			var circleTextMidY = parseInt(Config.TEXT_SIZE_SMALL, 10) / 2;
			var scaleSettings = this._scaleSettings;

			var bubbleScaleGroup = paper.g().attr("class", "fm-key-scale");

			// Render the title
			var bubbleScaleTitle = paper.text(0, 0, scaleSettings.title).attr({
				"font-family": Config.FONT_FAMILY,
				"font-size": Config.TEXT_SIZE_SMALL,
				"text-anchor": "middle"
			});

			var bubbleScaleGroupBubbles = paper.g().attr("class", "fm-key-scale-bubblegroup");
			bubbleScaleGroupBubbles.transform("t0," + bubbleScaleTitle.getBBox().height);

			// Render the bubble scales
			maxCircleRadius = scaleSettings.scale.end;
			midCircleRadius = scaleSettings.scale.middle;
			minCircleRadius = scaleSettings.scale.start;


			// Maximum
			var maxBubble = paper.g().attr("class", "fm-key-scale-maxbubble");
			maxBubble.append(paper.text(0, offsetY + (maxCircleRadius - midCircleRadius) + circleTextMidY, NumberUtils.renderValue(scaleSettings.maxValue)).attr(styleEmptyText));
			offsetY += maxCircleRadius;
			maxBubble.append(paper.circle(0, offsetY, maxCircleRadius).attr(styleEmptyCircle));


			// Middle
			var middleBubble = paper.g().attr("class", "fm-key-scale-midbubble");
			var midValue = scaleSettings.scale.midValue;
			midValue = parseFloat( midValue.toFixed(12) );
			offsetY += (maxCircleRadius - midCircleRadius);
			middleBubble.append(paper.text(0, offsetY - midCircleRadius + (midCircleRadius - minCircleRadius) + circleTextMidY, NumberUtils.renderValue(midValue)).attr(styleEmptyText));
			middleBubble.append(paper.circle(0, offsetY, midCircleRadius).attr(styleEmptyCircle));


			// Minimum
			offsetY += (midCircleRadius - minCircleRadius);
			var minBubble = paper.g().attr("class", "fm-key-scale-minbubble");
			minBubble.append(paper.text(0, offsetY - minCircleRadius + circleTextMidY + minCircleRadius, NumberUtils.renderValue(scaleSettings.minValue)).attr(styleEmptyText));
			minBubble.append(paper.circle(0, offsetY, minCircleRadius).attr(styleEmptyCircle));

			// Appendage
			bubbleScaleGroupBubbles.append(maxBubble);
			bubbleScaleGroupBubbles.append(middleBubble);
			bubbleScaleGroupBubbles.append(minBubble);

			bubbleScaleGroup.append(bubbleScaleTitle);
			bubbleScaleGroup.append(bubbleScaleGroupBubbles);

			var keyGroup = this.node.select(".fm-key");
			var keyGroupBBox = keyGroup.getBBox();
			var bubbleKeyBBox = bubbleScaleGroup.getBBox();

			this.setHeight(Math.max(keyGroupBBox.height, bubbleKeyBBox.height + Config.KEY_PADDING_TOP + Config.KEY_PADDING_BOTTOM));

			var scaleOffsetY = (this.node.getBBox().height - bubbleKeyBBox.height + Config.KEY_PADDING_TOP) / 2;
			keyGroup.append(bubbleScaleGroup);

			bubbleScaleGroup.transform(
				"t" + (this.width - bubbleKeyBBox.width / 2 - Config.KEY_SIDE_PADDING) +
				"," + (keyGroupBBox.y + scaleOffsetY)
			);

			verticallyCenterKeyItems(this.node);
		};

		/**
		 * Sets the fixed bubble on the scale
		 * @param {Snap.Element} bubble
		 */
		BubbleKey.prototype.setScaleFixed = function(bubble) {

			if (bubble === null) {
				this.state.fixed.scale.remove();
				this.state.fixed.scale = null;
				this.state.fixed.bubble.removeClass("fm-scatter-bubble-active");
				this.state.fixed.bubble = null;
				return;
			}

			var maxCircleRadius = this._scaleSettings.scale.end;

			this._hideScaleLabels();

			this._createScaleCircle( this.state.fixed, bubble, maxCircleRadius );
			this.state.fixed.bubble = bubble;
			bubble.addClass("fm-scatter-bubble-active");

			if( this.state.hover.bubble === bubble ){
				this.setScaleHover( null );
			}

		};

		/**
		 * Sets the hover bubble on the scale
		 * @param {Snap.Element} bubble
		 */
		BubbleKey.prototype.setScaleHover = function(bubble) {

			if (bubble === null) {
				if (this.state.hover.scale !== null) {
					this.state.hover.scale.remove();
					this.state.hover.scale = null;
					this.state.hover.bubble = null;
					if (this.state.fixed.scale === null) {
						this._showScaleLabels();
					}
				}
				return;
			}

			if( this.state.hover.scale !== null ){
				this.setScaleHover(null);
			}

			var maxCircleRadius = this._scaleSettings.scale.end;

			this._hideScaleLabels();

			this._createScaleCircle( this.state.hover, bubble, maxCircleRadius );
			this.state.hover.bubble = bubble;

			if (this.state.fixed.scale !== null) {
				this.state.hover.scale.select("circle").attr("fill-opacity", "0");
				this.state.hover.scale.select("text").remove();
				this.state.hover.scale.insertBefore(this.state.fixed.scale);
			}

		};

		return BubbleKey;

	});
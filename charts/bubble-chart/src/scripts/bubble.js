define([
		'snap',
		'config',
		'scale-utils',
		'color-utils',
		'axis',
		'grid-lines',
		'bubble-point',
		'bubble-key',
		'multi-tier-tooltip'
	],
	function(
		Snap,
		Config,
		ScaleUtils,
		Color,
		axis,
		gridLines,
		bubblePoint,
		BubbleKey,
		MultiLineTooltip
	) {

	    function appendValuePrefixAndSuffix(value, prefix, suffix) {
	        var sign = (value < 0) ? '-' : '';
	        return sign + prefix + Math.abs(value) + suffix;
	    }

		return Snap.plugin(function(Snap, Element, Paper) {

			/**
			 * Bubble chart plugin
			 * @param {Number} startX
			 * @param {Number} startY
			 * @param {Number} width
			 * @param {Number} height
			 * @param {Object} dataSet
			 * @param {Object} options
			 */
			Paper.prototype.chart = function(startX, startY, width, height, dataSet, options) {

		        if (! options.xPrefix) options.xPrefix = '';
		        if (! options.xSuffix) options.xSuffix = '';

		        if (! options.yPrefix) options.yPrefix = '';
		        if (! options.ySuffix) options.ySuffix = '';

		        if (! options.sizePrefix) options.sizePrefix = '';
		        if (! options.sizeSuffix) options.sizeSuffix = '';
		        
				var paper = this;
				// Keys
				var keys = Object.keys(dataSet.keys);
				var titleKey = keys[0];
				var xKey = keys[1];
				var yKey = keys[2];
				var areaKey = keys[3];
				// Ranges
				var xRange = dataSet.getRange(xKey);
				var yRange = dataSet.getRange(yKey);
				var areaRange = dataSet.getRange(areaKey);
				// Axes
				var xAxis;
				var yAxis;
				// Scales
				var xScale;
				var yScale;
				var radiusScale;
				// Other bits
				var gridLines;
				var yOffsetX = 0;
				var bubbleChart = paper.g();

				var bubbles = [];

				var bubbleSeriesNames = [];
				var bubbleColors = null;
				var colorGroupMap = {};
				
				var defaultGroup = '';
				for (var key in dataSet.keys) {
					defaultGroup = key;
					break;
				}

				dataSet.rows.forEach(function(dataItem, dataItemIndex) {
					if (dataItem[4] == undefined) {
						dataItem[4] = defaultGroup;
					}
					
					if (! colorGroupMap.hasOwnProperty(dataItem[4])) {
						colorGroupMap[dataItem[4]] = null;
						bubbleSeriesNames.push(dataItem[4]);
					}


				});

				bubbleSeriesNames.sort(function(a, b) {
					if (a == 'Other') {
						return 1;
					} else {
						return -1;
					}
				});
				
				bubbleColors = Color.harmonious(bubbleSeriesNames.length);
				bubbleSeriesNames.forEach(function(seriesName, seriesIndex) {
					colorGroupMap[seriesName] = bubbleColors[seriesIndex];
				});

				options = getOptions(options);

				// Render the y axis
				yAxis = drawAxis(yRange, startX, startY + Config.TEXT_SIZE_SMALL, height, "vertical", dataSet.yLabel);
				// Workout y overflow
				yOffsetX = yAxis.getBBox().width;
				yAxis.transform("t " + yOffsetX + " 0");

				width = width - yOffsetX;

				// Render the x axis
				xAxis = drawAxis(xRange, startX + yOffsetX, yAxis.startPoints[0].y, width - yOffsetX - startX, "horizontal", dataSet.xLabel);

				// Draw clickable whitespace
				var whitespace = paper.rect(startX, startY, width, height)
					.attr({
						'fill': 'transparent',
						'opacity': 0
					});

				whitespace.click(function() {
					resetChart();
				});

				// Draw the gridlines
				gridLines = paper.gridLines(startX, startY, yAxis.startPoints, width, 'horizontal');
				gridLines.transform("t " + yOffsetX + " 0");
				gridLines.addClass("fm-scatter-gridlines");

				// Draw the bubbles
				var xIndex = dataSet.keys[xKey];
				var yIndex = dataSet.keys[yKey];
				var areaIndex = dataSet.keys[areaKey];
				var titleIndex = dataSet.keys[titleKey];
				var xValue = 0;
				var yValue = 0;

				radiusScale = new ScaleUtils.AreaScale(Config.BUBBLE_MIN_RADIUS_PROPORTION * Math.min(width, height), (Config.BUBBLE_MAX_RADIUS_PROPORTION - Config.BUBBLE_MIN_RADIUS_PROPORTION) * Math.min(width, height), areaRange.min, areaRange.max);

				var pointGroup = paper.g();
				var pointBubble;

				// Sort it so we draw the smaller circles last
				dataSet.rows.sort(function(a, b) {
					return b[areaIndex] - a[areaIndex];
				});
				dataSet.rows.forEach(function(row, index) {

					xValue = row[xIndex];
					yValue = row[yIndex];
					var radius = radiusScale.getPixel(row[areaIndex]);

					pointBubble = paper.circle(xScale.getPixel(xValue), yScale.getPixel(yValue), radius).addClass( "fm-scatter-bubble" )

					pointBubble.addClass(colorGroupMap[row[4]])
						.attr("stroke", pointBubble.attr("fill"))
						.data("x value", xValue)
						.data("y value", yValue)
						.data("colour", colorGroupMap[row[4]])
						.data('radius', radius)
						.data('area value', row[areaIndex])
						.data("title", row[titleIndex]);
					pointGroup.append(pointBubble);
					bubbles.push(pointBubble);

				});

				// Append to group
				bubbleChart.append(whitespace);
				bubbleChart.append(yAxis);
				bubbleChart.append(xAxis);
				bubbleChart.append(gridLines);
				bubbleChart.append(pointGroup);

				// Draw the key
				var xAxisBBox = xAxis.getBBox();
				var bubbleX = startX + yOffsetX;
				var bubbleY = xAxisBBox.y + xAxisBBox.height + Config.KEY_MARGIN_TOP;
				var bubbleColumnWidth = (xAxisBBox.width - Config.KEY_SIDE_PADDING) / Config.KEY_COLUMNS;
				var bubbleMaxValues = Config.KEY_MAX_VALUES;
				var bubbleMaxValueLength = Config.KEY_MAX_TEXT_LENGTH;
				var bubbleKey = new BubbleKey(
					paper,
					bubbleX,
					bubbleY,
					width,
					bubbleColumnWidth,
					bubbleSeriesNames,
					bubbleMaxValues,
					bubbleMaxValueLength,
					{
						"scale": radiusScale,
						"maxValue": areaRange.max,
						"minValue": areaRange.min,
						"title": areaKey
					}
				);
				bubbleKey.render();

				// Resize the svg
				var bubbleKeyBBox = bubbleKey.node.getBBox();
				var newSvgHeight = bubbleKeyBBox.y + bubbleKeyBBox.height;
				paper.node.style.height = newSvgHeight + "px";
				paper.node.setAttribute("viewBox", "0 0 " + width + " " + newSvgHeight);

				// Setup the events associated with the bubbles and key
				setupBubbleEvents(pointGroup.selectAll(".fm-scatter-bubble"), bubbleKey);

				return bubbleChart;


				/**
				 * Draws an axis
				 * @param	{Object} range			 Contains min and max
				 * @param	{Number} x
				 * @param	{Number} y
				 * @param	{Number} length			Width/Height
				 * @param	{String} orientation Vertical/Horizontal
				 * @param	{String} label
				 * @return {Snap.Group}
				 */
				function drawAxis(range, x, y, length, orientation, label) {

					var axisCls = "",
						tickMarks = ScaleUtils.getTickMarks(range.min, range.max, Config.TARGET_MARKER_COUNT, true),
						scale, tickSize,
						tickMin = tickMarks[0],
						tickMax = tickMarks[tickMarks.length - 1];

					switch (orientation) {

						case "horizontal":
							var tickRange = tickMax - tickMin;
							axisCls = "fm-x-axis";
							tickSize = Config.SMALL_MARKER_SIZE;
							scale = xScale = new ScaleUtils.Scale(x, length, tickMin - tickRange * Config.X_RANGE_PADDING, tickMax + tickRange * 0.1);
							break;

						case "vertical":
							axisCls = "fm-y-axis";
							tickSize = length;
							// Swap the max and min so min sits at the bottom rather than top
							scale = yScale = new ScaleUtils.Scale(y, length, tickMax, tickMin);
							break;

					}

					// startX, startY, scale, tickMarkValues, tickMarkSize, orientation, label
					var axis = paper.axis(
						x,
						y,
						scale,
						tickMarks,
						tickSize,
						orientation,
						label
					).addClass(axisCls);

					return axis;

				}

				/**
				 * Sets up default options if they are not set
				 * @param  {Object} options Current options
				 * @return {Object}
				 */
				function getOptions(options) {

					options.xLabel = (options.xLabel) ? options.xLabel : '';
					options.yLabel = (options.yLabel) ? options.yLabel : '';
					options.bubbleScaleLabel = (options.bubbleScaleLabel) ? options.bubbleScaleLabel : '';

					return options;

				}

				function getTooltipPosition(x, y, radius, plotareaBBox, tooltipBBox) {

					var halfway = plotareaBBox.x + plotareaBBox.width / 2;
					
					var position = {};
					
					position.y = y;
					if (x > halfway) {
						position.x = x - radius;
						position.orientation = "left";
					} else {
						position.x = x + radius;
						position.orientation = "right";
					}
					
					return position;
				}

				/**
				 * Click bubble event function
				 * @param	{BubbleKey} bubbleKey The current bubble key with this chart
				 * @return {Function}
				 */
				function onBubbleClick(bubbleKey) {
					return function() {
						var clickedBubble = this;
						var previousBubble = bubbleKey.state.fixed.bubble;
						if (previousBubble != null) {
							bubbleKey.setScaleFixed(null);
						}
						
						if (previousBubble != clickedBubble) {
							bubbleKey.setScaleFixed(clickedBubble);
						} else {
							bubbleKey._showScaleLabels();
						}
						
						bubbleKey.setScaleHover(null);
						
						bubbles.forEach(function(bubble) {
							if (bubble != clickedBubble || clickedBubble == previousBubble) {
								var tooltip = bubble.data('tooltip');
								
								if (tooltip) {
									tooltip.remove();
									bubble.data("tooltip", null);
								}
							}
						});
					};
				}

				/**
				 * Mouseleave bubble event function
				 * @param	{BubbleKey} bubbleKey The current bubble key with this chart
				 * @return {Function}
				 */
				function onBubbleMouseleave(bubbleKey) {
					return function() {
						bubbleKey.setScaleHover(null);
						if (bubbleKey.state.fixed.bubble !== this) {
							var tooltip = this.data("tooltip");
							
							if (tooltip) {
								tooltip.remove();
							}
							
							this.data("tooltip", null);
						}
					};
				}

				/**
				 * Mouseover bubble event function
				 * @param	{BubbleKey} bubbleKey The current bubble key with this chart
				 * @return {Function}
				 */
				function onBubbleMouseover(bubbleKey) {
					return function() {

						if (bubbleKey.state.fixed.bubble !== this) {

							var gridLinesBBox = gridLines.getBBox();
							var tooltipObject = new MultiLineTooltip(paper, 'fm-bubble-tooltip', this.data("colour"));

							tooltipObject.render(
								this.data("title"), [{
									title: areaKey,
									value: appendValuePrefixAndSuffix(this.data("area value"), options.sizePrefix, options.sizeSuffix)
								}], [{
									title: xKey,
									value: appendValuePrefixAndSuffix(this.data("x value"), options.xPrefix, options.xSuffix)
								}, {
									title: yKey,
									value: appendValuePrefixAndSuffix(this.data("y value"), options.yPrefix, options.ySuffix)
								}]
							);

							var bubbleRadius = this.data("radius");
							var tooltipX = xScale.getPixel(this.data("x value"));
							var tooltipY = yScale.getPixel(this.data("y value"));

							var tooltipPos = getTooltipPosition(tooltipX, tooltipY, bubbleRadius, gridLinesBBox, tooltipObject.snapElement.getBBox());

							tooltipObject.setPosition(
								tooltipPos.x,
								tooltipPos.y,
								tooltipPos.orientation
							);
							tooltipObject.show();
							this.data("tooltip", tooltipObject);

						}

						bubbleKey.setScaleHover(this);
					};
				}


				/**
				 * Adds any events to the bubble point
				 * @param	{Snap.Circle} bubblePoint
				 * @param	{Array} data
				 */
				function setupBubbleEvents(bubblePoints, bubbleKey) {

					bubblePoints.forEach(function setupBubbleEvents(bubblePoint, index) {
						bubblePoint.mouseover(onBubbleMouseover(bubbleKey));
						bubblePoint.mouseout(onBubbleMouseleave(bubbleKey));
						bubblePoint.click(onBubbleClick(bubbleKey));
					});

				}

				function resetChart() {

					bubbleKey.setScaleHover(null);
					bubbleKey.setScaleFixed(null);
					
					bubbles.forEach(function(bubble) {
						var tooltip = bubble.data('tooltip');
						
						if (tooltip) {
							tooltip.remove();
							bubble.data("tooltip", null);
						}
					});

					bubbleKey._showScaleLabels();

				}


			};

		});

	});
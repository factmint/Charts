define([
		'snap',
		'config',
		'scale-utils',
		'color-utils',
		'number-utils',
		'axis',
		'grid-lines',
		'scatter-key',
		'Tooltip'
	],
	function(
		Snap,
		Config,
		ScaleUtils,
		Color,
		NumberUtils,
		axis,
		gridLines,
		ScatterKey,
		Tooltip
	) {

		return Snap.plugin(function(Snap, Element, Paper) {

			/**
			 * Candlestick chart plugin
			 * @param {Number} startX
			 * @param {Number} startY
			 * @param {Number} width
			 * @param {Number} height
			 * @param {Object} data
			 * @param {Object} options
			 */
			Paper.prototype.chart = function(startX, startY, width, height, data, options) {

				/**
				 * Loop through the data and draw candlesticks on the graph
				 */
				function populateGraph() {

					colorClasses = Color.harmonious(data.numberOfSeries);

					var paths = [];
					for (var seriesIndex = 0; seriesIndex < data.numberOfSeries; seriesIndex++) {
						paths.push([]);
					}
					
					var drawCandlesticks = (width / data.rows.length > Config.MINIMUM_SPACE_PER_DOT);
					
					data.rows.forEach(function(dataItem, xValue) {
						if (! dataItem.isFill) {
							var alignedBoxes = [];

							if (data.rows.length === 2) {
								xValue++;
							}

							var openYPixel = (dataItem.ySeries[0]) ? yScale.getPixel(dataItem.ySeries[0].value) : 0;
							var highYPixel = (dataItem.ySeries[1]) ? yScale.getPixel(dataItem.ySeries[1].value) : 0;
							var lowYPixel = (dataItem.ySeries[2]) ? yScale.getPixel(dataItem.ySeries[2].value) : 0;
							var closeYPixel = (dataItem.ySeries[3]) ? yScale.getPixel(dataItem.ySeries[3].value) : 0;
							
							var bodyMidpoint = openYPixel + (closeYPixel - openYPixel) / 2

							var candlestick = drawCandlestick(xValue, openYPixel, highYPixel, lowYPixel, closeYPixel);

							graphContent.append(candlestick);

							hoverAreas.append(drawHoverArea(dataItem, xValue)
								.attr({opacity: 0})
								.data('data', dataItem)
							);
						}	
					});

				}

				function drawHoverArea(datum, xValue) {
					var x = xScale.getPixel(xValue - 0.5);
					var width = xScale.getPixel(xValue + 0.5) - x;
					
					var y = yScale.start;
					var height = yScale.end - y;
								
					var midPoint = x + width / 2;

					return paper.rect(
						x,
						y,
						width,
						height
					).addClass('fm-hover-area').hover(function() {
						showTooltip(datum, xScale.getPixel(xValue), yScale.getPixel(datum.ySeries[0].value))
					}, function() {
						hideTooltips();
					});
				}

				/**
				 * Draw a vertical axis
				 * @param {Object} range
				 * @param {String} label
				 */
				function drawYAxis(range, label) {

					var yTickMarks = ScaleUtils.getTickMarks(range.min, range.max, Config.TARGET_MARKER_COUNT, true);
					yScale = new ScaleUtils.Scale(startY + Config.TOP_PADDING, height - Config.TOP_PADDING - Config.BOTTOM_PADDING, yTickMarks[yTickMarks.length - 1], yTickMarks[0]);
					
					var prefix = (options.valuePrefix) ? options.valuePrefix : '';
					var suffix = (options.valueSuffix) ? options.valueSuffix : '';
					
					yTickMarks = yTickMarks.map(function(tickMark) {
						return {
							position: tickMark,
							label: prefix + NumberUtils.renderValue(tickMark) + suffix
						};
					});
					
					return paper.axis(
							startX,
							startY,
							yScale,
							yTickMarks,
							height,
							'vertical',
							label
						)
						.addClass('fm-y-axis');
				}

				/**
				 * Get an estimate of how long the labels along the x axis will be
				 * @param {Object} y
				 */
				function getLengthEstimate(xTickMarks) {
					return xTickMarks.reduce(function(total, tickMark) {
						return total + Config.TEXT_SIZE_SMALL * tickMark.label.length;
					}, 0);
				}

				/**
				 * Draw a horizontal axis
				 * @param {Number} y
				 * @param {Object} range
				 * @param {String} label
				 */
				function drawXAxis(y, tickLabels, label) {
					var xTickMarks = getEvenlyDistributedTicks(tickLabels);
					
					var lengthEstimate = xTickMarks.reduce(function(total, tickMark) {
						return total + Config.TEXT_SIZE_SMALL * tickMark.label.length;
					}, 0);
					
					if (lengthEstimate > width / Config.TOTAL_WIDTH_TO_X_TICK_RATIO) {
						var removeEveryNth = NumberUtils.getFactor(xTickMarks.length - 1);
						xTickMarks = xTickMarks.filter(function(tickMark, index) {
							return (index % removeEveryNth === 0);
						});
					}

					var xMin = xTickMarks[0].position;
					var xMax = xTickMarks[xTickMarks.length - 1].position;
					var xRange = xMax - xMin;
					xScale = new ScaleUtils.Scale(startX, width - 10, xMin - xRange * Config.X_RANGE_PADDING, xMax + xRange * Config.X_RANGE_PADDING);

					return paper.axis(
							startX,
							y,
							xScale,
							xTickMarks,
							0, // TODO: This should be handled by the tick-mark util and not drawn at all
							'horizontal',
							label
						)
						.addClass('fm-x-axis');
				}
				
				function getEvenlyDistributedTicks(tickLabels) {
					var numberOfTicks = Config.TARGET_MARKER_COUNT;
					while((tickLabels.length - 1) % numberOfTicks !== 0) {
						numberOfTicks--;
					}
					
					var tickInterval = (tickLabels.length - 1) / numberOfTicks;
					return tickLabels.map(function(label, position) {
						return {
							position: position,
							label: label
						};
					}).filter(function(value, index) {
						return (index % tickInterval === 0);
					});
				}

				/**
				 * Draw a candlestick on the chart
				 * @param {Number} xValue
				 * @param {Number} highYPixel
				 * @param {Number} openYPixel
				 * @param {Number} closeYPixel
				 * @param {Number} lowYPixel
				 */
				function drawCandlestick(xValue, openYPixel, highYPixel, lowYPixel, closeYPixel) {
					var xPixel = xScale.getPixel(xValue);
					var candlestick = paper.group().addClass('fm-candlestick');

					var trendClass = "fm-growth";

					if (openYPixel > closeYPixel) {
						var temporyOpenYPixel = openYPixel;
						openYPixel = closeYPixel;
						closeYPixel = temporyOpenYPixel;
						trendClass = "fm-decline";
					}

					candlestick.addClass(trendClass);

					if (options.greyscale) {
						candlestick.addClass('fm-greyscale');
					}

					var topWick = paper.line(xPixel, highYPixel, xPixel, openYPixel).addClass('fm-candlestick-wick');

					var candleWidth = xScale.getPixel(xValue + 0.5) - xScale.getPixel(xValue - 0.5);

					var body = paper.rect(xPixel - (candleWidth / 6), openYPixel, candleWidth / 3, closeYPixel - openYPixel).addClass('fm-candlestick-body');

					var bottomWick = paper.line(xPixel, closeYPixel, xPixel, lowYPixel).addClass('fm-candlestick-wick');

					candlestick.append(topWick);
					candlestick.append(body);
					candlestick.append(bottomWick);

					return candlestick;
				}

				/**
				 * @param {Object} datum
				 */
				function showTooltip(datum, xPixel, yPixel) {
					var tooltipPosition;
					
					var xOffset = Config.DOT_SIZE * Config.LARGE_DOT_FACTOR + Config.TOOLTIP_MARGIN;
					if (xPixel > startX + (width / 2)) {
						tooltipPosition = 'left';
					}
					else {
						tooltipPosition = 'right';
					}

					var colorClass = (options.greyscale) ? 'fm-datum-color-wheel-f' : 'fm-datum-color-overflow';

					tooltipObject = new Tooltip(paper, 'fm-candlestick-tooltip', colorClass);
					var tooltip = tooltipObject.render(
						datum.xLabel, [
							{
								title: data.keys[0],
								value: datum.ySeries[0].value
							},
							{
								title: data.keys[1],
								value: datum.ySeries[1].value
							},
							{
								title: data.keys[2],
								value: datum.ySeries[2].value
							},
							{
								title: data.keys[3],
								value: datum.ySeries[3].value
							},
						]
					).addClass('with-fill');

					tooltipObject.setPosition(xPixel, yPixel, tooltipPosition);
					tooltipObject.show();

					graphContent.append(tooltip);
				}

				/**
				 * Hide (remove) all tooltips
				 */
				function hideTooltips() {
					tooltipObject.remove();
				}

				/**
				 * Resize the SVG viewbox to a given value
				 */
				function resizeViewBox(newHeight) {
					paper.node.style.height = newHeight + 'px';
					paper.node.setAttribute('viewBox', '0 0 ' + (width + yAxisOverflow) + ' ' + newHeight);
				}

				var paper = this;
				var candlestickChart = paper.group();

				if (options.greyscale === "true") {
					options.greyscale = true;
				} else if (options.greyscale === "false") {
					options.greyscale = false;
				} else if (typeof options.greyscale !== "boolean") {
					console.error("Greyscale option (" + options.greyscale + ") is invalid, defaulting to false.");
					options.greyscale = false;
				}

				var measureOneTitle = data.keys[1];
				var measureTwoTitle = data.keys[2];

				var colorClasses = [];

				var yScale;
				var xScale;

				var yAxis = drawYAxis(data.yRange, options.yLabel);
				var yAxisOverflow = startX - yAxis.getBBox().x;
				var yAxisWidth = yAxis.getBBox().width;
				yAxis.transform('t ' + yAxisOverflow + ' 0');
				startX += yAxisOverflow;
				width -= yAxisOverflow;
				
				if (width < 20) {
					throw 'Container too small';
				}

				var xAxis = drawXAxis(yAxis.startPoints[0].y, data.xLabels, null);
				
				var xAxisBBox = xAxis.getBBox();
				// BBox for entire group is incorrect in Chrome so we need to use this
				var xAxisWidth = paper.select('.fm-x-axis line').getBBox().width; 


				var gridLines = paper.gridLines(startX, startY, yAxis.startPoints, width, 'horizontal');

				var tooltipObject;
				var graphContent = paper.group();
				var hoverAreas = paper.group();

				populateGraph();

				candlestickChart.append(yAxis);
				candlestickChart.append(xAxis);
				candlestickChart.append(gridLines);
				candlestickChart.append(graphContent);

				return candlestickChart;
			};
		});
	});

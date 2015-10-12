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
	
	function appendValuePrefixAndSuffix(value, prefix, suffix) {
		var sign = (value < 0) ? '-' : '';
		return sign + prefix + Math.abs(value) + suffix;
	}

	return Snap.plugin(function(Snap, Element, Paper) {
		/**
		 * Scatter graph plugin
		 * @param {Number} startX
		 * @param {Number} startY
		 * @param {Number} width
		 * @param {Number} height
		 * @param {Object} data
		 * @param {Object} options
		 */
		Paper.prototype.chart = function(startX, startY, width, height, data, options) {
			
			if (! options.xPrefix) options.xPrefix = '';
			if (! options.xSuffix) options.xSuffix = '';
			
			if (! options.yPrefix) options.yPrefix = '';
			if (! options.ySuffix) options.ySuffix = '';

			/**
			 * Loop through the data and draw dots on the graph
			 */
			function populateGraph() {
				data.rows.forEach(function(dataItem) {
					if (groups.indexOf(dataItem.group) === -1) {
						groups.push(dataItem.group);
					}
				});

				var colorClasses;
				if (groups.length > 1) {
					colorClasses = Color.harmonious(groups.length);
				} else {
					colorClasses = Color.harmonious(1);
				}

				groups.forEach(function(group, groupIndex) {
					colorGroupMap[group] = colorClasses[groupIndex];
				});

				data.rows.forEach(function(dataItem) {
					var dot = drawDot(dataItem.x, dataItem.y)
						.data('metaInfo', dataItem)
						.data('colorClass', colorGroupMap[dataItem.group])
						.addClass(colorGroupMap[dataItem.group])
						.hover(showTooltip, hideTooltips);
					dots.append(dot);
				});

				var scatterKeyTrendlines = [];
				if (options.showTrendLines === true) {
					var columnOffset = 0;
					var rowOffset = 0;
					var trendLineIndex = 0;

					groups.forEach(function(group) {
						var trendLine = drawTrendLine(group);
						if (trendLine !== false) {
							trendLine.data('colorClass', colorGroupMap[group]);
							scatterKeyTrendlines.push(trendLine);
							trendLines.append(trendLine);
						} else {
							scatterKeyTrendlines.push(null);
						}
					});
				}

				if (groups.length > 1) {
					drawKey(groups, scatterKeyTrendlines);
				}
			}

			/**
			 * Draw a vertical axis
			 * @param {Object} range
			 * @param {String} label
			 */
			function drawYAxis(range, label) {
				var yTickMarks = ScaleUtils.getTickMarks(range.min, range.max, Config.TARGET_MARKER_COUNT);
				yScale = new ScaleUtils.Scale(startY, height, yTickMarks[yTickMarks.length - 1], yTickMarks[0]);

				return paper.axis(
					startX,
					startY,
					yScale,
					yTickMarks,
					width,
					'vertical',
					label
				)
					.addClass('fm-y-axis');
			}

			/**
			 * Draw a horizontal axis
			 * @param {Number} y
			 * @param {Object} range
			 * @param {String} label
			 */
			function drawXAxis(y, range, label) {
				startX += yAxisOverflow;
				width -= yAxisOverflow;

				var xTickMarks = ScaleUtils.getTickMarks(range.min, range.max, Config.TARGET_MARKER_COUNT);
				var xMin = xTickMarks[0];
				var xMax = xTickMarks[xTickMarks.length - 1];
				var xRange = xMax - xMin;
				xScale = new ScaleUtils.Scale(startX, width, xMin - xRange * Config.X_RANGE_PADDING, xMax + xRange * Config.X_RANGE_PADDING);

				return paper.axis(
					startX,
					y,
					xScale,
					xTickMarks,
					Config.SMALL_MARKER_SIZE,
					'horizontal',
					label
				)
					.addClass('fm-x-axis');
			}

			/**
			 * Draw a dot on the scatter graph
			 * @param {Number} x
			 * @param {Number} y
			 */
			function drawDot(x, y) {
				var xPixel = xScale.getPixel(x);
				var yPixel = yScale.getPixel(y);

				return paper.circle(xPixel, yPixel, Config.DOT_SIZE)
					.attr({
						opacity: 0.5
					})
					.hover(function() {
						this.attr({
							opacity: 1,
							r: Config.DOT_SIZE	* Config.LARGE_DOT_FACTOR
						});
					}, function() {
						this.attr({
							opacity: 0.5,
							r: Config.DOT_SIZE
						});
					})
					.addClass('fm-scatter-dot');
			}

			/**
			 * Show a tooltip, the context (this) is the dot being hovered over
			 */
			function showTooltip() {
				var tooltipPosition;
				var xPixel = xScale.getPixel(this.data('metaInfo').x);
				var yPixel = yScale.getPixel(this.data('metaInfo').y);
				var arrowPosition;
				var xOffset = Config.DOT_SIZE * Config.LARGE_DOT_FACTOR + Config.TOOLTIP_MARGIN;
				if (xPixel > startX + (width / 2)) {
					tooltipPosition = 'left';
					xPixel -= xOffset;
				} else {
					tooltipPosition = 'right';
					xPixel += xOffset;
				}

				var tooltipObject = new Tooltip(paper, 'fm-scatter-tooltip', colorGroupMap[this.data('metaInfo').group]);
				tooltipObjects.push(tooltipObject);
				
				var tooltip = tooltipObject.render(
					this.data('metaInfo').title,
					[
						{
							title: data.keys[1].title,
							value: appendValuePrefixAndSuffix(this.data('metaInfo').x, options.xPrefix, options.xSuffix)
						},
						{
							title: data.keys[2].title,
							value: appendValuePrefixAndSuffix(this.data('metaInfo').y, options.yPrefix, options.ySuffix)
						}
					]
				);

				tooltip.addClass('fm-scatter-tooltip');

				tooltipObject.setPosition(xPixel, yPixel, tooltipPosition);
				tooltipObject.show();

				scatterGraph.append(tooltip);
			}

			/**
			 * Hide (remove) all tooltips
			 */
			function hideTooltips() {
				tooltipObjects.forEach(function(tooltip) {
					tooltip.remove();
					tooltipObjects.pop(tooltip);
				});
			}

			/**
			 * Draw a key to the canvas
			 */
			function drawKey(values, trendlineValues) {
				var xAxisBBox = xAxis.getBBox();
				var keyStartX = startX;
				var keyStartY = xAxisBBox.y + xAxisBBox.height + Config.KEY_TOP_MARGIN;

				keyObject = new ScatterKey(
					paper,
					keyStartX,
					keyStartY,
					width,
					keyColumns,
					keyColumnWidth,
					true,
					values,
					Config.KEY_MAX_VALUES,
					Config.KEY_MAX_VALUE_LENGTH
				);
				key = keyObject.render(trendlineValues);

			 	var keyBBox = key.node.getBBox();
				resizeViewBox(keyBBox.y + keyBBox.height);
			}

			/**
			 * Resize the SVG viewbox to a given value
			 */
			 function resizeViewBox(newHeight) {
				paper.node.style.height = newHeight + 'px';
				paper.node.setAttribute('viewBox', '0 0 ' + (width + yAxisOverflow) + ' ' + newHeight);
			}

			/**
			 * Draw trend line for a given group
			 * @param {String} group
			 */
			function drawTrendLine(group) {
				function computeLinearRegression(y, x) {
					var linearRegression = {};
					var n = y.length;
					var sumX = 0;
					var sumY = 0;
					var sumXY = 0;
					var sumXX = 0;
					var sumYY = 0;

					for (var i = 0; i < y.length; i++) {
						sumX += x[i];
						sumY += y[i];
						sumXY += (x[i] * y[i]);
						sumXX += (x[i] * x[i]);
						sumYY += (y[i] * y[i]);
					}

					linearRegression['slope'] = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
					linearRegression['intercept'] = (sumY - linearRegression.slope * sumX) / n;

					var r2 = Math.pow((n * sumXY - sumX * sumY) / Math.sqrt((n * sumXX - sumX * sumX) * (n * sumYY - sumY * sumY)), 2);

					if (r2 >= R2_BOUNDARIES.veryStrong.value) {
						linearRegression['strength'] = R2_BOUNDARIES.veryStrong.title;
					} else if (r2 >= R2_BOUNDARIES.strong.value) {
						linearRegression['strength'] = R2_BOUNDARIES.strong.title;
					} else if (r2 >= R2_BOUNDARIES.moderate.value) {
						linearRegression['strength'] = R2_BOUNDARIES.moderate.title;
					} else if (r2 >= R2_BOUNDARIES.weak.value) {
						linearRegression['strength'] = R2_BOUNDARIES.weak.title;
					} else {
						linearRegression['strength'] = R2_BOUNDARIES.veryWeak.title;
					}

					return linearRegression;
				}

				var xRangeForGroup = {
					min: null,
					max: null
				}

				var yRangeForGroup = {
					min: null,
					max: null
				}

				var xValuesForGroup = [];
				var yValuesForGroup = [];

				data.rows.forEach(function(dataItem) {
					if (dataItem.group === group) {
						xValuesForGroup.push(dataItem.x);
						yValuesForGroup.push(dataItem.y);
						if (xRangeForGroup.min === null || xRangeForGroup.min > dataItem.x) {
							xRangeForGroup.min = dataItem.x;
						}
						if (xRangeForGroup.max === null || xRangeForGroup.max < dataItem.x) {
							xRangeForGroup.max = dataItem.x;
						}
						if (yRangeForGroup.min === null || yRangeForGroup.min > dataItem.y) {
							yRangeForGroup.min = dataItem.y;
						}
						if (yRangeForGroup.max === null || yRangeForGroup.max < dataItem.y) {
							yRangeForGroup.max = dataItem.y;
						}
					}
				});

				if (xValuesForGroup.length > 1 && yValuesForGroup.length > 1) {
					var linearRegression = computeLinearRegression(yValuesForGroup, xValuesForGroup);

					var x1 = xRangeForGroup.min - xRangeForGroup.min * Config.EXTRAPOLATION_FACTOR;
					var y1 = linearRegression.slope * x1 + linearRegression.intercept;

					var x2 = xRangeForGroup.max + xRangeForGroup.max * Config.EXTRAPOLATION_FACTOR;
					var y2 = linearRegression.slope * x2 + linearRegression.intercept;

					var startXPixel = xScale.getPixel(x1);
					var startYPixel = yScale.getPixel(y1);
					var endXPixel = xScale.getPixel(x2);
					var endYPixel = yScale.getPixel(y2);

					var trendLine = paper.line(
						startXPixel,
						startYPixel,
						endXPixel,
						endYPixel
					)
						.addClass('fm-trend-line ' + colorGroupMap[group] + ' with-stroke')
						.data('correlationStrength', linearRegression.strength);

					return trendLine;

				} else {
					return false;
				}
			}

			var R2_BOUNDARIES = {
				veryStrong: {
					title: 'Very strong',
					value: 0.8
				},
				strong: {
					title: 'Strong',
					value: 0.6
				},
				moderate: {
					title: 'Moderate',
					value: 0.4
				},
				weak: {
					title: 'Weak',
					value: 0.2
				},
				veryWeak: {
					title: 'Very weak'
				}
			};

			var paper = this;
			var scatterGraph = paper.group();

			if (options.showTrendLines === "true") {
				options.showTrendLines = true;
			} else if (options.showTrendLines === "false") {
				options.showTrendLines = false;
			} else if (typeof options.showTrendLines !== "boolean") {
				console.error("Show trend lines option of " + options.showTrendLines + " is invalid, defaulting to false.");
				options.showTrendLines = false;
			}

			var measureOneTitle = (data.keys[1]) ? data.keys[1].title : "";
			var measureTwoTitle = (data.keys[2]) ? data.keys[2].title : "";

			var groups = [];
			var colorGroupMap = {};

			var yScale;
			var xScale;

			var yAxis = drawYAxis(data.yRange, data.yLabel);

			var yAxisOverflow = startX - yAxis.getBBox().x;
			yAxis.transform('t ' + yAxisOverflow + ' 0');

			var xAxis = drawXAxis(yAxis.startPoints[0].y, data.xRange, data.xLabel);
			var xAxisBBox = xAxis.getBBox();

			var gridLines = paper.gridLines(startX, startY, yAxis.startPoints, width, 'horizontal');

			var tooltipObjects = [];
			var dots = paper.group();

			var keyObject;
			var key;

			var keyColumns = (options.showTrendLines == true) ? 1 : 3;
			var keyColumnWidth = (options.showTrendLines) ? width / 4 : (width - Config.KEY_SIDE_PADDING) / 4;


			var trendLineMask = paper.group(
				paper.rect(startX, startY, width, height)
					.attr({
						fill: 'white'
					})
			);
			var trendLines = paper.group()
				.attr({
					mask: trendLineMask
				});

			populateGraph();

			scatterGraph.append(yAxis);
			scatterGraph.append(xAxis);
			scatterGraph.append(gridLines);
			scatterGraph.append(trendLines);
			scatterGraph.append(dots);

			var scatterGraphBBox = scatterGraph.getBBox();

			if (groups.length < 2) {
				resizeViewBox(scatterGraphBBox.y2 + Config.TEXT_SIZE_SMALL);
			}

			var yOverflow = startY - scatterGraphBBox.y;
			scatterGraph.transform('t 0 ' + yOverflow);

			return scatterGraph;
		};
	});
});

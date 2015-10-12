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
			 * area graph plugin
			 * @param {Number} startX
			 * @param {Number} startY
			 * @param {Number} width
			 * @param {Number} height
			 * @param {Object} data
			 * @param {Object} options
			 */
			Paper.prototype.chart = function(startX, startY, width, height, data, options) {

				/**
				 * Loop through the data and draw dots on the graph
				 */
				function populateGraph() {

					colorClasses = Color.harmonious(data.numberOfSeries);

					var paths = [];
					var areaPoints = [];
					for (var seriesIndex = 0; seriesIndex < data.numberOfSeries; seriesIndex++) {
						paths.push([]);
					}
					
					var dotElements = [];

					var tracker;
					var reversedKeys = data.keys.slice().reverse();
					var reversedColorClasses = colorClasses.slice().reverse();
					if (data.numberOfSeries > 1) {
						tracker = generateXTracker(reversedColorClasses, reversedKeys);
					}

					var drawDots = (width / data.rows.length > Config.MINIMUM_SPACE_PER_DOT);
					
					data.rows.forEach(function(dataItem, xValue) {
						var alignedDots = [];
						var xPixel = xScale.getPixel(xValue);
						
						if (! dataItem.isFill) {
							for (var seriesIndex = 0; seriesIndex < dataItem.ySeries.length; seriesIndex++) {
								if (dataItem.ySeries[seriesIndex] === null) continue;
								
								var yPixel = yScale.getPixel(dataItem.ySeries[seriesIndex].runningTotal);
								
								paths[seriesIndex].push({
									x: xPixel,
									y: yPixel
								});
								
								if (drawDots) {
									var dot = drawDot(xPixel, yPixel)
										.addClass(colorClasses[seriesIndex])
										.addClass('with-stroke')
										.addClass('fm-line-stroke');
								}
									
								if (dataItem.ySeries[seriesIndex].annotation) {
									var annotationPosition = yPixel - 20;
									var	annotationOrientation = 'top';
									
									var tooltipObject = new Tooltip(paper, 'fm-stacked-area-tooltip fm-annotation', colorClasses[seriesIndex]);
									var tooltip = tooltipObject.render(dataItem.xLabel, dataItem.ySeries[seriesIndex].annotation);
				
									tooltipObject.setPosition(xPixel, annotationPosition, annotationOrientation);
									tooltipObject.show();
								}
								
								if (drawDots) {
									dotElements.push(dot);
									alignedDots.push(dot);
								}
							}
						}
						
						hoverAreas.append(drawHoverArea(dataItem, xValue, tracker, alignedDots)
							.attr({opacity: 0})
							.data('data', dataItem)
						);
					});
					
					paths.forEach(function(path, index) {
						var closingPoints = [];
						if (index === 0) {
							closingPoints.push({
								x: path[path.length - 1].x,
								y: yScale.end
							});
							closingPoints.push({
								x: path[0].x,
								y: yScale.end
							})
						} else {
							for (var pointIndex = paths[index - 1].length - 1; pointIndex >= 0; pointIndex--) {
								closingPoints.push(paths[index - 1][pointIndex]);
							}
						}
						areaPoints.push(path.concat(closingPoints));
					});
					
					var lines = [];
					var areas = [];
					for (var seriesIndex = 0; seriesIndex < data.numberOfSeries; seriesIndex++) {
						lines.push(
							drawLine(paths[seriesIndex], false)
								.addClass(colorClasses[seriesIndex])
								.addClass('with-stroke')
								.addClass('fm-line-stroke')
								.addClass('no-fill')
						);
						areas.push(
							drawLine(areaPoints[seriesIndex], false)
								.addClass(colorClasses[seriesIndex])
								.attr({opacity: Config.AREA_OPACITY})
						);
					}
					
					areas.forEach(function(area) {
						graphContent.append(area);
					});
					
					lines.forEach(function(line) {
						graphContent.append(line);
					});
					
					dotElements.forEach(function(dot) {
						graphContent.append(dot);
					})
					
					if (tracker) {
						graphContent.append(tracker.line);
						graphContent.append(tracker.label);
					}

					if (data.numberOfSeries > 1) {
						drawKey(data.keys);
					}
				}
				
				/**
				 * Draw the various components of the xTracker (used for multi-series graphs)
				 * @param {Array} List of colour classes
				 * @returns {Object} A map of "line", "label", "title" and and array of "tooltipEntries", each a Snap Element
				 */
				function generateXTracker(colorClasses, labels) {
					var hoverLine = paper.line(xScale.start, yScale.start, xScale.start, yScale.end).addClass('fm-x-tracker').attr({opacity: 0});
					
					var hoverLabel = paper.group().attr({opacity: 0});
			
					var labelHeight = 
						Config.LABEL_TOP_PADDING + 
						Config.LABEL_INTERNAL_PADDING * (data.numberOfSeries) + 
						Config.LABEL_INTERNAL_LINE_HEIGHT * (data.numberOfSeries + 1) + 
						Config.LABEL_BOTTOM_PADDING;
					
					var labelWidth = 0;
					var tooltipEntries = colorClasses.map(function(colorClass, index) {
						var verticalMiddle = Config.LABEL_TOP_PADDING + Config.LABEL_INTERNAL_PADDING * (1 + index) + Config.LABEL_INTERNAL_LINE_HEIGHT * (1.5 + index);
						
						var keyLED = paper.circle(
							Config.LABEL_LEFT_PADDING + Config.LABEL_INTERNAL_LINE_HEIGHT * 0.5,
							verticalMiddle,
							Config.LABEL_KEY_RADIUS
						).addClass(colorClass);
						
						hoverLabel.append(keyLED);
						
						var keyLabel = paper.text(
							Config.LABEL_LEFT_PADDING + Config.LABEL_INTERNAL_LINE_HEIGHT,
							verticalMiddle,
							labels[index] + ":"
						).addClass('fm-label-key');
						
						hoverLabel.append(keyLabel);
						
						var keyValue = paper.text(
							0,
							verticalMiddle,
							""
						).addClass('fm-label-value');
						
						hoverLabel.append(keyValue);
						
						var entryWidth = keyLabel.getBBox().x2 + Config.LABEL_INTERNAL_PADDING + Config.LABEL_VALUE_WIDTH + Config.LABEL_RIGHT_PADDING;
						if (entryWidth > labelWidth) {
							labelWidth = entryWidth;
						}
						
						return keyValue;
					});
					
					var title = paper.text(labelWidth / 2, Config.LABEL_TOP_PADDING + Config.LABEL_INTERNAL_LINE_HEIGHT / 2, "").addClass('fm-label-title');
					hoverLabel.append(title);
			
					hoverLabel.prepend(paper.rect(0, 0, labelWidth, labelHeight, Config.LABEL_BORDER_RADIUS, Config.LABEL_BORDER_RADIUS).addClass('fm-x-tracker').addClass('label'));
					
					tooltipEntries.forEach(function(entry) {
						entry.attr('x', labelWidth - Config.LABEL_RIGHT_PADDING);
					});
					
					return {
						line: hoverLine,
						label: hoverLabel,
						title: title,
						tooltipEntries: tooltipEntries
					};
				}

				/**
				 * Draw a vertical axis
				 * @param {Object} range
				 * @param {String} label
				 */
				function drawYAxis(range, label) {

					var addPadding = true;
					if (options.percent) {
						addPadding = false;
					} 
					var yTickMarks = ScaleUtils.getTickMarks(range.min, range.max, Config.TARGET_MARKER_COUNT, addPadding);
					
					var top = startY + Config.TOP_PADDING;
					var bottom = height - Config.TOP_PADDING - Config.BOTTOM_PADDING;
					yScale = new ScaleUtils.Scale(top, bottom, yTickMarks[yTickMarks.length - 1], yTickMarks[0]);
					
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
				 * Draw a dot on the area graph
				 * @param {Number} x
				 * @param {Number} y
				 */
				function drawDot(xPixel, yPixel) {

					return paper.circle(xPixel, yPixel, Config.DOT_SIZE)
						.addClass('fm-line-dot')
						.addClass('fm-tint-2')
						.addClass('fm-white-fill')
						.attr({'opacity': 0});
				}
				
				/**
				 * Draw a line on the area graph
				 * @param {Array} an array of objects with x,y properties
				 */
				function drawLine(path) {
					var points = [];
					
					path.forEach(function(point) {
						points.push(point.x);
						points.push(point.y);	
					});
					
					return paper.polyline(points);
				}
				
				function drawHoverArea(datum, xValue, tracker, dots) {
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
					).addClass('fm-hover-area').hover(
						function() {
							if (! datum.isFill) {
								if (tracker) {
									tracker.title.attr({text: datum.xLabel});
									
									tracker.tooltipEntries.forEach(function(tooltipEntry, index) {
										var textualValue = '';
										var reversedYSeries = datum.ySeries.slice().reverse();
										if (reversedYSeries[index]) {
											textualValue = reversedYSeries[index].text
										}
										
										tooltipEntry.attr({text: textualValue});
									});
									
									tracker.line.animate({
										x1: midPoint,
										x2: midPoint,
										opacity: 1
									}, 150, mina.easeinout);
									
									var labelBBox = tracker.label.getBBox();
									var labelX = midPoint;
									labelX += (xScale.middle > midPoint) ? 
													Config.LABEL_TO_TRACKER_DISTANCE :
													-Config.LABEL_TO_TRACKER_DISTANCE - labelBBox.width;
									
									tracker.label.animate({
										transform: 'translate(' + labelX + ', ' + (yScale.getPixel(datum.averageYValue) - (labelBBox.height / 2)) + ')',
										opacity: 1
									}, 150, mina.easeinout);
								} else {
									showTooltip(datum, midPoint);
								}
									
								dots.forEach(function(dot) {
									dot.animate({opacity: 1}, 50);
								});
							}
						},
						function(event) {
							if (tracker) {
								if (! event.toElement || event.toElement.className.baseVal != 'fm-hover-area') {
									tracker.label.animate({
										opacity: 0
									}, 50);
									tracker.line.animate({
										opacity: 0
									}, 50);
								}
							} else {
								hideTooltips();
							}
							
							dots.forEach(function(dot) {
								dot.animate({opacity: 0}, 50);
							});
						}
					);
				}

				/**
				 * @param {Object} datum
				 */
				function showTooltip(datum, xPixel) {
					var yPixel = yScale.getPixel(datum.averageYValue);
					var tooltipPosition;
					
					var xOffset = Config.DOT_SIZE / 2 + Config.TOOLTIP_MARGIN;
					if (xPixel > startX + (width / 2)) {
						tooltipPosition = 'left';
						xPixel -= xOffset;
					}
					else {
						tooltipPosition = 'right';
						xPixel += xOffset;
					}

					tooltipObject = new Tooltip(paper, 'fm-stacked-area-tooltip', colorClasses[0]);
					var tooltip = tooltipObject.render(
						datum.xLabel, [{
							title: data.keys[0],
							value: datum.ySeries[0].text
						}]
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
				 * Draw a key to the canvas
				 */
				function drawKey(values) {
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
					key = keyObject.render();

					var keyBBox = key.node.getBBox();
					resizeViewBox(keyBBox.y + keyBBox.height);
				}

				/**
				 * Resize the SVG viewbox to a given value
				 */
				function resizeViewBox(newHeight) {
					var boundingBox = paper.node.getBoundingClientRect()
					var nodeWidth = boundingBox.right - boundingBox.left;

					paper.node.style.height = newHeight + 'px';
					paper.node.setAttribute('viewBox', '0 0 ' + nodeWidth + ' ' + newHeight);
				}

				var paper = this;
				var areaGraph = paper.group();

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

				var gridLines = paper.gridLines(startX, startY, yAxis.startPoints, width, 'horizontal');

				var tooltipObject;
				var graphContent = paper.group();
				var hoverAreas = paper.group();

				var keyObject;
				var key;

				var keyColumns = 3;
				var keyColumnWidth = (width - Config.KEY_SIDE_PADDING) / 4;


				populateGraph();

				areaGraph.append(yAxis);
				areaGraph.append(xAxis);
				areaGraph.append(gridLines);
				areaGraph.append(graphContent);

				return areaGraph;
			};
		});
	});

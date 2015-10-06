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
			 * line graph plugin
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
					for (var seriesIndex = 0; seriesIndex < data.numberOfSeries; seriesIndex++) {
						paths.push([]);
					}
					
					var dotElements = [];

					var tracker;
					if (data.numberOfSeries > 1) {
						tracker = generateXTracker(colorClasses, data.keys);
					}

					var drawDots = (width / data.rows.length > Config.MINIMUM_SPACE_PER_DOT);
					
					var annotations = paper.group();
					
					data.rows.forEach(function(dataItem, xValue) {
						var alignedDots = [];
						var xPixel = xScale.getPixel(xValue);
						
						if (! dataItem.isFill) {
							for (var seriesIndex = 0; seriesIndex < dataItem.ySeries.length; seriesIndex++) {
								if (dataItem.ySeries[seriesIndex] === null) continue;
								
								var yPixel = yScale.getPixel(dataItem.ySeries[seriesIndex].value);
								
								paths[seriesIndex].push({
									x: xPixel,
									y: yPixel
								});
								
								if (drawDots) {
									var dot = drawDot(xPixel, yPixel);
									
									if (data.keys[seriesIndex].hasOwnProperty("colorOverride")) {
										dot.attr({ stroke: data.keys[seriesIndex].colorOverride });
									} else {
										dot.addClass(colorClasses[seriesIndex])
											.addClass('with-stroke');
									}
									dot.addClass('fm-line-stroke');
								}
									
								if (dataItem.ySeries[seriesIndex].annotation) {
									var annotationPosition;
									var annotationOrientation;
									if (dataItem.ySeries[seriesIndex].value > dataItem.averageYValue) {
										annotationPosition = yPixel - 20;
										annotationOrientation = 'top';
									} else {
										annotationPosition = yPixel + 20;
										annotationOrientation = 'bottom';
									}
									
									var tooltipObject = new Tooltip(paper, 'fm-line-tooltip fm-annotation', colorClasses[seriesIndex]);
									var tooltip = tooltipObject.render(dataItem.xLabel, dataItem.ySeries[seriesIndex].annotation).addClass('annotation');
									annotations.append(tooltip);
									
									if (data.keys[seriesIndex].hasOwnProperty("colorOverride")) {
										var tooltipElements = tooltip.node.querySelectorAll('rect');
										
										tooltipElements[0].style.fill = data.keys[seriesIndex].colorOverride;
										tooltip.node.querySelector('polygon').style.fill = data.keys[seriesIndex].colorOverride;
									}
				
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
					
					var lines = [];
					for (var seriesIndex = 0; seriesIndex < data.numberOfSeries; seriesIndex++) {
						var line = drawLine(paths[seriesIndex], options.smoothCurve);
						if (data.keys[seriesIndex].hasOwnProperty("colorOverride")) {
							line.attr({
								stroke: data.keys[seriesIndex].colorOverride,
								fill: "none"
							});
						} else {
							line.addClass(colorClasses[seriesIndex])
							line.addClass('with-stroke')
						}
						
						line.addClass('fm-line-stroke');
						lines.push(line);
					}
					
					lines.forEach(function(line) {
						graphContent.append(line);
					});
					
					dotElements.forEach(function(dot) {
						graphContent.append(dot);
					});
					
					if (hasPullout) {
						var pullout = drawPullout(
							xScale.getPixel(data.startPullout),
							yScale.start,
							xScale.getPixel(data.endPullout),
							yScale.end
						);
						
						graphContent.append(pullout);
					}
					
					graphContent.append(annotations);
					
					if (tracker) {
						graphContent.append(tracker.line);
						graphContent.append(tracker.label);
					}

					if (data.numberOfSeries > 1) {
						var keyValues  = data.keys.map(function(value, valueIndex) {
							var keyItem = {
								value: value.value
							}
							
							if (data.keys[valueIndex].hasOwnProperty("colorOverride")) keyItem.colorOverride = data.keys[valueIndex].colorOverride;
							
							return keyItem;

						})
					
						drawKey(keyValues);
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
						);
						
						if (data.keys[index].hasOwnProperty("colorOverride"))	{
							keyLED.attr({ fill: data.keys[index].colorOverride });
						} else {
							keyLED.addClass(colorClass);
						}

						hoverLabel.append(keyLED);
						
						var keyLabel = paper.text(
							Config.LABEL_LEFT_PADDING + Config.LABEL_INTERNAL_LINE_HEIGHT,
							verticalMiddle,
							labels[index].value + ":"
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
				
				function padNumber(number, targetSize) {
					var string = number + "";
					while (string.length < targetSize) {
						string = "0" + string;
					}
					
					return string;
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
						var tickLabel
						
						if (data.formatAs == "time") {
							var time = tickMark;
							
							var milliseconds = time % 1000;
							time -= milliseconds;
							time /= 1000;
							
							var seconds = time % 60;
							time -= seconds;
							time /= 60;
							
							var minutes = time % 60;
							time -= minutes;
							time /= 60;
							
							var hours = time
							
							tickLabel = hours + ":" + padNumber(minutes, 2);
							
							if (data.formatDetail.seconds) {
								tickLabel += ":" + padNumber(seconds, 2);
							}
							
							if (data.formatDetail.milliseconds) {
								tickLabel += ":" + padNumber(milliseconds, 3);
							}
						} else {
							tickLabel = prefix + NumberUtils.renderValue(tickMark) + suffix;
						}
						
						return {
							position: tickMark,
							label: tickLabel
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
					if (options.showAllTicks === "true" || options.showAllTicks === true) {
						numberOfTicks = tickLabels.length;
					}
					
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
				 * Draw a dot on the line graph
				 * @param {Number} x
				 * @param {Number} y
				 */
				function drawDot(xPixel, yPixel) {

					return paper.circle(xPixel, yPixel, Config.DOT_SIZE)
						.hover(function() {
							this.attr({fill: 'none'});
							this.addClass('tint-2');
						}, function() {
							this.attr({fill: '#fff'});
							this.removeClass('tint-2');
						})
							.addClass('fm-line-dot').addClass('fm-white-fill');
				}
				
				/**
				 * Draw a line on the line graph
				 * @param {Array} an array of objects with x,y properties
				 * @param {Boolean} should the line be smoothed?
				 */
				function drawLine(path, smooth) {
					if (smooth) {
						return drawSmoothLine(path);
					} else {
						return drawStraightLine(path);
					}
				}
				
				function drawStraightLine(path) {
					var points = [];
					
					path.forEach(function(point) {
						points.push(point.x);
						points.push(point.y);	
					});
					
					return paper.polyline(points).addClass('no-fill');
				}
				
				function drawSmoothLine(path) {
					return paper.path(path.reduce(function(pathString, point) {
						return pathString + " " + point.x + " " + point.y;
					}, "M " + path[0].x + " " + path[0].y + " R")).addClass('no-fill');
				}
				
				function drawPullout(x1, y1, x2, y2) {
					var pullout = paper.group();
					
					pullout.append(paper.rect(x1, y1, x2 - x1, y2 - y1));
					pullout.append(paper.line(x1, y1, x1, y2));
					pullout.append(paper.line(x2, y1, x2, y2));
					
					return pullout.addClass('fm-pullout');
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
										if (datum.ySeries[index]) {
											textualValue = datum.ySeries[index].text
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
									dot.addClass('tint-2');	
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
								dot.removeClass('tint-2');	
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

					tooltipObject = new Tooltip(paper, 'fm-line-tooltip', colorClasses[0]);
					var tooltip = tooltipObject.render(
						datum.xLabel, [{
							title: data.keys[0].value,
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
				 * Draw a key entry for the pullout section
				 */
				function drawPulloutKey(key, pulloutTitle) {
					var keyItems = key.select('.fm-key-items');
					var keyItemsBBox = keyItems.getBBox();

					var pullOutIndicatorSize = 15;
					var pullOutKeyItemXPosition = keyItemsBBox.x + keyItemsBBox.width + (width - keyItemsBBox.width - Config.KEY_PADDING_LEFT) / 2;
					var pullOutKeyItemYPosition = keyItemsBBox.y + (keyItemsBBox.height / 2) - pullOutIndicatorSize / 2;

					var pullOutKeyItem = paper.group();

					var pullOutIndicator = paper.rect(
						pullOutKeyItemXPosition,
						pullOutKeyItemYPosition,
						pullOutIndicatorSize,
						pullOutIndicatorSize
					);

					pullOutKeyItem.append(pullOutIndicator);

					var pullOutKeyLabel = paper.text(
						pullOutKeyItemXPosition + pullOutIndicatorSize + Config.KEY_TEXT_SPACING * 2,
						pullOutKeyItemYPosition + pullOutIndicatorSize / 2,
						pulloutTitle
					);

					pullOutKeyItem.append(pullOutKeyLabel);

					pullOutKeyItem.transform('t-' + pullOutKeyItem.getBBox().width / 2 + ' 0');
					pullOutKeyItem.addClass('fm-pull-out-key-item');
					
					return pullOutKeyItem;
				}

				/**
				 * Draw a key to the canvas
				 */
				function drawKey(values) {
					if (width >= 250) {
					
						var xAxisBBox = xAxis.getBBox();
						var keyStartX = startX;
						var keyStartY = xAxisBBox.y + xAxisBBox.height + Config.KEY_TOP_MARGIN;
						
						var numberOfColumns = Math.min(values.length, Math.round(width / Config.TARGET_KEY_COLUMN_WIDTH));
						if (numberOfColumns === 0) {
							numberOfColumns = 1;
						}
						var columnWidth = width / (numberOfColumns + Config.KEY_COLUMN_PADDING_RATIO) - Config.KEY_SIDE_PADDING;

						keyObject = new ScatterKey(
							paper,
							keyStartX,
							keyStartY,
							width,
							numberOfColumns,
							columnWidth,
							! hasPullout,
							values.map(function(value) { return value.value }),
							Config.KEY_MAX_VALUES,
							Config.KEY_MAX_VALUE_LENGTH
						);
						key = keyObject.render();
						
						if (hasPullout) {
							drawPulloutKey(key, options.pulloutTitle);
						}
						
						var keyEntryGroups = key.node.querySelectorAll(".fm-key-items > g");
						for (var entryNumber = 0; entryNumber < keyEntryGroups.length; entryNumber++) {
							if (values[entryNumber].colorOverride) {
								var keyEntryRect = keyEntryGroups[entryNumber].querySelector("rect");
								keyEntryRect.setAttribute("fill", values[entryNumber].colorOverride);
								keyEntryRect.className.baseVal = "";
							}
						}
	
						var keyBBox = key.node.getBBox();
						resizeViewBox(keyBBox.y + keyBBox.height);
					}
				}

				/**
				 * Resize the SVG viewbox to a given value
				 */
				function resizeViewBox(newHeight) {
					paper.node.style.height = newHeight + 'px';
					paper.node.setAttribute('viewBox', '0 0 ' + (width + yAxisOverflow) + ' ' + newHeight);
				}

				var paper = this;
				var lineGraph = paper.group();

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

				var xAxisLineWidth = width; 

				var gridLines = paper.gridLines(startX, startY, yAxis.startPoints, xAxisLineWidth, 'horizontal');

				var tooltipObject;
				var graphContent = paper.group();
				var hoverAreas = paper.group();

				var keyObject;
				var key;
				
				var hasPullout = data.startPullout >= 0 && data.endPullout >= 1 && options.pulloutTitle;

				populateGraph();

				lineGraph.append(yAxis);
				lineGraph.append(xAxis);
				lineGraph.append(gridLines);
				lineGraph.append(graphContent);

				var lineGraphBBox = lineGraph.getBBox();
/*
				var yOverflow = startY - lineGraphBBox.y;
				lineGraph.transform('t 0 ' + yOverflow);
*/
				return lineGraph;
			};
		});
	});

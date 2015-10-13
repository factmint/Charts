define([
		'snap',
		'config',
		'scale-utils',
		'color-utils',
		'number-utils',
		'axis',
		'grid-lines',
		'key',
		'column',
		'bar',
		'utilities'
	],
	function(
		Snap,
		Config,
		ScaleUtils,
		Color,
		NumberUtils,
		axis,
		gridLines,
		Key,
		Column,
		Bar,
		Utils
	) {

		return Snap.plugin(function(Snap, Element, Paper) {
			
			function drawColumnChart(paper, xOrigin, yOrigin, width, height, data, maxTotal, colorClasses, options, squeeze) {

				var prefix = (options.valuePrefix) ? options.valuePrefix : '';
				var suffix = (options.valueSuffix) ? options.valueSuffix : '';
			
				var rangeTickMarks = ScaleUtils.getTickMarks(0, maxTotal, Config.TARGET_MARKER_COUNT, false);
				var firstRangeTickMark = rangeTickMarks[0];
				var lastRangeTickMark = rangeTickMarks[rangeTickMarks.length - 1];
				
				var rangeScale = new ScaleUtils.Scale(yOrigin + height - Config.BOTTOM_PADDING, -(yOrigin + height - Config.TOP_PADDING - Config.BOTTOM_PADDING), firstRangeTickMark, lastRangeTickMark);
				var rangeAxis = Column.drawYRangeAxis(paper, xOrigin + Config.LEFT_PADDING, width - xOrigin - Config.LEFT_PADDING - Config.RIGHT_PADDING, rangeScale, rangeTickMarks, prefix, suffix, options.axisLabel);

				var labelTickMarks = data.labels.map(function(value, tickLabelIndex) {
					return {
						position: tickLabelIndex,
						label: value
					}
				});
				
				var xAxisXOrigin = rangeAxis.getBBox().x2 + Config.LABEL_AXIS_PADDING;
				var xAxisWidth = width - xAxisXOrigin - Config.RIGHT_PADDING;

				// See wiki for explanation of the following equations
				var groupPaddingDenominator = (Config.GROUP_WIDTH_TO_PADDING_RATIO * Config.GROUP_PADDING_TO_BAR_PADDING_RATIO + 1 - data.series.length);
				var datumThickness = (xAxisWidth - 2 * Config.LABEL_AXIS_PADDING) * groupPaddingDenominator /
									 (data.rows.length * data.series.length * Config.GROUP_PADDING_TO_BAR_PADDING_RATIO * (Config.GROUP_WIDTH_TO_PADDING_RATIO + 2));
				var groupPadding = (datumThickness * data.series.length * Config.GROUP_PADDING_TO_BAR_PADDING_RATIO) / groupPaddingDenominator;
				var datumSpacing = groupPadding / Config.GROUP_PADDING_TO_BAR_PADDING_RATIO;

				var groupThickness = data.series.length * datumThickness + (data.series.length - 1) * datumSpacing;
				
				var forceDropAxis = false;
				var xLabels = data.labels.map(function(label, index) {
					var invertPosition = false;
					
					var allNegative = true;
					data.rows[index].values.forEach(function(datum) {
						if (datum.value < 0) {
							invertPosition = true;
						} else {
							allNegative = false;
						}
					});
					
					if (invertPosition && ! allNegative) {
						forceDropAxis = true;
					}
					
					var pulledOut = data.rows[index].pullout;
					
					return {
						text: label,
						invertPosition: invertPosition,
						pulledOut: pulledOut
					};
				});
				
				var dropAxis = (forceDropAxis || Utils.getNegativeProportion(firstRangeTickMark, lastRangeTickMark) < Config.NEGATIVE_PROPORTION_STICKY_LABELS_LIMIT);
				
				var yZeroPosition;
				if (dropAxis) {
					xLabels.forEach(function(label) {
						label.invertPosition = false;	
					});
					yZeroPosition = rangeScale.start;
				} else {
					yZeroPosition = rangeScale.getPixel(0);
				}
				
				var labelAxis = Column.drawXLabelAxis(paper, xAxisXOrigin, yZeroPosition, xAxisWidth, xLabels, groupThickness, groupPadding, squeeze);
				
				var columns = Column.drawColumns(
					paper,
					xAxisXOrigin,
					data,
					groupPadding,
					groupThickness,
					datumSpacing,
					rangeScale,
					colorClasses,
					prefix,
					suffix,
					labelAxis.getBBox().cx
				);
				
				if (data.series.length > 1 || options.pulloutTitle) {
					var keyEntries = data.series.map(function(entry, entryIndex) {
						var keyItem = {
							value: entry.title
						};
						
						if (data.series[entryIndex].hasOwnProperty("colorOverride")) keyItem.colorOverride = data.series[entryIndex].colorOverride;
					
						return keyItem;
					});
					
					var bottomOfChart = Math.max(labelAxis.getBBox().y2, rangeScale.start);
					
					var key = Utils.drawKey(paper, xAxisXOrigin, bottomOfChart + Config.KEY_MARGIN_TOP, xAxisWidth, Config.TARGET_KEY_COLUMN_WIDTH, keyEntries, colorClasses, options.pulloutTitle);
					var canvasHeight = key.getBBox().y2;
				
					var boundingBox = paper.node.getBoundingClientRect();
					var nodeWidth = boundingBox.right - boundingBox.left;
					
					paper.node.setAttribute('viewBox', '0 0 ' + nodeWidth + ' ' + canvasHeight);
					paper.node.style.height = canvasHeight + 'px';
				}
			}
			
			function invertForYDirection(data) {
				data.rows.reverse();
				data.labels.reverse();
				data.series.reverse();
				data.rows.forEach(function(row) {
					row.values.reverse();	
				});
			}
			
			function drawBarChart(paper, xOrigin, yOrigin, width, height, data, maxTotal, colorClasses, options) {
				
				invertForYDirection(data);
				
				var prefix = (options.valuePrefix) ? options.valuePrefix : '';
				var suffix = (options.valueSuffix) ? options.valueSuffix : '';

                var datumThickness = Config.BAR_GROUP_TARGET_THICKNESS;
                
				var datumSpacing = Config.BAR_SPACING;
				var groupPadding = datumThickness / Config.BAR_GROUP_WIDTH_TO_PADDING_RATIO;
				
				var chartHeight = data.rows.length * (datumThickness + 2 * groupPadding) + Config.LABEL_AXIS_PADDING * 2;
				
				var labels = data.labels.map(function(label, index) {
					var pulledOut = data.rows[index].pullout;
					
					return {
						text: label,
						pulledOut: pulledOut
					};
				});
				
				var labelAxis = Bar.drawYLabelAxis(paper, xOrigin + Config.LEFT_PADDING, yOrigin + Config.TOP_PADDING + chartHeight, chartHeight, labels, datumThickness, groupPadding, prefix, suffix);
				
				var rangeTickMarks = ScaleUtils.getTickMarks(0, maxTotal, Config.TARGET_MARKER_COUNT, false);
				
				var xAxisXOrigin = labelAxis.getBBox().x2 + Config.TICK_MARK_HORIZONTAL_PADDING;
				
				var dummyLastRangeLabel = paper.group().append(paper.text(0, 0, NumberUtils.renderValue(maxTotal))).addClass("fm-tick-mark");
				var dummyLastRangeLabelWidth = dummyLastRangeLabel.getBBox().width;
				dummyLastRangeLabel.remove();
				
				var rangeScale = new ScaleUtils.Scale(xAxisXOrigin, width - Config.RIGHT_PADDING - xAxisXOrigin - dummyLastRangeLabelWidth / 2, rangeTickMarks[0], rangeTickMarks[rangeTickMarks.length - 1]);
				var rangeAxis = Bar.drawXRangeAxis(paper, yOrigin + Config.TOP_PADDING + chartHeight, chartHeight, rangeScale, rangeTickMarks, prefix, suffix, options.axisLabel);
				
				var bars = Bar.drawBars(
					paper,
					yOrigin + Config.TOP_PADDING + chartHeight - datumThickness,
					data,
					groupPadding,
					datumThickness,
					datumSpacing,
					rangeScale,
					colorClasses,
					prefix,
					suffix,
					rangeScale.start + Config.BAR_TOOLTIP_X_PADDING,
					rangeAxis.getBBox().y
				);
				
				var canvasHeight = rangeAxis.getBBox().y2 + Config.BOTTOM_PADDING;
				
				if (data.series.length > 1 || options.pulloutTitle) {
					var keyEntries = data.series.map(function(entry, entryIndex) {
						var keyItem = {
							value: entry.title
						};
						
						if (data.series[entryIndex].hasOwnProperty("colorOverride")) keyItem.colorOverride = data.series[entryIndex].colorOverride;
					
						return keyItem;
					});
					
					var keyXOrigin = rangeScale.start;
					var keyWidth = rangeScale.end - rangeScale.start;
					
					if (keyWidth < Config.KEY_MIN_WIDTH_FOR_AXIS_ALIGNMENT) {
						keyWidth = width;
						keyXOrigin = xOrigin;
					}
					
					var key = Utils.drawKey(paper, keyXOrigin, canvasHeight + Config.KEY_MARGIN_TOP, keyWidth, Config.TARGET_KEY_COLUMN_WIDTH, keyEntries, colorClasses, options.pulloutTitle);
					canvasHeight = key.getBBox().y2;
					
					paper.prepend(key);
				}
				
				var boundingBox = paper.node.getBoundingClientRect();
				var nodeWidth = boundingBox.right - boundingBox.left;
				
		
				paper.node.setAttribute('viewBox', '0 0 ' + nodeWidth + ' ' + canvasHeight);
				paper.node.style.height = canvasHeight + 'px';
				
				
			}
			
			function getColorClasses(data) {
				var colorClassOffset;
                if (data.series.length > 3 || data.series.length === 1) {
                    colorClassOffset = 5;
                } else {
                    colorClassOffset = 4;
                }

                return Color.lowContrast(data.series.length, colorClassOffset);
			}
			
			function addTintData(data) {
                var tint = 0;

				var sortedRows = data.rows.concat().sort(function(a, b) {
                    return b.values[0].value - a.values[0].value;
                }).forEach(function(row, index, array) {
                	var last = array[index - 1];
                	if (
                		index !== 0 &&
                		row.values[0].value / last.values[0].value < Config.SHARED_TINT_MINIMUM_RATIO &&
                		tint < 9
                	) {
                		tint++;
                	}
                	
                	row.tintClass = 'tint-' + tint;
                });
			}

			/**
			 * Column/bar chart plugin
			 * @param {Number} startX
			 * @param {Number} startY
			 * @param {Number} width
			 * @param {Number} height
			 * @param {Object} data
			 * @param {Object} options
			 */
			Paper.prototype.chart = function(startX, startY, width, height, data, options) {
			
				var paper = this;
				
				if (! Utils.straddlesZero(data.range)) {
					if (data.range.min <= data.range.max) {
						data.range.min = 0;
					} else {
						data.range.max = 0;
					}
				}
				
				var colorClasses = getColorClasses(data);
                
                if (data.series.length === 1) {
                	addTintData(data);
                }
				
				var labelWidth = Utils.calculateTotalLabelsLength(data.labels, paper);
				var labelDensity = width / labelWidth.target;
				var squeezedLabelDensity = width / labelWidth.squeezed;
				
				var columnChart = (labelDensity > Config.MAX_LABEL_DENSITY);
				var squeezedColumn = (! columnChart && squeezedLabelDensity > Config.MAX_LABEL_DENSITY);
				
				var maxTotal = Math.max.apply(Math, data.rows.map(function(row) { return row.total }));
				
				if (columnChart || squeezedColumn) {
					drawColumnChart(paper, startX, startY, width, height, data, maxTotal, colorClasses, options, squeezedColumn);
				} else {
					drawBarChart(paper, startX, startY, width, height, data, maxTotal, colorClasses, options);
				}
				
				var background = paper.rect(
					startX,
					startY,
					width,
					height
				);
				background.attr({
					"opacity": "0"
				});
				
				background.click(function() {
					if (paper.tooltipObject) {
						paper.tooltipObject.remove();
						paper.tooltipObject = null;
					}
				});
				
				this.prepend(background);
				
			};
		});
	});

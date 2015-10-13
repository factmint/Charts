define([
		'snap',
		'config',
		'scale-utils',
		'number-utils',
		'axis',
		'utilities',
		'tooltip'
	],
	function(
		Snap,
		Config,
		ScaleUtils,
		NumberUtils,
		axis,
		Utils,
		Tooltip
	) {
		
		function applyTooltipHandler(paper, column, xPosition, yPosition, direction, title, total, labels, values, group) {
			var tooltipObject = null;
			
			column.hover(
				function() {
					if (tooltipObject === null) {
						tooltipObject = Utils.createTooltip(
							paper,
							xPosition,
							yPosition,
							direction,
							title,
							total,
							labels,
							values,
							group
						);
					}
					
		            tooltipObject.show();
				},
				function() {
					tooltipObject.hide();
				}
			);
		}
		
		var drawYRangeAxis = function(paper, xOrigin, width, rangeScale, tickMarks, prefix, suffix, label) {
			tickMarks = tickMarks.map(function(tickMark) {
				var numberValue = NumberUtils.renderValue(Math.abs(tickMark));
				var sign = (tickMark < 0) ? '-' : '';
				
				return {
					position: tickMark,
					label: sign + prefix + numberValue + suffix
				};
			});

			var axis = paper.axis(
				xOrigin,
				rangeScale.start,
				rangeScale,
				tickMarks,
				width,
				'vertical',
				label,
				false,
				'first'
			)
				.addClass('fm-axis');
			
			axis.transform('translate(' + axis.getBBox().width + ',0)');
			
			var gridLines = paper.group();
			var gridLineXOrigin = axis.getBBox().x2 + Config.LABEL_AXIS_PADDING;
			var gridLineXEnd = xOrigin + width;
			
			tickMarks.forEach(function(tickMark) {
				var gridLineY = rangeScale.getPixel(tickMark.position);
				var gridLine = paper.line(gridLineXOrigin, gridLineY, gridLineXEnd, gridLineY);
				
				if (tickMark.position === 0) {
					gridLine.addClass('fm-major-grid-line');
				} else {
					gridLine.addClass('fm-minor-grid-line');
				}
				
				gridLines.append(gridLine);
			});
			
			return axis;
		};

		var drawXLabelAxis = function(paper, xOrigin, yOrigin, width, labels, groupThickness, groupPadding, squeeze) {
			var axis = paper.group().addClass('fm-axis');
			
			var xTracker = xOrigin + Config.LABEL_AXIS_PADDING + groupPadding + groupThickness / 2;
			labels.forEach(function(label) {
				var yPosition = (label.invertPosition) ? yOrigin - Config.TICK_MARK_VERTICAL_PADDING : yOrigin + Config.TICK_MARK_VERTICAL_PADDING;
				var labelElement = paper.text(xTracker, yPosition, label.text);
				
				if (squeeze) {
					labelElement.addClass('fm-squeezed-label');
				}
				
				if (label.invertPosition) {
					labelElement.addClass('fm-inverted-axis-label');
				} else {
					labelElement.addClass('fm-axis-label');
				}
				
				if (label.pulledOut) {
					labelElement.addClass('fm-pulled-out-label');
				}
				
				if (Utils.isIE()) {
	            	labelElement.attr({ 'dy': '0.5em' });
	            }
				
				axis.append(labelElement);
				
				xTracker += groupPadding * 2 + groupThickness;
			});
			
			return axis;
		};
			
		var drawColumns = function(
			paper,
			xOrigin,
			data,
			groupPadding,
			datumThickness,
			datumSpacing,
			rangeScale,
			colorClasses,
			prefix,
			suffix,
			xAxisMidpoint
		) {
			var yOrigin = rangeScale.getPixel(0);
			
			var pullouts = paper.group();
			var columns = paper.group();
			var tooltips = paper.group();
			
			var xPosition = xOrigin + Config.LABEL_AXIS_PADDING;

			data.rows.forEach(function(row, rowIndex) {
				if (row.pullout) {
					var pulloutWidth = groupPadding * 2 + datumThickness;
					var pullout = Utils.drawPullout(paper, xPosition, rangeScale.end, pulloutWidth, rangeScale.start - rangeScale.end);
					pullouts.append(pullout);
				}
				
				var columnGroup = paper.group().addClass("fm-stacked-column");
				
				xPosition += groupPadding;
				
				var heightSoFar = 0;

				data.series.forEach(function(series, seriesIndex) {

					if (row.values[seriesIndex]) {
						var yPosition = rangeScale.getPixel(row.values[seriesIndex].value);

						var yStart = yPosition;
						var height = yOrigin - yPosition;
						
						if (height < 0) {
							height *= -1;
							yStart = yOrigin;
						}
						
						var column = paper.rect(xPosition, yStart - heightSoFar, datumThickness, height)
							.addClass('fm-column-bar-datum');
						
						columnGroup.append(column);
						
						if (data.series.length > 1) {
							if (series.hasOwnProperty("colorOverride")) {
								column.attr({ fill: series.colorOverride});
							} else {
								column.addClass(colorClasses[seriesIndex]);
							}
						} else {
							if (row.hasOwnProperty("colorOverride")) {
								column.attr({ fill: row.colorOverride });
							} else {
								column.addClass(colorClasses[seriesIndex]);
							}
						}
						
						if (row.tintClass) {
							column.addClass(row.tintClass);
						}
						
						var numberValue = row.values[seriesIndex].value;
						var sign = (numberValue < 0) ? '-' : '';
						var value = sign + prefix + NumberUtils.renderValue(Math.abs(numberValue)) + suffix;
						
						heightSoFar += height;
					}
					
				});
				
				var columnBBox = columnGroup.getBBox();
				
				var tooltipPosition;
				var tooltipXPosition;
				
				if (columnBBox.cx > xAxisMidpoint) {
					tooltipXPosition = xPosition;
					tooltipPosition = 'left';
				} else {
					tooltipXPosition = xPosition + datumThickness;
					tooltipPosition = 'right';
				}
				
				var tooltipYPosition = columnBBox.y;
				
				applyTooltipHandler(
					paper,
					columnGroup,
					tooltipXPosition,
					tooltipYPosition,
					tooltipPosition,
					row.title,
					NumberUtils.renderValue(row.total),
					data.series,
					row.values.map(function(value) {
						return {
							value: NumberUtils.renderValue(value.value)
						};
					}),
					tooltips
				);

				columns.append(columnGroup);
				
				xPosition += groupPadding + datumThickness;
			});
			
			columns.append(tooltips);
			
			return columns;
		};
		
		return {
			drawYRangeAxis: drawYRangeAxis,
			drawXLabelAxis: drawXLabelAxis,
			drawColumns: drawColumns
		};
	});
define([
		'snap',
		'config',
		'scale-utils',
		'number-utils',
		'axis',
		'columnBarUtils'
	],
	function(
		Snap,
		Config,
		ScaleUtils,
		NumberUtils,
		axis,
		Utils
	) {
		
		function applyTooltipHandler(paper, bar, yPosition, direction, label, value, group) {
			var tooltipObject = null;
			
			bar.hover(
				function() {
					if (tooltipObject === null) {
						tooltipObject = Utils.createTooltip(paper, bar.getBBox().cx, yPosition, direction, label, value, group);
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
			
		var drawColumns = function(paper, xOrigin, data, groupPadding, datumThickness, datumSpacing, rangeScale, colorClasses, prefix, suffix) {
			var yOrigin = rangeScale.getPixel(0);
			
			var pullouts = paper.group();
			var columns = paper.group();
			var tooltips = paper.group();
			
			var xTracker = xOrigin + Config.LABEL_AXIS_PADDING;
			data.rows.forEach(function(row) {
				if (row.pullout) {
					var pulloutWidth = groupPadding * 2 + datumThickness * data.series.length + datumSpacing * (data.series.length - 1);
					var pullout = Utils.drawPullout(paper, xTracker, rangeScale.end, pulloutWidth, rangeScale.start - rangeScale.end);
					pullouts.append(pullout);
				}
				
				xTracker += groupPadding;
				
				data.series.forEach(function(series, seriesIndex) {
					if (seriesIndex !== 0) {
						xTracker += datumSpacing;
					}
					
					if (row.values[seriesIndex]) {
						var tooltipPosition = 'top';

						var yPosition = rangeScale.getPixel(row.values[seriesIndex].value);
						
						var yStart = yPosition;
						var height = yOrigin - yPosition;
						if (height < 0) {
							height *= -1;
							yStart = yOrigin;
							
							tooltipPosition = 'bottom';
						}
						
						var column = paper.rect(xTracker, yStart, datumThickness, height)
							.addClass('fm-column-bar-datum');
							
						if (data.series.length > 1) {
							if (series.hasOwnProperty("colorOverride")) {
								column.attr({ fill: series.colorOverride})
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
						var value = sign + prefix + Math.abs(numberValue) + suffix;
						
						applyTooltipHandler(paper, column, yPosition, tooltipPosition, series.title, value, tooltips);
						columns.append(column);
					}
					
					xTracker += datumThickness;
				});
				
				xTracker += groupPadding;
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
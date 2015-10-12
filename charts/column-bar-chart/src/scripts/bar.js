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
		
		function applyTooltipHandler(paper, bar, xPosition, direction, label, value, group) {
			var tooltipObject = null;
			
			bar.hover(
				function() {
					if (tooltipObject === null) {
						var barBBox = bar.getBBox();
						tooltipObject = Utils.createTooltip(paper, xPosition, barBBox.cy, direction, label, value, group);

						var paperBoundingRect = paper.node.getBoundingClientRect();
						var labelBBox = tooltipObject.snapElement.getBBox();

						if (labelBBox.x2 === 0 || labelBBox.width === 0) {
							tooltipObject.show();
							
							labelBBox = tooltipObject.snapElement.getBBox();
							
							tooltipObject.hide();
						}
						
						if (labelBBox.x2 > paperBoundingRect.width || labelBBox.x < 0) {
							if (barBBox.cy > paperBoundingRect.height / 2) {
								tooltipObject = Utils.createTooltip(paper, barBBox.cx, barBBox.y, "top", label, value, group);
							} else {
								tooltipObject = Utils.createTooltip(paper, barBBox.cx, barBBox.y2, "bottom", label, value, group);
							}
						}
					}
					
		            tooltipObject.show();
				},
				function() {
					tooltipObject.hide();
				}
			);
		}
		
		var drawXRangeAxis = function(paper, yOrigin, height, rangeScale, tickMarks, prefix, suffix, label) {
			tickMarks = tickMarks.map(function(tickMark) {
				var numberValue = NumberUtils.renderValue(Math.abs(tickMark));
				var sign = (tickMark < 0) ? '-' : '';
				
				return {
					position: tickMark,
					label: sign + prefix + numberValue + suffix
				};
			});

			var axis = paper.axis(
				rangeScale.start,
				yOrigin,
				rangeScale,
				tickMarks,
				0,
				'horizontal',
				label,
				false,
				'last'
			)
				.addClass('fm-axis');
			
			var gridLines = paper.group();
			var gridLineYEnd = yOrigin - height;
			
			tickMarks.forEach(function(tickMark) {
				var gridLineX = rangeScale.getPixel(tickMark.position);
				var gridLine = paper.line(gridLineX, yOrigin, gridLineX, gridLineYEnd);
				
				if (tickMark.position === 0) {
					gridLine.addClass('fm-major-grid-line');
				} else {
					gridLine.addClass('fm-minor-grid-line');
				}
				
				gridLines.append(gridLine);
			});
			
			return axis;
		};

		var drawYLabelAxis = function(paper, xOrigin, yOrigin, height, labels, groupThickness, groupPadding, prefix, suffix) {
			var axis = paper.group().addClass('fm-axis').addClass('fm-y-axis');
			
			var yTracker = yOrigin - Config.LABEL_AXIS_PADDING - groupPadding - groupThickness / 2;
			labels.forEach(function(label) {
				var labelElement = paper.text(xOrigin, yTracker, label.text).addClass('fm-axis-label').attr('text-anchor', 'end');
				axis.append(labelElement);
				
				if (label.pulledOut) {
					labelElement.addClass('fm-pulled-out-label');
				}
				
				if (Utils.isIE()) {
	            	labelElement.attr({ 'dy': '0.5em' });
	            }
				
				yTracker -= groupPadding * 2 + groupThickness;
			});
			
			axis.transform('translate(' + axis.getBBox().width + ',0)');
			
			return axis;
		};
			
		var drawBars = function(paper, yOrigin, data, groupPadding, datumThickness, datumSpacing, rangeScale, colorClasses, prefix, suffix) {
			var xOrigin = rangeScale.getPixel(0);

			var pullouts = paper.group();
			var bars = paper.group();
			var tooltips = paper.group();
			
			var yTracker = yOrigin - Config.LABEL_AXIS_PADDING;
			data.rows.forEach(function(row) {
				if (row.pullout) {
					var pulloutHeight = groupPadding * 2 + datumThickness * data.series.length + datumSpacing * (data.series.length - 1);
					var pullout = Utils.drawPullout(paper, rangeScale.start, yTracker - pulloutHeight, rangeScale.end - rangeScale.start, pulloutHeight);
					pullouts.append(pullout);
				}
				
				yTracker -= groupPadding;
				
				data.series.forEach(function(series, seriesIndex) {
					if (seriesIndex > 0) {
						yTracker -= datumSpacing;
					}
					
					yTracker -= datumThickness;
					
					if (row.values[seriesIndex]) {
						var tooltipPosition = 'right';
						
						var xPosition = rangeScale.getPixel(row.values[seriesIndex].value);

						var xStart = xOrigin;
						var width = xPosition - xOrigin;
						if (width < 0) {
							width *= -1;
							xStart -= width;
							
							tooltipPosition = 'left';
						}
						
						var bar = paper.rect(xStart, yTracker, width, datumThickness)
							.addClass('fm-column-bar-datum')

						if (data.series.length > 1) {
							if (series.hasOwnProperty("colorOverride")) {
								bar.attr({ fill: series.colorOverride})
							} else {
								bar.addClass(colorClasses[seriesIndex]);
							}
						} else {
							if (row.hasOwnProperty("colorOverride")) {
								bar.attr({ fill: row.colorOverride });
							} else {
								bar.addClass(colorClasses[seriesIndex]);
							}
						}
						
						if (row.tintClass) {
							bar.addClass(row.tintClass);
						}
						
						var numberValue = row.values[seriesIndex].value;
						var sign = (numberValue < 0) ? '-' : '';
						var value = sign + prefix + Math.abs(numberValue) + suffix;
						
						applyTooltipHandler(paper, bar, xPosition, tooltipPosition, series.title, value, tooltips);
						bars.append(bar);
					}
				});
				
				yTracker -= groupPadding;
			});
			
			bars.append(tooltips);
			
			return bars;
		};
		
		return {
			drawXRangeAxis: drawXRangeAxis,
			drawYLabelAxis: drawYLabelAxis,
			drawBars: drawBars
		};
	});
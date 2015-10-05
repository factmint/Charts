define([
		'snap',
		'config',
		'scale-utils',
		'number-utils',
		'axis',
		'utilities'
	],
	function(
		Snap,
		Config,
		ScaleUtils,
		NumberUtils,
		axis,
		Utils
	) {
		
		function applyTooltipHandler(paper, bar, xPosition, yPosition, direction, title, total, labels, values, group) {
			bar.click(
				function() {
					if (paper.tooltipObject) {
						paper.tooltipObject.remove();
					}
					
					var barBBox = bar.getBBox();
					paper.tooltipObject = Utils.createTooltip(
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
					var paperBoundingRect = paper.node.getBoundingClientRect();
					var labelBBox = paper.tooltipObject.snapElement.getBBox();

					if (labelBBox.x2 === 0 || labelBBox.width === 0) {
						paper.tooltipObject.show();
						
						labelBBox = paper.tooltipObject.snapElement.getBBox();
						
						paper.tooltipObject.hide();
					}
					
					if (labelBBox.x2 > paperBoundingRect.width || labelBBox.x < 0) {
						if (barBBox.cy > paperBoundingRect.height / 2) {
							paper.tooltipObject = Utils.createTooltip(
								paper,
								xPosition,
								yPosition,
								"top",
								title,
								total,
								labels,
								values,
								group
							);
						} else {
							paper.tooltipObject = Utils.createTooltip(
								paper,
								xPosition,
								yPosition,
								"bottom",
								title,
								total,
								labels,
								values,
								group
							);
						}
					}
				
					paper.tooltipObject.show();
				});
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
			
			axis.append(gridLines);
			
			return axis;
		};

		var drawYLabelAxis = function(paper, xOrigin, yOrigin, height, labels, datumThickness, groupPadding, prefix, suffix) {
			var axis = paper.group().addClass('fm-axis').addClass('fm-y-axis');
			
			var yTracker = yOrigin - Config.LABEL_AXIS_PADDING - groupPadding - datumThickness / 2;
			labels.forEach(function(label) {
				var labelElement = paper.text(xOrigin, yTracker, label.text).addClass('fm-axis-label').attr('text-anchor', 'end');
				axis.append(labelElement);
				
				if (label.pulledOut) {
					labelElement.addClass('fm-pulled-out-label');
				}
				
				if (Utils.isIE()) {
	            	labelElement.attr({ 'dy': '0.5em' });
	            }
				
				yTracker -= groupPadding * 2 + datumThickness;
			});
			
			axis.transform('translate(' + axis.getBBox().width + ',0)');
			
			return axis;
		};
			
		var drawBars = function(
			paper,
			yOrigin,
			data,
			groupPadding,
			datumThickness,
			datumSpacing,
			rangeScale,
			colorClasses,
			prefix,
			suffix,
			tooltipXPosition,
			tooltipYPosition
		) {
			var xOrigin = rangeScale.getPixel(0);

			var pullouts = paper.group();
			var bars = paper.group();
			var tooltips = paper.group();
			
			var yPosition = yOrigin - Config.LABEL_AXIS_PADDING;

			data.rows.forEach(function(row) {
			/*	if (row.pullout) {
					var pulloutHeight = groupPadding * 2 + datumThickness * data.series.length + datumSpacing * (data.series.length - 1);
					var pullout = Utils.drawPullout(paper, rangeScale.start, yPosition - pulloutHeight, rangeScale.end - rangeScale.start, pulloutHeight);
					pullouts.append(pullout);
				}*/

				var barGroup = paper.group().addClass("fm-stacked-bar");
				
				yPosition -= groupPadding;
				
				var lengthSoFar = xOrigin;
				
				data.series.forEach(function(series, seriesIndex) {

					if (row.values[seriesIndex]) {
						var tooltipPosition = 'right';
						
						var xPosition = rangeScale.getPixel(row.values[seriesIndex].value);

						var xStart = lengthSoFar;
						var width = xPosition - xOrigin;
						if (width < 0) {
							width *= -1;
							xStart -= width;
							
							tooltipPosition = 'left';
						}
						
						var bar = paper.rect(xStart, yPosition, width, datumThickness)
							.addClass('fm-column-bar-datum');
							
						barGroup.append(bar);

						if (data.series.length > 1) {
							if (series.hasOwnProperty("colorOverride")) {
								bar.attr({ fill: series.colorOverride});
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
						var value = sign + prefix + NumberUtils.renderValue(Math.abs(numberValue)) + suffix;
						
						lengthSoFar += width;
					}
					
				});
				
				var barGroupBBox = barGroup.getBBox();
				
				applyTooltipHandler(
					paper,
					barGroup,
					tooltipXPosition,
					tooltipYPosition,
					"none",
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
				
				bars.append(barGroup);
		
				yPosition -= groupPadding + datumThickness;
				
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
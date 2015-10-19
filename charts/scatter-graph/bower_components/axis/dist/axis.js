define(['snap', 'tick-mark', 'number-utils'],
function(Snap,   tickMark,    NumberUtils) {
	return Snap.plugin(function(Snap, Element, Paper) {
		var PADDING = 10;
		var VERTICAL_TICK_PADDING = 10;

		var AXIS_LABEL_FONT_FAMILY = "'Lato', sans-serif";
		var AXIS_LABEL_FONT_WEIGHT = 400;
		var AXIS_LABEL_FONT_SIZE = 12;
		var AXIS_LABEL_PADDING = 25;

		Paper.prototype.axis = function(startX, startY, scale, tickMarkValues, tickMarkSize, orientation, label, includeLine, labelPosition) {
			var paper = this;
			var axis = paper.g();

			var tickMarks = this.g();
			var totalValues = tickMarks.length;
			axis.startPoints = [];

			if (orientation === 'horizontal') {
				tickMarkValues.forEach(function(tickMark) {
					if (typeof(tickMark) !== 'object') {
						tickMark = {
							position: tickMark,
							label: NumberUtils.renderValue(tickMark)
						}
					}
					var pixel = scale.getPixel(tickMark.position);
					axis.startPoints.push({
						x: pixel,
						y: startY
					});
					tickMarks.append(
						paper.tickMark(
							pixel,
							startY,
							'vertical',
							tickMarkSize,
							tickMark.label,
							VERTICAL_TICK_PADDING
						)
					);
				});

				if (includeLine) {
					var axisLine = paper.line(startX, startY, scale.end, startY)
						.addClass('fm-axis');
				}

				if (label) {
					var axisLabelYPosition;
	
					if (! labelPosition || labelPosition === 'last') {
						axisLabelYPosition = tickMarks.getBBox().y + tickMarks.getBBox().height + PADDING * 1.75;
					} else if (labelPosition === 'first') {
						axisLabelYPosition = tickMarks.getBBox().y - PADDING * 1.75;
					} else {
						console.error('Invalid axis label position specified.');
					}
	
					var axisLabel = paper.text(scale.middle, axisLabelYPosition, label)
						.addClass('fm-x-axis-label');
	
					axisLabel.attr({
						'font-family': AXIS_LABEL_FONT_FAMILY,
						'font-weight': AXIS_LABEL_FONT_WEIGHT,
						'font-size': AXIS_LABEL_FONT_SIZE,
						'text-anchor': 'middle'
					});
	
					axis.append(axisLabel);
				}
				
				axis.append(axisLine);
				axis.append(tickMarks);
			} else {
				tickMarkValues.forEach(function(tickMark) {
					if (typeof(tickMark) !== 'object') {
						tickMark = {
							position: tickMark,
							label: NumberUtils.renderValue(tickMark)
						}
					}
					var pixel = scale.getPixel(tickMark.position);

					axis.startPoints.push({
						x: startX,
						y: pixel
					});
					var newTickMark = paper.tickMark(
						startX,
						pixel,
						'horizontal',
						tickMarkSize,
						tickMark.label
					);
					tickMarks.append(newTickMark);
				});
				axis.append(tickMarks);

				var axisBBox = axis.getBBox();

				if (includeLine) {
					var axisLineStartPoint = axisBBox.x + axisBBox.width + 100;
					var axisLine = paper.line(startX, startY, startX, scale.end)
						.addClass('fm-axis');
					axis.append(axisLine);
				}

				if (label) {
					var axisLabel = paper.text(
						axisBBox.x - (AXIS_LABEL_FONT_SIZE / 2) - AXIS_LABEL_PADDING,
						scale.middle,
						label
					)
						.addClass('fm-y-axis-label');
	
					var axisLabelBBox = axisLabel.getBBox();
					axisLabel.attr({
						'font-family': AXIS_LABEL_FONT_FAMILY,
						'font-weight': AXIS_LABEL_FONT_WEIGHT,
						'font-size': AXIS_LABEL_FONT_SIZE,
						'text-anchor': 'middle'
					})
						.transform('r -90');
	
					axis.append(axisLabel);
				}
			}

			return axis;
		};
	});
});
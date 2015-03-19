define([
	'svg-js',
	'path'
], function(
	SVG,
	Path
) {

SVG.TwoSectionTooltipBackground = SVG.invent({
	create: 'path',

	inherit: SVG.Path,

	extend: {
		setConfiguration: function(configuration) {
			this.configuration = configuration;

			return this;
		}
	},

	construct: {
		twoSectionTooltipBackground: function(
			x,
			y,
			height,
			sectionOneWidth,
			sectionTwoWidth,
			arrowPosition
		) {

			configuration = {
				ARROW_HEIGHT: 10,
				ARROW_WIDTH: 7,
				BORDER_RADIUS: 5,
				GAP_SIZE: 2
			};

			var heightWithoutRoundedCorners = (height - configuration.BORDER_RADIUS * 2);

			var sectionOnePoints = [];
			var sectionTwoPoints = [];

			var segmentPathString;

			if (arrowPosition == "left" || arrowPosition == "right") {
			
				if (arrowPosition == "left") {
					sectionOnePoints.push({
						x: x + configuration.ARROW_WIDTH,
						y: y - 1/2 * configuration.ARROW_HEIGHT
					});
					sectionOnePoints.push({
						x: x + configuration.ARROW_WIDTH,
						y: y - 1/2 * heightWithoutRoundedCorners
					});
					sectionOnePoints.push({
						x: x + configuration.ARROW_WIDTH,
						y: y - 1/2 * height
					});
					sectionOnePoints.push({
						x: x + configuration.ARROW_WIDTH + configuration.BORDER_RADIUS,
						y: y - 1/2 * height
					});
					sectionOnePoints.push({
						x: x + configuration.ARROW_WIDTH + sectionOneWidth,
						y: y - 1/2 * height
					});
					sectionOnePoints.push({
						x: x + configuration.ARROW_WIDTH + sectionOneWidth,
						y: y + 1/2 * height
					});
					sectionOnePoints.push({
						x: x + configuration.ARROW_WIDTH + configuration.BORDER_RADIUS,
						y: y + 1/2 * height
					});
					sectionOnePoints.push({
						x: x + configuration.ARROW_WIDTH,
						y: y + 1/2 * height
					});
					sectionOnePoints.push({
						x: x + configuration.ARROW_WIDTH,
						y: y + 1/2 * heightWithoutRoundedCorners
					});
					sectionOnePoints.push({
						x: x + configuration.ARROW_WIDTH,
						y: y + 1/2 * configuration.ARROW_HEIGHT
					});

					var sectionTwoStartPoint = {
						x: x + configuration.ARROW_WIDTH + sectionOneWidth + configuration.GAP_SIZE,
						y: y - 1/2 * height
					};

					sectionTwoPoints.push({
						x: sectionTwoStartPoint.x,
						y: sectionTwoStartPoint.y
					});
					sectionTwoPoints.push({
						x: sectionTwoStartPoint.x + sectionTwoWidth - configuration.BORDER_RADIUS,
						y: sectionTwoStartPoint.y
					});
					sectionTwoPoints.push({
						x: sectionTwoStartPoint.x + sectionTwoWidth,
						y: sectionTwoStartPoint.y
					});
					sectionTwoPoints.push({
						x: sectionTwoStartPoint.x + sectionTwoWidth,
						y: y - 1/2 * heightWithoutRoundedCorners
					});
					sectionTwoPoints.push({
						x: sectionTwoStartPoint.x + sectionTwoWidth,
						y: y + 1/2 * heightWithoutRoundedCorners
					});
					sectionTwoPoints.push({
						x: sectionTwoStartPoint.x + sectionTwoWidth,
						y: y + 1/2 * height
					});
					sectionTwoPoints.push({
						x: sectionTwoStartPoint.x + sectionTwoWidth - configuration.BORDER_RADIUS,
						y: y + 1/2 * height
					});
					sectionTwoPoints.push({
						x: sectionTwoStartPoint.x,
						y: y + 1/2 * height
					});
				} else if (arrowPosition == "right") {
					sectionOnePoints.push({
						x: x - configuration.ARROW_WIDTH,
						y: y - 1/2 * configuration.ARROW_HEIGHT
					});
					sectionOnePoints.push({
						x: x - configuration.ARROW_WIDTH,
						y: y - 1/2 * heightWithoutRoundedCorners
					});
					sectionOnePoints.push({
						x: x - configuration.ARROW_WIDTH,
						y: y - 1/2 * height
					});
					sectionOnePoints.push({
						x: x - configuration.ARROW_WIDTH - configuration.BORDER_RADIUS,
						y: y - 1/2 * height
					});
					sectionOnePoints.push({
						x: x - configuration.ARROW_WIDTH - sectionOneWidth,
						y: y - 1/2 * height
					});
					sectionOnePoints.push({
						x: x - configuration.ARROW_WIDTH - sectionOneWidth,
						y: y + 1/2 * height
					});
					sectionOnePoints.push({
						x: x - configuration.ARROW_WIDTH - configuration.BORDER_RADIUS,
						y: y + 1/2 * height
					});
					sectionOnePoints.push({
						x: x - configuration.ARROW_WIDTH,
						y: y + 1/2 * height
					});
					sectionOnePoints.push({
						x: x - configuration.ARROW_WIDTH,
						y: y + 1/2 * heightWithoutRoundedCorners
					});
					sectionOnePoints.push({
						x: x - configuration.ARROW_WIDTH,
						y: y + 1/2 * configuration.ARROW_HEIGHT
					});

					var sectionTwoStartPoint = {
						x: x - configuration.ARROW_WIDTH - sectionOneWidth - configuration.GAP_SIZE,
						y: y - 1/2 * height
					};

					sectionTwoPoints.push({
						x: sectionTwoStartPoint.x,
						y: sectionTwoStartPoint.y
					});
					sectionTwoPoints.push({
						x: sectionTwoStartPoint.x - sectionTwoWidth + configuration.BORDER_RADIUS,
						y: sectionTwoStartPoint.y
					});
					sectionTwoPoints.push({
						x: sectionTwoStartPoint.x - sectionTwoWidth,
						y: sectionTwoStartPoint.y
					});
					sectionTwoPoints.push({
						x: sectionTwoStartPoint.x - sectionTwoWidth,
						y: y - 1/2 * heightWithoutRoundedCorners
					});
					sectionTwoPoints.push({
						x: sectionTwoStartPoint.x - sectionTwoWidth,
						y: y + 1/2 * heightWithoutRoundedCorners
					});
					sectionTwoPoints.push({
						x: sectionTwoStartPoint.x - sectionTwoWidth,
						y: y + 1/2 * height
					});
					sectionTwoPoints.push({
						x: sectionTwoStartPoint.x - sectionTwoWidth + configuration.BORDER_RADIUS,
						y: y + 1/2 * height
					});
					sectionTwoPoints.push({
						x: sectionTwoStartPoint.x,
						y: y + 1/2 * height
					});
				}

				segmentPathString = Path()
					.moveto(x, y) 
					.lineto(sectionOnePoints[0].x, sectionOnePoints[0].y)
					.lineto(sectionOnePoints[1].x, sectionOnePoints[1].y)
					.smoothcurveto(
						sectionOnePoints[2].x, sectionOnePoints[2].y,
						sectionOnePoints[3].x, sectionOnePoints[3].y
					)
					.lineto(sectionOnePoints[4].x, sectionOnePoints[4].y)
					.lineto(sectionOnePoints[5].x, sectionOnePoints[5].y)
					.lineto(sectionOnePoints[6].x, sectionOnePoints[6].y)
					.smoothcurveto(
						sectionOnePoints[7].x, sectionOnePoints[7].y,
						sectionOnePoints[8].x, sectionOnePoints[8].y
					)
					.lineto(sectionOnePoints[9].x, sectionOnePoints[9].y)

					.moveto(sectionTwoPoints[0].x, sectionTwoPoints[0].y)
					.lineto(sectionTwoPoints[1].x, sectionTwoPoints[1].y)
					.smoothcurveto(
						sectionTwoPoints[2].x, sectionTwoPoints[2].y,
						sectionTwoPoints[3].x, sectionTwoPoints[3].y
					)
					.lineto(sectionTwoPoints[4], sectionTwoPoints[4])
					.smoothcurveto(
						sectionTwoPoints[5].x, sectionTwoPoints[5].y,
						sectionTwoPoints[6].x, sectionTwoPoints[6].y
					)
					.lineto(sectionTwoPoints[7], sectionTwoPoints[7])
					.closepath()
					.print();
			}

			return this.put(new SVG.TwoSectionTooltipBackground)
				.attr({
					d: segmentPathString
				})
				.addClass("fm-tooltip-background")
				.setConfiguration(configuration);
		}
	}
});

});
define([
	'svg-js',
	'path'
], function(
	SVG,
	Path
) {

SVG.TooltipBackground = SVG.invent({
	create: 'path',

	inherit: SVG.Path,

	extend: {
		setConfiguration: function(configuration) {
			this.configuration = configuration;

			return this;
		}
	},

	construct: {
		tooltipBackground: function(
			x,
			y,
			height,
			width,
			arrowPosition
		) {

			var configuration = {
				ARROW_HEIGHT: 10,
				ARROW_WIDTH: 7,
				BORDER_RADIUS: 5,
				GAP_SIZE: 2
			};

			var heightWithoutRoundedCorners = height - configuration.BORDER_RADIUS * 2;
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
						x: x + configuration.ARROW_WIDTH + width - configuration.BORDER_RADIUS,
						y: y - 1/2 * height
					});
					sectionOnePoints.push({
						x: x + configuration.ARROW_WIDTH + width,
						y: y - 1/2 * height
					});
					sectionOnePoints.push({
						x: x + configuration.ARROW_WIDTH + width,
						y: y - 1/2 * heightWithoutRoundedCorners
					});
					sectionOnePoints.push({
						x: x + configuration.ARROW_WIDTH + width,
						y: y + 1/2 * heightWithoutRoundedCorners
					});
					sectionOnePoints.push({
						x: x + configuration.ARROW_WIDTH + width,
						y: y + 1/2 * height
					});
					sectionOnePoints.push({
						x: x + configuration.ARROW_WIDTH + width - configuration.BORDER_RADIUS,
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
						x: x - configuration.ARROW_WIDTH - width + configuration.BORDER_RADIUS,
						y: y - 1/2 * height
					});
					sectionOnePoints.push({
						x: x - configuration.ARROW_WIDTH - width,
						y: y - 1/2 * height
					});
					sectionOnePoints.push({
						x: x - configuration.ARROW_WIDTH - width,
						y: y - 1/2 * heightWithoutRoundedCorners
					});
					sectionOnePoints.push({
						x: x - configuration.ARROW_WIDTH - width,
						y: y + 1/2 * heightWithoutRoundedCorners
					});
					sectionOnePoints.push({
						x: x - configuration.ARROW_WIDTH - width,
						y: y + 1/2 * height
					});
					sectionOnePoints.push({
						x: x - configuration.ARROW_WIDTH - width + configuration.BORDER_RADIUS,
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
					.smoothcurveto(
						sectionOnePoints[5].x, sectionOnePoints[5].y,
						sectionOnePoints[6].x, sectionOnePoints[6].y
					)
					.lineto(sectionOnePoints[7], sectionOnePoints[7])
					.smoothcurveto(
						sectionOnePoints[8].x, sectionOnePoints[8].y,
						sectionOnePoints[9].x, sectionOnePoints[9].y
					)
					.lineto(sectionOnePoints[10].x, sectionOnePoints[10].y)
					.smoothcurveto(
						sectionOnePoints[11].x, sectionOnePoints[11].y,
						sectionOnePoints[12].x, sectionOnePoints[12].y
					)
					.lineto(sectionOnePoints[13].x, sectionOnePoints[13].y)
					.closepath()
					.print();
			}

			return this.put(new SVG.TooltipBackground)
				.attr({
					d: segmentPathString
				})
				.addClass("fm-tooltip-background")
				.setConfiguration(configuration);
		}
	}
});

});
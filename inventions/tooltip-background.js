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
			type,
			width,
			height
		) {

			var configuration = {
				ARROW_LENGTH: 7,
				ARROW_THICKNESS: 10,
				BORDER_RADIUS: 5
			};

			var heightWithoutRoundedCorners = (height - configuration.BORDER_RADIUS * 2);

			var sectionOnePoints = [];
			var sectionTwoPoints = [];

			function getSingleSectionPointsWithTopArrow() {
				var points = [];
				var widthWithoutRoundedCorners = width - configuration.BORDER_RADIUS * 2;
				
				points.push({ x: x - configuration.ARROW_THICKNESS / 2, y: y + configuration.ARROW_LENGTH });
				points.push({ x: x - widthWithoutRoundedCorners / 2, y: y + configuration.ARROW_LENGTH });
				points.push({ x: x - width / 2, y: y + configuration.ARROW_LENGTH });
				points.push({ x: x - width / 2, y: y + configuration.ARROW_LENGTH + configuration.BORDER_RADIUS });
				points.push({ x: x - width / 2, y: y + configuration.ARROW_LENGTH + configuration.BORDER_RADIUS + heightWithoutRoundedCorners });
				points.push({ x: x - width / 2, y: y + configuration.ARROW_LENGTH + height });
				points.push({ x: x - width / 2 + configuration.BORDER_RADIUS, y: y + configuration.ARROW_LENGTH + height });
				points.push({ x: x + widthWithoutRoundedCorners / 2, y: y + configuration.ARROW_LENGTH + height });
				points.push({ x: x + width / 2, y: y + configuration.ARROW_LENGTH + height });
				points.push({ x: x + width / 2, y: y + configuration.ARROW_LENGTH + configuration.BORDER_RADIUS + heightWithoutRoundedCorners });
				points.push({ x: x + width / 2, y: y + configuration.ARROW_LENGTH + configuration.BORDER_RADIUS });
				points.push({ x: x + width / 2, y: y + configuration.ARROW_LENGTH });
				points.push({ x: x + widthWithoutRoundedCorners / 2, y: y + configuration.ARROW_LENGTH }); 
				points.push({ x: x + configuration.ARROW_THICKNESS / 2, y: y + configuration.ARROW_LENGTH });
				
				return points;
			}
			
			function getSingleSectionPointsWithLeftArrow() {
				var points = [];
				
				points.push({ x: x + configuration.ARROW_LENGTH, y: y - 1/2 * configuration.ARROW_THICKNESS });
				points.push({ x: x + configuration.ARROW_LENGTH, y: y - 1/2 * heightWithoutRoundedCorners });
				points.push({ x: x + configuration.ARROW_LENGTH, y: y - 1/2 * height });
				points.push({ x: x + configuration.ARROW_LENGTH + configuration.BORDER_RADIUS, y: y - 1/2 * height });
				points.push({ x: x + configuration.ARROW_LENGTH + width - configuration.BORDER_RADIUS, y: y - 1/2 * height });
				points.push({ x: x + configuration.ARROW_LENGTH + width, y: y - 1/2 * height });
				points.push({ x: x + configuration.ARROW_LENGTH + width, y: y - 1/2 * heightWithoutRoundedCorners });
				points.push({ x: x + configuration.ARROW_LENGTH + width, y: y + 1/2 * heightWithoutRoundedCorners });
				points.push({ x: x + configuration.ARROW_LENGTH + width, y: y + 1/2 * height });
				points.push({ x: x + configuration.ARROW_LENGTH + width - configuration.BORDER_RADIUS, y: y + 1/2 * height });
				points.push({ x: x + configuration.ARROW_LENGTH + configuration.BORDER_RADIUS, y: y + 1/2 * height });
				points.push({ x: x + configuration.ARROW_LENGTH, y: y + 1/2 * height });
				points.push({ x: x + configuration.ARROW_LENGTH, y: y + 1/2 * heightWithoutRoundedCorners });
				points.push({ x: x + configuration.ARROW_LENGTH, y: y + 1/2 * configuration.ARROW_THICKNESS });
				
				return points;
			}
			
			function getSectionPointsWithTopArrow() {
				var points = [];

				var widthWithoutRoundedCorners = width - configuration.BORDER_RADIUS * 2;
				
				points.push({ x: x - configuration.ARROW_THICKNESS / 2, y: y + configuration.ARROW_LENGTH });
				points.push({ x: x - widthWithoutRoundedCorners / 2, y: y + configuration.ARROW_LENGTH });
				points.push({ x: x - width / 2, y: y + configuration.ARROW_LENGTH });
				points.push({ x: x - width / 2, y: y + configuration.ARROW_LENGTH + configuration.BORDER_RADIUS });
				points.push({ x: x - width / 2, y: y + configuration.ARROW_LENGTH + configuration.BORDER_RADIUS + heightWithoutRoundedCorners });
				points.push({ x: x - width / 2, y: y + configuration.ARROW_LENGTH + height });
				points.push({ x: x - width / 2 + configuration.BORDER_RADIUS, y: y + configuration.ARROW_LENGTH + height });
				points.push({ x: x + width / 2, y: y + configuration.ARROW_LENGTH + height });
				points.push({ x: x + width / 2, y: y + configuration.ARROW_LENGTH });
				points.push({ x: x + configuration.ARROW_THICKNESS / 2, y: y + configuration.ARROW_LENGTH });
				
				return points;
			}
			
			function getSectionPointsWithLeftArrow() {
				var points = [];
				
				points.push({ x: x + configuration.ARROW_LENGTH, y: y - 1/2 * configuration.ARROW_THICKNESS });
				points.push({ x: x + configuration.ARROW_LENGTH, y: y - 1/2 * heightWithoutRoundedCorners });
				points.push({ x: x + configuration.ARROW_LENGTH, y: y - 1/2 * height });
				points.push({ x: x + configuration.ARROW_LENGTH + configuration.BORDER_RADIUS, y: y - 1/2 * height });
				points.push({ x: x + configuration.ARROW_LENGTH + width, y: y - 1/2 * height });
				points.push({ x: x + configuration.ARROW_LENGTH + width, y: y + 1/2 * height });
				points.push({ x: x + configuration.ARROW_LENGTH + configuration.BORDER_RADIUS, y: y + 1/2 * height });
				points.push({ x: x + configuration.ARROW_LENGTH, y: y + 1/2 * height });
				points.push({ x: x + configuration.ARROW_LENGTH, y: y + 1/2 * heightWithoutRoundedCorners });
				points.push({ x: x + configuration.ARROW_LENGTH, y: y + 1/2 * configuration.ARROW_THICKNESS });
				
				return points;
			}			
			
			function getSectionPoints() {
				var points = [];
		
				points.push({ x: x - width + configuration.BORDER_RADIUS, y: y });
				points.push({ x: x - width, y: y });
				points.push({ x: x - width, y: y + configuration.BORDER_RADIUS });
				points.push({ x: x - width, y: y + height - configuration.BORDER_RADIUS });
				points.push({ x: x - width, y: y + height });
				points.push({ x: x - width + configuration.BORDER_RADIUS, y: y + height });
				points.push({ x: x, y: y + height });
	
				return points;
			}
			
			function setUpSingleSectionWithTopOrBottomArrowPathString(points) {
				return Path()
					.moveto(x, y)
					.lineto(points[0].x, points[0].y)
					.lineto(points[1].x, points[1].y)
					.smoothcurveto(
						points[2].x, points[2].y,
						points[3].x, points[3].y
					)
					.lineto(points[4].x, points[4].y)
					.smoothcurveto(
						points[5].x, points[5].y,
						points[6].x, points[6].y
					)
					.lineto(points[7].x, points[7].y)
					.smoothcurveto(
						points[8].x, points[8].y,
						points[9].x, points[9].y
					)
					.lineto(points[10].x, points[10].y)
					.smoothcurveto(
						points[11].x, points[11].y,
						points[12].x, points[12].y
					)
					.lineto(points[13].x, points[13].y)
					.closepath()
					.print();
			}

			function setUpSingleSectionWithLeftOrRightArrowPathString(points) {
				return Path()
					.moveto(x, y) 
					.lineto(points[0].x, points[0].y)
					.lineto(points[1].x, points[1].y)
					.smoothcurveto(
						points[2].x, points[2].y,
						points[3].x, points[3].y
					)
					.lineto(points[4].x, points[4].y)
					.smoothcurveto(
						points[5].x, points[5].y,
						points[6].x, points[6].y
					)
					.lineto(points[7], points[7])
					.smoothcurveto(
						points[8].x, points[8].y,
						points[9].x, points[9].y
					)
					.lineto(points[10].x, points[10].y)
					.smoothcurveto(
						points[11].x, points[11].y,
						points[12].x, points[12].y
					)
					.lineto(points[13].x, points[13].y)
					.closepath()
					.print();
			}
				
			function setUpSectionPathString(points) {
				return Path()
					.moveto(x, y) 
					.lineto(points[0].x, points[0].y)
					.smoothcurveto(
						points[1].x, points[1].y,
						points[2].x, points[2].y
					)
					.lineto(points[3].x, points[3].y)
					.smoothcurveto(
						points[4].x, points[4].y,
						points[5].x, points[5].y
					)
					.lineto(points[6].x, points[6].y)
					.closepath()
					.print();	
			}
			
			function setUpSectionWithTopOrBottomArrowPathString(points) {
				return Path()
					.moveto(x, y)
					.lineto(points[0].x, points[0].y)
					.lineto(points[1].x, points[1].y)
					.smoothcurveto(
						points[2].x, points[2].y,
						points[3].x, points[3].y
					)
					.lineto(points[4].x, points[4].y)
					.smoothcurveto(
						points[5].x, points[5].y,
						points[6].x, points[6].y
					)
					.lineto(points[7].x, points[7].y)
					.lineto(points[8].x, points[8].y)
					.lineto(points[9].x, points[9].y)
					.lineto(x, y)
					.print();
			}
			

				
			function setUpSectionWithLeftOrRightArrowPathString(points) {
				return Path()
					.moveto(x, y)
					.lineto(points[0].x, points[0].y)
					.lineto(points[1].x, points[1].y)
					.smoothcurveto(
						points[2].x, points[2].y,
						points[3].x, points[3].y
					)
					.lineto(points[4].x, points[4].y)
					.lineto(points[5].x, points[5].y)
					.lineto(points[6].x, points[6].y)
					.smoothcurveto(
						points[7].x, points[7].y,
						points[8].x, points[8].y
					)
					.lineto(points[9].x, points[9].y)
					.closepath()
					.print();
			}

			var points;
			var tooltipBackgroundPath = new SVG.TooltipBackground;
			var segmentPathString;
			
			if (type == "singleTop" || type == "singleBottom") {
				points = getSingleSectionPointsWithTopArrow();
				segmentPathString = setUpSingleSectionWithTopOrBottomArrowPathString(points);
			} else if (type == "singleLeft" || type == "singleRight") {
				points = getSingleSectionPointsWithLeftArrow();
				segmentPathString = setUpSingleSectionWithLeftOrRightArrowPathString(points);
			} else if (type == "leftSection" || type == "rightSection") {
				points = getSectionPoints();
				segmentPathString = setUpSectionPathString(points);
			} else if (
				type == "leftSectionWithTopArrow"
				|| type == "rightSectionWithBottomArrow"
				|| type == "rightSectionWithTopArrow"
				|| type == "leftSectionWithBottomArrow"
			) {
				points = getSectionPointsWithTopArrow();
				segmentPathString = setUpSectionWithTopOrBottomArrowPathString(points);
			} else if (type == "leftSectionWithLeftArrow" || type == "rightSectionWithRightArrow") {
				points = getSectionPointsWithLeftArrow();
				segmentPathString = setUpSectionWithLeftOrRightArrowPathString(points);
			}
			
			tooltipBackgroundPath.attr({
					d: segmentPathString
				})
				.addClass("fm-tooltip-background")
				.setConfiguration(configuration);
			
			if (
				type == "singleRight"
				|| type == "rightSection"
				|| type == "rightSectionWithRightArrow"
				|| type == "rightSectionWithTopArrow"
			) {
				tooltipBackgroundPath
					.translate(2 * x, 0)
					.scale(-1, 1);
			} else if (
				type == "singleBottom"
				|| type == "leftSectionWithBottomArrow"
			) {
				tooltipBackgroundPath
					.translate(0, 2 * y)
					.scale(1, -1);
			} else if (type == "rightSectionWithBottomArrow") {
				tooltipBackgroundPath
					.translate(2 * x, 2 * y)
					.scale(-1, -1);
			}
			
			return tooltipBackgroundPath;
		}
	}
});

});
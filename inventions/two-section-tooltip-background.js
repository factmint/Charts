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
			largeSectionWidth,
			smallSectionWidth,
			arrowPosition
		) {

			var configuration = {
				ARROW_LENGTH: 7,
				ARROW_THICKNESS: 10,
				BORDER_RADIUS: 5,
				GAP_SIZE: 2
			};

			var heightWithoutRoundedCorners = (height - configuration.BORDER_RADIUS * 2);

			var sectionOnePoints = [];
			var sectionTwoPoints = [];

			var segmentPathString;
			
			function setUpPointsWithLeftArrow() {
				var points = {
					sectionOne: [],
					sectionTwo: []
				};
				
				points.sectionOne.push({ x: x + configuration.ARROW_LENGTH, y: y - 1/2 * configuration.ARROW_THICKNESS });
				points.sectionOne.push({ x: x + configuration.ARROW_LENGTH, y: y - 1/2 * heightWithoutRoundedCorners });
				points.sectionOne.push({ x: x + configuration.ARROW_LENGTH, y: y - 1/2 * height });
				points.sectionOne.push({ x: x + configuration.ARROW_LENGTH + configuration.BORDER_RADIUS, y: y - 1/2 * height });
				points.sectionOne.push({ x: x + configuration.ARROW_LENGTH + largeSectionWidth, y: y - 1/2 * height });
				points.sectionOne.push({ x: x + configuration.ARROW_LENGTH + largeSectionWidth, y: y + 1/2 * height });
				points.sectionOne.push({ x: x + configuration.ARROW_LENGTH + configuration.BORDER_RADIUS, y: y + 1/2 * height });
				points.sectionOne.push({ x: x + configuration.ARROW_LENGTH, y: y + 1/2 * height });
				points.sectionOne.push({ x: x + configuration.ARROW_LENGTH, y: y + 1/2 * heightWithoutRoundedCorners });
				points.sectionOne.push({ x: x + configuration.ARROW_LENGTH, y: y + 1/2 * configuration.ARROW_THICKNESS });

				var sectionTwoStartPoint = { x: x + configuration.ARROW_LENGTH + largeSectionWidth + configuration.GAP_SIZE, y: y - 1/2 * height };

				points.sectionTwo.push({ x: sectionTwoStartPoint.x, y: sectionTwoStartPoint.y });
				points.sectionTwo.push({ x: sectionTwoStartPoint.x + smallSectionWidth - configuration.BORDER_RADIUS, y: sectionTwoStartPoint.y });
				points.sectionTwo.push({ x: sectionTwoStartPoint.x + smallSectionWidth, y: sectionTwoStartPoint.y });
				points.sectionTwo.push({ x: sectionTwoStartPoint.x + smallSectionWidth, y: y - 1/2 * heightWithoutRoundedCorners });
				points.sectionTwo.push({ x: sectionTwoStartPoint.x + smallSectionWidth, y: y + 1/2 * heightWithoutRoundedCorners });
				points.sectionTwo.push({ x: sectionTwoStartPoint.x + smallSectionWidth, y: y + 1/2 * height });
				points.sectionTwo.push({ x: sectionTwoStartPoint.x + smallSectionWidth - configuration.BORDER_RADIUS, y: y + 1/2 * height });
				points.sectionTwo.push({ x: sectionTwoStartPoint.x, y: y + 1/2 * height });
				
				return points;
			}
			
			function setUpPointsWithRightArrow() {
				var points = {
					sectionOne: [],
					sectionTwo: []
				};
				
				points.sectionOne.push({ x: x - configuration.ARROW_LENGTH, y: y - 1/2 * configuration.ARROW_THICKNESS });
				points.sectionOne.push({ x: x - configuration.ARROW_LENGTH, y: y - 1/2 * heightWithoutRoundedCorners });
				points.sectionOne.push({ x: x - configuration.ARROW_LENGTH, y: y - 1/2 * height });
				points.sectionOne.push({ x: x - configuration.ARROW_LENGTH - configuration.BORDER_RADIUS, y: y - 1/2 * height });
				points.sectionOne.push({ x: x - configuration.ARROW_LENGTH - smallSectionWidth, y: y - 1/2 * height });
				points.sectionOne.push({ x: x - configuration.ARROW_LENGTH - smallSectionWidth, y: y + 1/2 * height });
				points.sectionOne.push({ x: x - configuration.ARROW_LENGTH - configuration.BORDER_RADIUS, y: y + 1/2 * height });
				points.sectionOne.push({ x: x - configuration.ARROW_LENGTH, y: y + 1/2 * height });
				points.sectionOne.push({ x: x - configuration.ARROW_LENGTH, y: y + 1/2 * heightWithoutRoundedCorners });
				points.sectionOne.push({ x: x - configuration.ARROW_LENGTH, y: y + 1/2 * configuration.ARROW_THICKNESS });

				var sectionTwoStartPoint = { x: x - configuration.ARROW_LENGTH - smallSectionWidth - configuration.GAP_SIZE, y: y - 1/2 * height };

				points.sectionTwo.push({ x: sectionTwoStartPoint.x, y: sectionTwoStartPoint.y });
				points.sectionTwo.push({ x: sectionTwoStartPoint.x - largeSectionWidth + configuration.BORDER_RADIUS, y: sectionTwoStartPoint.y });
				points.sectionTwo.push({ x: sectionTwoStartPoint.x - largeSectionWidth, y: sectionTwoStartPoint.y });
				points.sectionTwo.push({ x: sectionTwoStartPoint.x - largeSectionWidth, y: y - 1/2 * heightWithoutRoundedCorners });
				points.sectionTwo.push({ x: sectionTwoStartPoint.x - largeSectionWidth, y: y + 1/2 * heightWithoutRoundedCorners });
				points.sectionTwo.push({ x: sectionTwoStartPoint.x - largeSectionWidth, y: y + 1/2 * height });
				points.sectionTwo.push({ x: sectionTwoStartPoint.x - largeSectionWidth + configuration.BORDER_RADIUS, y: y + 1/2 * height });
				points.sectionTwo.push({ x: sectionTwoStartPoint.x, y: y + 1/2 * height });
				
				return points;
			}
			
			function setUpPointsWithTopArrow() {
				var points = [];
				var widthWithoutRoundedCorners = largeSectionWidth - configuration.BORDER_RADIUS * 2;
				
				points.push({ x: x - configuration.ARROW_THICKNESS / 2, y: y + configuration.ARROW_LENGTH });
				points.push({ x: x - widthWithoutRoundedCorners / 2, y: y + configuration.ARROW_LENGTH });
				points.push({ x: x - largeSectionWidth / 2, y: y + configuration.ARROW_LENGTH });
				points.push({ x: x - largeSectionWidth / 2, y: y + configuration.ARROW_LENGTH + configuration.BORDER_RADIUS });
				points.push({ x: x - largeSectionWidth / 2, y: y + configuration.ARROW_LENGTH + configuration.BORDER_RADIUS + heightWithoutRoundedCorners });
				points.push({ x: x - largeSectionWidth / 2, y: y + configuration.ARROW_LENGTH + height });
				points.push({ x: x - largeSectionWidth / 2 + configuration.BORDER_RADIUS, y: y + configuration.ARROW_LENGTH + height });
				points.push({ x: x + widthWithoutRoundedCorners / 2, y: y + configuration.ARROW_LENGTH + height });
				points.push({ x: x + largeSectionWidth / 2, y: y + configuration.ARROW_LENGTH + height });
				points.push({ x: x + largeSectionWidth / 2, y: y + configuration.ARROW_LENGTH + configuration.BORDER_RADIUS + heightWithoutRoundedCorners });
				points.push({ x: x + largeSectionWidth / 2, y: y + configuration.ARROW_LENGTH + configuration.BORDER_RADIUS });
				points.push({ x: x + largeSectionWidth / 2, y: y + configuration.ARROW_LENGTH });
				points.push({ x: x + widthWithoutRoundedCorners / 2, y: y + configuration.ARROW_LENGTH }); 
				points.push({ x: x + configuration.ARROW_THICKNESS / 2, y: y + configuration.ARROW_LENGTH });
				
				return points;	
			}
			
			function setUpPointsWithBottomArrow() {
				var points = [];
				var widthWithoutRoundedCorners = largeSectionWidth - configuration.BORDER_RADIUS * 2;
				
				points.push({ x: x - configuration.ARROW_THICKNESS / 2, y: y - configuration.ARROW_LENGTH });
				points.push({ x: x - widthWithoutRoundedCorners / 2, y: y - configuration.ARROW_LENGTH });
				points.push({ x: x - largeSectionWidth / 2, y: y - configuration.ARROW_LENGTH });
				points.push({ x: x - largeSectionWidth / 2, y: y - configuration.ARROW_LENGTH - configuration.BORDER_RADIUS });
				points.push({ x: x - largeSectionWidth / 2, y: y - configuration.ARROW_LENGTH - configuration.BORDER_RADIUS - heightWithoutRoundedCorners });
				points.push({ x: x - largeSectionWidth / 2, y: y - configuration.ARROW_LENGTH - height });
				points.push({ x: x - largeSectionWidth / 2 + configuration.BORDER_RADIUS, y: y - configuration.ARROW_LENGTH - height });
				points.push({ x: x + widthWithoutRoundedCorners / 2, y: y - configuration.ARROW_LENGTH - height });
				points.push({ x: x + largeSectionWidth / 2, y: y - configuration.ARROW_LENGTH - height });
				points.push({ x: x + largeSectionWidth / 2, y: y - configuration.ARROW_LENGTH - configuration.BORDER_RADIUS - heightWithoutRoundedCorners });
				points.push({ x: x + largeSectionWidth / 2, y: y - configuration.ARROW_LENGTH - configuration.BORDER_RADIUS });
				points.push({ x: x + largeSectionWidth / 2, y: y - configuration.ARROW_LENGTH });
				points.push({ x: x + widthWithoutRoundedCorners / 2, y: y - configuration.ARROW_LENGTH }); 
				points.push({ x: x + configuration.ARROW_THICKNESS / 2, y: y - configuration.ARROW_LENGTH });
				
				return points;
			}
			
			function setUpPointsWithTopLeftArrow() {
				var points = {
					sectionOne: [],
					sectionTwo: []
				};
				
				var largeWidthWithoutRoundedCorners = largeSectionWidth - configuration.BORDER_RADIUS * 2;
				var smallWidthWithoutRoundedCorners = smallSectionWidth - configuration.BORDER_RADIUS * 2;
				
				points.sectionOne.push({ x: x - configuration.ARROW_THICKNESS / 2, y: y + configuration.ARROW_LENGTH });
				points.sectionOne.push({ x: x - largeWidthWithoutRoundedCorners / 2, y: y + configuration.ARROW_LENGTH });
				points.sectionOne.push({ x: x - largeSectionWidth / 2, y: y + configuration.ARROW_LENGTH });
				points.sectionOne.push({ x: x - largeSectionWidth / 2, y: y + configuration.ARROW_LENGTH + configuration.BORDER_RADIUS });
				points.sectionOne.push({ x: x - largeSectionWidth / 2, y: y + configuration.ARROW_LENGTH + configuration.BORDER_RADIUS + heightWithoutRoundedCorners });
				points.sectionOne.push({ x: x - largeSectionWidth / 2, y: y + configuration.ARROW_LENGTH + height });
				points.sectionOne.push({ x: x - largeSectionWidth / 2 + configuration.BORDER_RADIUS, y: y + configuration.ARROW_LENGTH + height });
				points.sectionOne.push({ x: x + largeSectionWidth / 2, y: y + configuration.ARROW_LENGTH + height });
				points.sectionOne.push({ x: x + largeSectionWidth / 2, y: y + configuration.ARROW_LENGTH });
				points.sectionOne.push({ x: x + configuration.ARROW_THICKNESS / 2, y: y + configuration.ARROW_LENGTH });
				
				var sectionTwoStartPoint = { x: x + largeSectionWidth / 2 + configuration.GAP_SIZE, y: y + configuration.ARROW_LENGTH + height };
				
				points.sectionTwo.push({ x: sectionTwoStartPoint.x, y: sectionTwoStartPoint.y });
				points.sectionTwo.push({ x: sectionTwoStartPoint.x + smallSectionWidth - configuration.BORDER_RADIUS, y: sectionTwoStartPoint.y });
				points.sectionTwo.push({ x: sectionTwoStartPoint.x + smallSectionWidth, y: sectionTwoStartPoint.y });
				points.sectionTwo.push({ x: sectionTwoStartPoint.x + smallSectionWidth, y: sectionTwoStartPoint.y - configuration.BORDER_RADIUS });
				points.sectionTwo.push({ x: sectionTwoStartPoint.x + smallSectionWidth, y: sectionTwoStartPoint.y - configuration.BORDER_RADIUS - heightWithoutRoundedCorners });
				points.sectionTwo.push({ x: sectionTwoStartPoint.x + smallSectionWidth, y: sectionTwoStartPoint.y - height });
				points.sectionTwo.push({ x: sectionTwoStartPoint.x + smallSectionWidth - configuration.BORDER_RADIUS, y: sectionTwoStartPoint.y - height });
				points.sectionTwo.push({ x: sectionTwoStartPoint.x, y: sectionTwoStartPoint.y - height });
				
				return points;
			}
			
			function setUpPointsWithTopRightArrow() {
				var points = {
					sectionOne: [],
					sectionTwo: []
				};
				var largeWidthWithoutRoundedCorners = largeSectionWidth - configuration.BORDER_RADIUS * 2;
				var smallWidthWithoutRoundedCorners = smallSectionWidth - configuration.BORDER_RADIUS * 2;
				
				var sectionOneStartPoint = { x: x - smallSectionWidth / 2 - configuration.GAP_SIZE, y: y + configuration.ARROW_LENGTH };
				
				points.sectionOne.push({ x: sectionOneStartPoint.x, y: sectionOneStartPoint.y });
				points.sectionOne.push({ x: sectionOneStartPoint.x - largeSectionWidth + configuration.BORDER_RADIUS, y: sectionOneStartPoint.y });
				points.sectionOne.push({ x: sectionOneStartPoint.x - largeSectionWidth, y: sectionOneStartPoint.y });
				points.sectionOne.push({ x: sectionOneStartPoint.x - largeSectionWidth, y: sectionOneStartPoint.y + configuration.BORDER_RADIUS });
				points.sectionOne.push({ x: sectionOneStartPoint.x - largeSectionWidth, y: sectionOneStartPoint.y + configuration.BORDER_RADIUS + heightWithoutRoundedCorners });
				points.sectionOne.push({ x: sectionOneStartPoint.x - largeSectionWidth, y: sectionOneStartPoint.y + height });
				points.sectionOne.push({ x: sectionOneStartPoint.x - largeSectionWidth + configuration.BORDER_RADIUS, y: sectionOneStartPoint.y + height });
				points.sectionOne.push({ x: sectionOneStartPoint.x, y: sectionOneStartPoint.y + height });

				points.sectionTwo.push({ x: x - configuration.ARROW_THICKNESS / 2, y: y + configuration.ARROW_LENGTH });
				points.sectionTwo.push({ x: x - smallSectionWidth / 2, y: y + configuration.ARROW_LENGTH });
				points.sectionTwo.push({ x: x - smallSectionWidth / 2, y: y + configuration.ARROW_LENGTH + height });
				points.sectionTwo.push({ x: x + smallWidthWithoutRoundedCorners / 2, y: y + configuration.ARROW_LENGTH + height });
				points.sectionTwo.push({ x: x + smallSectionWidth / 2, y: y + configuration.ARROW_LENGTH + height });
				points.sectionTwo.push({ x: x + smallSectionWidth / 2, y: y + configuration.ARROW_LENGTH + height - configuration.BORDER_RADIUS });
				points.sectionTwo.push({ x: x + smallSectionWidth / 2, y: y + configuration.ARROW_LENGTH + configuration.BORDER_RADIUS });
				points.sectionTwo.push({ x: x + smallSectionWidth / 2, y: y + configuration.ARROW_LENGTH });
				points.sectionTwo.push({ x: x + smallWidthWithoutRoundedCorners / 2, y: y + configuration.ARROW_LENGTH }); 
				points.sectionTwo.push({ x: x + configuration.ARROW_THICKNESS / 2, y: y + configuration.ARROW_LENGTH});
				
				return points;
			}
			
			function setUpPointsWithBottomLeftArrow() {
				var points = {
					sectionOne: [],
					sectionTwo: []
				};
				
				var largeWidthWithoutRoundedCorners = largeSectionWidth - configuration.BORDER_RADIUS * 2;
				var smallWidthWithoutRoundedCorners = smallSectionWidth - configuration.BORDER_RADIUS * 2;
				
				points.sectionOne.push({ x: x - configuration.ARROW_THICKNESS / 2, y: y - configuration.ARROW_LENGTH });
				points.sectionOne.push({ x: x - largeWidthWithoutRoundedCorners / 2, y: y - configuration.ARROW_LENGTH });
				points.sectionOne.push({ x: x - largeSectionWidth / 2, y: y - configuration.ARROW_LENGTH });
				points.sectionOne.push({ x: x - largeSectionWidth / 2, y: y - configuration.ARROW_LENGTH - configuration.BORDER_RADIUS });
				points.sectionOne.push({ x: x - largeSectionWidth / 2, y: y - configuration.ARROW_LENGTH - configuration.BORDER_RADIUS - heightWithoutRoundedCorners });
				points.sectionOne.push({ x: x - largeSectionWidth / 2, y: y - configuration.ARROW_LENGTH - height });
				points.sectionOne.push({ x: x - largeSectionWidth / 2 + configuration.BORDER_RADIUS, y: y - configuration.ARROW_LENGTH - height });
				points.sectionOne.push({ x: x + largeSectionWidth / 2, y: y - configuration.ARROW_LENGTH - height });
				points.sectionOne.push({ x: x + largeSectionWidth / 2, y: y - configuration.ARROW_LENGTH });
				points.sectionOne.push({ x: x + configuration.ARROW_THICKNESS / 2, y: y - configuration.ARROW_LENGTH });
				
				var sectionTwoStartPoint = { x: x + largeSectionWidth / 2 + configuration.GAP_SIZE, y: y - configuration.ARROW_LENGTH - height };
				
				points.sectionTwo.push({ x: sectionTwoStartPoint.x, y: sectionTwoStartPoint.y });
				points.sectionTwo.push({ x: sectionTwoStartPoint.x + smallSectionWidth - configuration.BORDER_RADIUS, y: sectionTwoStartPoint.y });
				points.sectionTwo.push({ x: sectionTwoStartPoint.x + smallSectionWidth, y: sectionTwoStartPoint.y });
				points.sectionTwo.push({ x: sectionTwoStartPoint.x + smallSectionWidth, y: sectionTwoStartPoint.y + configuration.BORDER_RADIUS });
				points.sectionTwo.push({ x: sectionTwoStartPoint.x + smallSectionWidth, y: sectionTwoStartPoint.y + configuration.BORDER_RADIUS + heightWithoutRoundedCorners });
				points.sectionTwo.push({ x: sectionTwoStartPoint.x + smallSectionWidth, y: sectionTwoStartPoint.y + height });
				points.sectionTwo.push({ x: sectionTwoStartPoint.x + smallSectionWidth - configuration.BORDER_RADIUS, y: sectionTwoStartPoint.y + height });
				points.sectionTwo.push({ x: sectionTwoStartPoint.x, y: sectionTwoStartPoint.y + height });
				
				return points;
			}
			
			function setUpPointsWithBottomRightArrow() {
				var points = {
					sectionOne: [],
					sectionTwo: []
				};
				var largeWidthWithoutRoundedCorners = largeSectionWidth - configuration.BORDER_RADIUS * 2;
				var smallWidthWithoutRoundedCorners = smallSectionWidth - configuration.BORDER_RADIUS * 2;
				
				var sectionOneStartPoint = { x: x - smallSectionWidth / 2 - configuration.GAP_SIZE, y: y - configuration.ARROW_LENGTH };
				
				points.sectionOne.push({ x: sectionOneStartPoint.x, y: sectionOneStartPoint.y });
				points.sectionOne.push({ x: sectionOneStartPoint.x - largeSectionWidth + configuration.BORDER_RADIUS, y: sectionOneStartPoint.y });
				points.sectionOne.push({ x: sectionOneStartPoint.x - largeSectionWidth, y: sectionOneStartPoint.y });
				points.sectionOne.push({ x: sectionOneStartPoint.x - largeSectionWidth, y: sectionOneStartPoint.y - configuration.BORDER_RADIUS });
				points.sectionOne.push({ x: sectionOneStartPoint.x - largeSectionWidth, y: sectionOneStartPoint.y - configuration.BORDER_RADIUS - heightWithoutRoundedCorners });
				points.sectionOne.push({ x: sectionOneStartPoint.x - largeSectionWidth, y: sectionOneStartPoint.y - height });
				points.sectionOne.push({ x: sectionOneStartPoint.x - largeSectionWidth + configuration.BORDER_RADIUS, y: sectionOneStartPoint.y - height });
				points.sectionOne.push({ x: sectionOneStartPoint.x, y: sectionOneStartPoint.y - height });

				points.sectionTwo.push({ x: x - configuration.ARROW_THICKNESS / 2, y: y - configuration.ARROW_LENGTH });
				points.sectionTwo.push({ x: x - smallSectionWidth / 2, y: y - configuration.ARROW_LENGTH });
				points.sectionTwo.push({ x: x - smallSectionWidth / 2, y: y - configuration.ARROW_LENGTH - height });
				points.sectionTwo.push({ x: x + smallWidthWithoutRoundedCorners / 2, y: y - configuration.ARROW_LENGTH - height });
				points.sectionTwo.push({ x: x + smallSectionWidth / 2, y: y - configuration.ARROW_LENGTH - height });
				points.sectionTwo.push({ x: x + smallSectionWidth / 2, y: y - configuration.ARROW_LENGTH - height + configuration.BORDER_RADIUS });
				points.sectionTwo.push({ x: x + smallSectionWidth / 2, y: y - configuration.ARROW_LENGTH - configuration.BORDER_RADIUS });
				points.sectionTwo.push({ x: x + smallSectionWidth / 2, y: y - configuration.ARROW_LENGTH });
				points.sectionTwo.push({ x: x + smallWidthWithoutRoundedCorners / 2, y: y - configuration.ARROW_LENGTH }); 
				points.sectionTwo.push({ x: x + configuration.ARROW_THICKNESS / 2, y: y - configuration.ARROW_LENGTH});
				
				return points;
			}
			
			function setUpLeftOrRightPathString(points) {
				sectionOnePoints = points.sectionOne;
				sectionTwoPoints = points.sectionTwo;
				
				return Path()
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
			
			function setUpTopOrBottomPathString(points) {
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
			
			function setUpTopOrBottomLeftPathString(points) {
				sectionOnePoints = points.sectionOne;
				sectionTwoPoints = points.sectionTwo;

				return Path()
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
					.lineto(sectionOnePoints[7].x, sectionOnePoints[7].y)
					.lineto(sectionOnePoints[8].x, sectionOnePoints[8].y)
					.lineto(sectionOnePoints[9].x, sectionOnePoints[9].y)
					.lineto(x, y)
					
					.moveto(sectionTwoPoints[0].x, sectionTwoPoints[0].y)
					.lineto(sectionTwoPoints[1].x, sectionTwoPoints[1].y)
					.smoothcurveto(
						sectionTwoPoints[2].x, sectionTwoPoints[2].y,
						sectionTwoPoints[3].x, sectionTwoPoints[3].y
					)
					.lineto(sectionTwoPoints[4].x, sectionTwoPoints[4].y)
					.smoothcurveto(
						sectionTwoPoints[5].x, sectionTwoPoints[5].y,
						sectionTwoPoints[6].x, sectionTwoPoints[6].y
					)
					.lineto(sectionTwoPoints[7].x, sectionTwoPoints[7].y)
					.closepath()
					.print();
			}
			
			function setUpTopOrBottomRightPathString(points) {
				sectionOnePoints = points.sectionOne;
				sectionTwoPoints = points.sectionTwo;

				return Path()
					.moveto(x, y)
					.lineto(sectionTwoPoints[0].x, sectionTwoPoints[0].y)
					.lineto(sectionTwoPoints[1].x, sectionTwoPoints[1].y)
					.lineto(sectionTwoPoints[2].x, sectionTwoPoints[2].y)
					.lineto(sectionTwoPoints[3].x, sectionTwoPoints[3].y)
					.smoothcurveto(
						sectionTwoPoints[4].x, sectionTwoPoints[4].y,
						sectionTwoPoints[5].x, sectionTwoPoints[5].y
					)
					.lineto(sectionTwoPoints[6].x, sectionTwoPoints[6].y)
					.smoothcurveto(
						sectionTwoPoints[7].x, sectionTwoPoints[7].y,
						sectionTwoPoints[8].x, sectionTwoPoints[8].y
					)
					.lineto(sectionTwoPoints[9].x, sectionTwoPoints[9].y)
					.lineto(x, y)
					
					.moveto(sectionOnePoints[0].x, sectionOnePoints[0].y)
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
					.lineto(sectionOnePoints[7].x, sectionOnePoints[7].y)
				//	.closepath()
					.print();
			}

			var points;
			if (arrowPosition == "left" || arrowPosition == "right") {
				if (arrowPosition == "left") {
					points = setUpPointsWithLeftArrow();
				} else if (arrowPosition == "right") {
					points = setUpPointsWithRightArrow();
				}

				segmentPathString = setUpLeftOrRightPathString(points);
			} else if (arrowPosition == "top" || arrowPosition == "bottom") {
				if (arrowPosition == "top") {
					points = setUpPointsWithTopArrow();
				} else if (arrowPosition == "bottom") {
					points = setUpPointsWithBottomArrow();
				}
				
				segmentPathString = setUpTopOrBottomPathString(points);
			} else if (arrowPosition == "topLeft" || arrowPosition == "topRight" || arrowPosition == "bottomLeft" || arrowPosition == "bottomRight") {
				if (arrowPosition == "topLeft") {
					points = setUpPointsWithTopLeftArrow();
				} else if (arrowPosition == "topRight") {
					points = setUpPointsWithTopRightArrow();
				} else if (arrowPosition == "bottomLeft") {
					points = setUpPointsWithBottomLeftArrow();
				} else if (arrowPosition == "bottomRight") {
					points = setUpPointsWithBottomRightArrow();
				}
				
				if (arrowPosition == "topLeft" || arrowPosition == "bottomLeft") {
					segmentPathString = setUpTopOrBottomLeftPathString(points);	
				} else {
					segmentPathString = setUpTopOrBottomRightPathString(points);	
				}
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
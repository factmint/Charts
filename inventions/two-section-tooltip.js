define([
	'svg-js',
	'path'
], function(
	SVG,
	Path
) {

	SVG.TwoSectionTooltip = SVG.invent({
		create: 'group',

		inherit: SVG.Path,

		construct: {
			twoSectionTooltip: function(x, y, text) {

				var twoSectionTooltipGroup = this.put()
				var point1 = {
					x: x + arrowWidth,
					y: y - arrowHeight / 2
				};
				var point2 = {
					x: ,
					y: 
				};
				var point3 = {
					x: ,
					y: 
				};
				var point4 = {
					x: ,
					y: 
				};
				var point5 = {
					x: ,
					y: 
				};
				var point6 = {
					x: ,
					y: 
				};

				var large = ((endAngle - startAngle) > Math.PI) ? 1 : 0;

				var segmentPathString = Path()
					.moveto(x, y) 
					.lineto(point1.x, point1.y)
					.arc(radius, radius, 0, large, 1, point2.x, point2.y)
					.closepath()
					.print();

				return this.put(new SVG.twoSectionTooltip)
					.attr({
						d: segmentPathString
					});
			}
		}
	});

	var configuration = {
		ARROW_WIDTH: 10,
		ARROW_HEIGHT: 20,
		PADDING: 5
	};

	return configuration;

});
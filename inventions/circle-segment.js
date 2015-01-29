define([
	'svg-js',
	'path',
	'factmint-charts/utilities/geometry'
], function(
	SVG,
	Path,
	Geometry
) {

	SVG.CircleSegment = SVG.invent({
		create: 'path',

		inherit: SVG.Path,

		construct: {
			circleSegment: function(x, y, radius, startAngle, endAngle) {
				var point1 = Circle.getPointOnCircle(x, y, radius, startAngle);
				var point2 = Circle.getPointOnCircle(x, y, radius, endAngle);

				var large = ((endAngle - startAngle) > Math.PI) ? 1 : 0;

				var segmentPathString = Path()
					.moveto(x, y)
					.lineto(point1.x, point1.y)
					.arc(radius, radius, 0, large, 1, point2.x, point2.y)
					.closepath()
					.print();

				return this.put(new SVG.CircleSegment)
					.attr({
						d: segmentPathString
					});
			}
		}
	});

	var configuration = {
		TEST_VALUE: 10
	};

	return configuration;

});
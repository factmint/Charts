define([
	'svg-js',
	'path',
	'geometry'
], function(
	SVG,
	Path,
	Geometry
) {

	SVG.CircleSegment = SVG.invent({
		create: 'path',

		inherit: SVG.Path,

		construct: {
			circleSegment: function(xOrigin, yOrigin, radius, startAngle, endAngle) {
				var point1 = Geometry.circle.getPointOnCircumference(xOrigin, yOrigin, radius, startAngle);
				var point2 = Geometry.circle.getPointOnCircumference(xOrigin, yOrigin, radius, endAngle);

				var large = ((endAngle - startAngle) > Math.PI) ? 1 : 0;

				var segmentPathString = Path()
					.moveto(xOrigin, yOrigin)
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

	};

	return configuration;

});
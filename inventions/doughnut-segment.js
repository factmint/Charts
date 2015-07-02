define([
	'svg-js',
	'path',
	'geometry'
], function(
	SVG,
	Path,
	Geometry
) {

	SVG.DoughnutSegment = SVG.invent({
		create: 'path',

		inherit: SVG.Path,

		construct: {
			doughnutSegment: function(xOrigin, yOrigin, radius, innerRadius, startAngle, endAngle) {

				var point1 = Geometry.circle.getPointOnCircumference(xOrigin, yOrigin, radius, startAngle);
				var point2 = Geometry.circle.getPointOnCircumference(xOrigin, yOrigin, radius, endAngle);
				var point3 = Geometry.circle.getPointOnCircumference(xOrigin, yOrigin, innerRadius, endAngle);
				var point4 = Geometry.circle.getPointOnCircumference(xOrigin, yOrigin, innerRadius, startAngle);

				var large = ((endAngle - startAngle) > Math.PI) ? 1 : 0;

				var segmentPathString = Path()
					.moveto(point1.x, point1.y)
					.arc(radius, radius, 0, large, 1, point2.x, point2.y)
					.lineto(point3.x, point3.y)
					.arc(innerRadius, innerRadius, 0, large, 0, point4.x, point4.y)
					.closepath()
					.print();

				return this.put(new SVG.DoughnutSegment)
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
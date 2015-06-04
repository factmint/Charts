define([
	"svg-js",
	"path",
	"geometry"
], function(
	SVG,
	Path,
	Geometry
) {

SVG.DashedBracket = SVG.invent({
	create: 'path',

	inherit: SVG.Path,

	extend: {

	},

	construct: {
		dashedBracket: function(
            x,
            y,
            innerRadius,
            middleRadius,
            outerRadius,
            startAngle,
            endAngle
		) {

			var point1 = Geometry.circle.getPointOnCircumference(x, y, innerRadius, startAngle);
			var point2 = Geometry.circle.getPointOnCircumference(x, y, innerRadius, endAngle);
			var point3 = Geometry.circle.getPointOnCircumference(x, y, middleRadius, startAngle);
			var point4 = Geometry.circle.getPointOnCircumference(x, y, middleRadius, endAngle);
    		var point5 = Geometry.circle.getPointOnCircumference(x, y, outerRadius, startAngle);
			var point6 = Geometry.circle.getPointOnCircumference(x, y, outerRadius, endAngle);
            var point7 = Geometry.circle.getPointOnCircumference(x, y, middleRadius, (endAngle - (endAngle - startAngle) / 2));
            var point8 = Geometry.circle.getPointOnCircumference(x, y, innerRadius, (endAngle - (endAngle - startAngle) / 2));
			
    		var dashedBracketPathString = Path()
				.moveto(point5.x, point5.y)
				.lineto(point3.x, point3.y)
				.arc(middleRadius, middleRadius, 0, ((endAngle - startAngle) > Math.PI) ? 1 : 0, 1, point4.x, point4.y)
				.lineto(point6.x, point6.y)
				
				.moveto(point7.x, point7.y)
				.lineto(point8.x, point8.y)
				.print();

			return this.put(new SVG.DashedBracket)
				.attr({
					d: dashedBracketPathString
				})
				.addClass("fm-dashed-bracket");
		}
	}
});

});
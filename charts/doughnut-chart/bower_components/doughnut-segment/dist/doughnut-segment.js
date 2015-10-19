define(['snap', 'circle-utils'],
function(Snap,   Circle) {
	return Snap.plugin(function(Snap, Element, Paper) {
		var SEGMENT_PATH = "M{x1},{y1}A{radius},{radius} 0 {large},1 {x2} {y2}L{x3},{y3}A{innerRadius},{innerRadius} 0 {large},0 {x4} {y4}Z";

		Paper.prototype.doughnutSegment = function(x, y, radius, innerRadius, startAngle, endAngle) {
			var point1 = Circle.getPointOnCircle(x, y, radius, startAngle);
			var point2 = Circle.getPointOnCircle(x, y, radius, endAngle);
			var point3 = Circle.getPointOnCircle(x, y, innerRadius, endAngle);
			var point4 = Circle.getPointOnCircle(x, y, innerRadius, startAngle);
			
			return this.path(Snap.format(SEGMENT_PATH, {
				originX: x,
				originY: y,
				x1: point1.x,
				y1: point1.y,
				x2: point2.x,
				y2: point2.y,
				x3: point3.x,
				y3: point3.y,
				x4: point4.x,
				y4: point4.y,
				radius: radius,
				innerRadius: innerRadius,
				large: ((endAngle - startAngle) > Math.PI) ? 1 : 0
			}));
		};
	});
});
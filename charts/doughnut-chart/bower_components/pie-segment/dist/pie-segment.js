define(['snap', 'circle-utils'],
function(Snap,   Circle) {
	return Snap.plugin(function(Snap, Element, Paper) {
		var SEGMENT_PATH = "M{originX},{originY}L{x1},{y1}A{radius},{radius} 0 {large},1 {x2},{y2}Z";

		Paper.prototype.pieSegment = function(x, y, radius, startAngle, endAngle) {
			var point1 = Circle.getPointOnCircle(x, y, radius, startAngle);
			var point2 = Circle.getPointOnCircle(x, y, radius, endAngle);
			
			return this.path(Snap.format(SEGMENT_PATH, {
				originX: x,
				originY: y,
				x1: point1.x,
				y1: point1.y,
				x2: point2.x,
				y2: point2.y,
				radius: radius,
				large: ((endAngle - startAngle) > Math.PI) ? 1 : 0
			}));
		};
	});
});
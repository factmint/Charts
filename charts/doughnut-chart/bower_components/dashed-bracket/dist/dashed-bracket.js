define(['snap', 'circle-utils'],
function(Snap,   Circle) {
	return Snap.plugin(function(Snap, Element, Paper) {

		var ARC_PATH = "M{x1},{y1}A{radius},{radius} 0 {large},1 {x2} {y2}";
		var BRACKET_PATH = "M{x1},{y1}L{x2},{y2}A{radius},{radius} 0 {large},1 {x3} {y3}L{x4},{y4}";

		Paper.prototype.dashedBracket = function(x, y, innerRadius, middleRadius, outerRadius, startAngle, endAngle) {

			var point1 = Circle.getPointOnCircle(x, y, innerRadius, startAngle);
			var point2 = Circle.getPointOnCircle(x, y, innerRadius, endAngle);

			var innerArc = this.path(Snap.format(ARC_PATH, {
				x1: point1.x,
				y1: point1.y,
				radius: innerRadius,
				large: ((endAngle - startAngle) > Math.PI) ? 1 : 0,
				x2: point2.x,
				y2: point2.y
			}))
				.attr({
					opacity: 0,
					fill: 'none'
				});

			var point3 = Circle.getPointOnCircle(x, y, middleRadius, startAngle);
			var point4 = Circle.getPointOnCircle(x, y, middleRadius, endAngle);

			var point5 = Circle.getPointOnCircle(x, y, outerRadius, startAngle);
			var point6 = Circle.getPointOnCircle(x, y, outerRadius, endAngle);

			var arc = this.path(Snap.format(BRACKET_PATH, {
				x1: point5.x,
				y1: point5.y,
				x2: point3.x,
				y2: point3.y,
				radius: middleRadius,
				large: ((endAngle - startAngle) > Math.PI) ? 1 : 0,
				x3: point4.x,
				y3: point4.y,
				x4: point6.x,
				y4: point6.y
			}))


			var innerMidpoint = innerArc.getPointAtLength(innerArc.getTotalLength() / 2);
			var outerMidpoint = arc.getPointAtLength(arc.getTotalLength() / 2);

			var middleLine = this.path('M' + innerMidpoint.x + ',' + innerMidpoint.y + 'L' + outerMidpoint.x + ' ' + outerMidpoint.y)
			
			var bracket = this.g(arc, middleLine)
				.addClass('fm-bracket');

			
			return bracket;

		};
	});
});
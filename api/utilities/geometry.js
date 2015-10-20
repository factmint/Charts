define(function() {
	return {
		circle: {
			tenth: 1/5 * Math.PI,
			eighth: 1/4 * Math.PI,
			quarter: 1/2 * Math.PI,
			half: Math.PI,
			whole: 2 * Math.PI,
			getPointOnCircumference: function(x, y, radius, angle) {
				return {
					x: x + radius * Math.sin(angle),
					y: y + -radius * Math.cos(angle)
				};
			},
			getAngle: function(value, dataTotal, totalSize) {
				totalSize = (typeof totalSize === 'undefined') ? this.whole : totalSize;
				return (totalSize / dataTotal) * value;
			}
		}
	}
});
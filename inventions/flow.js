define([
	'svg-js',
	'float',
	'grid'
], function(
	SVG,
	Float,
	Grid
) {
	SVG.Flow = SVG.invent({
		create: 'g',

		inherit: SVG.G,
		
		extend: {
			setWidth: function(width) {
				this.flowWidth = width;
				
				return this;
			},
			setPadding: function(x, y) {
				this.xPadding = x;
				this.yPadding = y;
				
				return this;
			},
			floatLeft: Float.left,
			floatRight: Float.right,
			gridLeft: Grid.left,
			gridRight: Grid.right
		},
		
		construct: {
			flow: function(width, xPadding, yPadding) {
				return this.put(new SVG.Flow)
					.setWidth(width)
					.setPadding(xPadding, yPadding);
			}
		}
	});
});
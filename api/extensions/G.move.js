/* Temporary fix for broken move() method on group elements in SVG.js when using Safari 8 */
define(['svg-js'], function(SVG) {
	SVG.extend(SVG.G, {
		move: function(x, y) {
			this.node.setAttribute('transform', 'translate(' + x + ' ' + y + ')');
		}
	});
});
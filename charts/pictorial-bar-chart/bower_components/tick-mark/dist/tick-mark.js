define(['snap', 'config'],
function(Snap,   Config) {
	return Snap.plugin(function(Snap, Element, Paper) {

		/**
		 * Plugin for drawing ticks for use on axes
		 * @param {Number} x
		 * @param {Number} y
		 * @param {String} orientation
		 * @param {Number} size
		 * @param {String} value
		 */
		Paper.prototype.tickMark = function(x, y, orientation, size, value) {
			var paper = this;
			
			if (orientation === 'horizontal') {
				var text = this.text(x - Config.TICK_MARK_HORIZONTAL_PADDING, y, value)
					.attr({
						'font-family': Config.FONT_FAMILY,
						'font-size': Config.TEXT_SIZE_SMALL,
						'font-weight': Config.TICK_MARK_FONT_WEIGHT,
						'text-anchor': 'end',
						'dominant-baseline': 'central'
					});
				var tickMark = this.g(text)
					.addClass('fm-tick-mark');
			} else if (orientation === 'vertical') {
				var line = this.line(x, y, x, y + size);
				var text = this.text(x, y + Config.TICK_MARK_VERTICAL_PADDING + Config.TEXT_SIZE_SMALL / 2, value)
					.attr({
						'font-family': Config.FONT_FAMILY,
						'font-size': Config.TEXT_SIZE_SMALL,
						'font-weight': Config.TICK_MARK_FONT_WEIGHT,
						'text-anchor': 'middle'
					});
				var tickMark = this.g(text, line)
					.addClass('fm-tick-mark');
			} else {
				console.err('Incorrect orientation specified');
			}

			return tickMark;
		};

	});
});
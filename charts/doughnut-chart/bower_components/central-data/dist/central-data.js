define(['snap', 'config', 'number-utils'],
function(Snap,   Config,   NumberUtils) {
	return Snap.plugin(function(Snap, Element, Paper) {

		Paper.prototype.centralData = function(x, y, maxWidth, titleText, valueText, totalText, colorClass, prefix, suffix) {

			totalText = 'Total: ' + prefix + NumberUtils.renderValue(totalText) + suffix;

			var mainText = titleText;
			if (valueText) {
				mainText += ': ' + valueText;
			}

			var title = this.text(x, y, mainText)
				.attr({
					'font-family': Config.FONT_FAMILY,
					'font-size': 25,
					'text-anchor': 'middle'
				})
				.addClass(colorClass);

			var titleHeight = title.getBBox().h;
			var titleWidth = title.getBBox().w;

			var total = this.text(x, y + titleHeight, totalText)
				.attr({
					'font-family': Config.FONT_FAMILY,
					'font-size': 13,
					'font-weight': 700,
					'text-anchor': 'middle'
				});

			var details = this.g(title, total)
				.addClass('fm-central-data');

			if (titleWidth > maxWidth) {
				var scaleFactor = maxWidth / titleWidth;
				title.attr({
					transform: 's' + scaleFactor
				});
			}

			return details;

		};
	});
});

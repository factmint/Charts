define(
	['config', 'snap'],
	function(Config, Snap) {
		return Snap.plugin(function(Snap, Element, Paper) {
			Paper.prototype.pictorialKey = function(xOrigin, yOrigin, width, series) {
				var paper = this;
				
				var key = paper.group().addClass('fm-pictorial-key');
				
				var glyphs = paper.group();
				
				var xTracker = Config.KEY_PADDING;
				var yTracker = Config.KEY_PADDING;
				var xLimit = width - Config.KEY_PADDING;
				
				series.forEach(function(series) {
					var keyEntry = paper.group();
					
					var glyph = paper.text(0, 0, series.glyph)
						.attr('font-size', Config.KEY_GLYPH_FONT_SIZE)
						.addClass(series.color);
					
					if (series.class !== null) {
						glyph.addClass(series.class)
					}
					
					var label = paper.text(glyph.getBBox().x2 + Config.KEY_GLYPH_RIGHT_PADDING, glyph.getBBox().cy, series.name)
						.attr({
							'font-size': Config.KEY_LABEL_FONT_SIZE,
							'font-family': Config.KEY_LABEL_FONT_FAMILY,
							'dominant-baseline': 'middle'
						})
						.addClass(series.color);
					
					keyEntry.append(glyph);
					keyEntry.append(label);
					
					var entryWidth = keyEntry.getBBox().width;
					
					if (xTracker + entryWidth > xLimit) {
						xTracker = Config.KEY_PADDING;
						yTracker += keyEntry.getBBox().height + Config.KEY_GLYPH_BOTTOM_PADDING;
					}
					
					keyEntry.transform('translate(' + xTracker + ',' + yTracker + ')');
					
					glyphs.append(keyEntry);
					
					xTracker += entryWidth + Config.KEY_GLYPH_LEFT_PADDING;
				});
				
				var backgroundRectangle = paper.rect(xOrigin, yOrigin, width, glyphs.getBBox().height + Config.KEY_PADDING);
					
				var borderTop = paper.line(xOrigin, yOrigin, xOrigin + width, yOrigin);
				
				var glyphsXOrigin = xOrigin + (width - glyphs.getBBox().x2) / 2;
				var glyphsYOrigin = yOrigin + Config.KEY_PADDING;
				glyphs.transform('translate(' + glyphsXOrigin + ',' + glyphsYOrigin + ')');
					
				key.append(backgroundRectangle);
				key.append(borderTop);
				key.append(glyphs);
				
				return key;
			}
		});
	}
);
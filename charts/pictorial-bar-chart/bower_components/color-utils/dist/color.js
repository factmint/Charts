define(function() {
	return {
		colorWheelClasses: [
			'fm-datum-color-wheel-a',
			'fm-datum-color-wheel-b',
			'fm-datum-color-wheel-c',
			'fm-datum-color-wheel-d',
			'fm-datum-color-wheel-e',
			'fm-datum-color-wheel-f',
			'fm-datum-color-wheel-g',
			'fm-datum-color-wheel-h',
			'fm-datum-color-wheel-i',
			'fm-datum-color-wheel-j',
			'fm-datum-color-wheel-k',
			'fm-datum-color-wheel-l'
		],
		overflowClass: 'fm-datum-color-overflow',
		pad: function(number) {
			if (number.length < 2) {
				return "0" + number;
			} else {
				return number;
			}
		},
		contrasting: function(colors) {
			throw "Not yet implemented";
		},
		registerTint1Filter: function() {
			throw "Not yet implemented";
		},
		registerTint2Filter: function() {
			throw "Not yet implemented";
		},
		lowContrast: function (outputSize, offset) {
			offset = (typeof offset === 'undefined') ? 0 : offset;
			if (outputSize + offset > this.colorWheelClasses.length) {
				var result = [];
				for (var colorClassIndex = 0; colorClassIndex < outputSize; colorClassIndex++) {
					if (colorClassIndex < this.colorWheelClasses.length) {
						result.push(this.colorWheelClasses[colorClassIndex]);
					} else {
						result.push(this.colorWheelClasses[this.colorWheelClasses.length - colorClassIndex]);
					}
				}
				return result;
			} else {
				return this.colorWheelClasses.splice(offset, outputSize);
			}
		},
		monochromatic: function (color, outputSize, darken) {
			throw "Not yet implemented";
		},
		harmonious: function (numberberOfColors) {
		
			var size = Math.min(numberberOfColors, this.colorWheelClasses.length);

			var colorIndices = [];
			
			var halfWheel = Math.floor(this.colorWheelClasses.length / 2);

			var doesWheelIncludeNorthAndSouth = function() {
				return (this.colorWheelClasses.length % 4 == 0);
			}.bind(this);

			function wheelFitsTetrad(seperationBetweenTetradCorners) {
				return (seperationBetweenTetradCorners <= halfWheel - 2);
			}
				
			var addTetrad = function(start, seperationBetweenTetradCorners) {
				start = (start + this.colorWheelClasses.length) % this.colorWheelClasses.length;
				
				var colorIndexOffset = Math.floor(colorIndices.length / 4) + 1;
					
				if (colorIndices.length < size) {
					var corner1 = start;
					colorIndices.splice(1 * colorIndexOffset - 1, 0, corner1);
				}

				if (colorIndices.length < size) {
					var corner2 = (start + seperationBetweenTetradCorners + 1) % this.colorWheelClasses.length;
					colorIndices.splice(2 * colorIndexOffset - 1, 0, corner2);
				}

				if (colorIndices.length < size) {
					var corner3 = (start + halfWheel) % this.colorWheelClasses.length;
					colorIndices.splice(3 * colorIndexOffset - 1, 0, corner3);
				}

				if (colorIndices.length < size) {
					var corner4 = (start + seperationBetweenTetradCorners + 1 + halfWheel) % this.colorWheelClasses.length;
					colorIndices.splice(4 * colorIndexOffset - 1, 0, corner4);
				}
			}.bind(this);
				
			var addPoint = function(point, position) {
				point = (point + this.colorWheelClasses.length) % this.colorWheelClasses.length;
				colorIndices.splice(position, 0, point);
			}.bind(this);
			
			// This loops through neighbouring tetrads
			for (
				var seperationBetweenTetradCorners = 1, firstTetradCorner = 0;
				wheelFitsTetrad(seperationBetweenTetradCorners);
				seperationBetweenTetradCorners += 2, firstTetradCorner--
			) {
				addTetrad(firstTetradCorner, seperationBetweenTetradCorners);
			}
			
			var colorIndexOffset = colorIndices.length / 4;
			// 9 o'clock
			if (colorIndices.length < size) {
				addPoint(1, colorIndexOffset);
			}
			// 3 o'clock
			if (colorIndices.length < size) {
				addPoint(1 + halfWheel, colorIndexOffset * 3 + 1);
			}
			
			if (doesWheelIncludeNorthAndSouth()) {
				// 12 o'clock
				if (colorIndices.length < size) {
					addPoint(1 + halfWheel / 2, colorIndexOffset * 2 + 1);
				}
				// 6 o'clock
				if (colorIndices.length < size) {
					addPoint(1 + halfWheel * 3/2, colorIndexOffset * 4 + 3);
				}
			}
			
			var colors = [];
			for (var x = 0; x < numberberOfColors; x++) {
				colors.push(this.colorWheelClasses[colorIndices[x % size]]);
			}
				
			return colors;
		}
	}
});
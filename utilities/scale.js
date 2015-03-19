define(function() {
	var Projection = function() {
		this.domain = null;
		this.range = null;
	
		this.map = function(value) {
			var proportion = this.domain.getProportion(value);
			return this.range.getValue(proportion);
	  };
	};

	/**
	 * Generates and returns an array of tick values
	 * Taken from Graphic Gems 1 - Nice Numbers for Graph Labels
	 * @link: http://inis.jinr.ru/sl/vol1/CMC/Graphics_Gems_1,ed_A.Glassner.pdf
	 * @link: https://github.com/erich666/GraphicsGems/blob/master/gems/Label.c
	 *
	 * @param	{Number} minValue
	 * @param	{Number} maxValue
	 * @param	{Number} targetMarkerCount
	 * @param {Boolean} padExtraTick  Adds an extra tick mark to the beginning
	 *                                and end
	 * @return {Array}
	 */
	function getTickMarks(minValue, maxValue, targetMarkerCount, padExtraTick) {

		var decimalPlaces = 0;
		var tickSpacing = 0;
		var graphMin = 0;
		var graphMax = 0;
		var range = 0;
		var value = 0;
		var values = [];
		var startPoint = 0;
		var endPoint = 0;
		
		if (minValue == maxValue) {
			var padding = (maxValue !== 0) ? maxValue / 10 : 1;
			
			minValue -= padding;
			maxValue += padding;
		}

		range = maxValue - minValue;
		
		tickSpacing = getNiceNumber(range / (targetMarkerCount - 1), true);
		
		graphMin = Math.floor(minValue / tickSpacing) * tickSpacing;
		graphMax = Math.ceil(maxValue / tickSpacing) * tickSpacing;
		decimalPlaces = Math.max(-Math.floor(log10(tickSpacing)), 1);

		startPoint = graphMin;
		endPoint = graphMax + 0.5 * tickSpacing;
		if (padExtraTick) {
			if (startPoint !== 0) {
				startPoint -= tickSpacing;	
			}
			endPoint += tickSpacing;
		}

		for (value = startPoint; value < endPoint; value += tickSpacing) {
			values.push(parseFloat(value.toFixed(decimalPlaces)));
		}

		return values;

		/**
		 * Returns the base 10 logarithm of a number
		 * @param	{Number} value
		 * @return {Number}
		 */
		function log10(value) {
			return Math.log(value) / Math.LN10;
		}


		/**
		 * Returns a nice looking number
		 * @param	{Number} value
		 * @param	{Boolean} roundNumber
		 * @return {Number}
		 */
		function getNiceNumber(value, roundNumber) {

			var exponentValue = 0;
			var fractionalValue = 0;
			var niceRoundFraction = 0;

			exponentValue = Math.floor(log10(value));
			fractionalValue = value / Math.pow(10, exponentValue);

			if (roundNumber) {
				if (fractionalValue < 1.5) {
					niceRoundFraction = 1;
				}
				else if (fractionalValue < 3) {
					niceRoundFraction = 2;
				}
				else if (fractionalValue < 7) {
					niceRoundFraction = 5;
				}
				else {
					niceRoundFraction = 10;
				}
			}
			else {
				if (fractionalValue <= 1) {
					niceRoundFraction = 1;
				}
				else if (fractionalValue <= 2) {
					niceRoundFraction = 2;
				}
				else if (fractionalValue <= 5) {
					niceRoundFraction = 5;
				}
				else {
					niceRoundFraction = 10;
				}
			}

			return niceRoundFraction * Math.pow(10, exponentValue);

		}

	}
	 
	return {
		project: function(domain) {
			var projection = new Projection();
	
			projection.domain = domain;
		
			return {
				onto: function(range) {
					projection.range = range;
			
					return projection;
				}
			};
		},
		domains: {
			RealNumbers: function(min, max) {
				this.tickMarks = getTickMarks(min, max, 4, false);
				
				this.min = this.tickMarks[0];
				this.max = this.tickMarks[this.tickMarks.length - 1];
	
				this.getProportion = function(value) {
					return (value - this.min) / (this.max - this.min);
				};
			}
		},
		ranges: {
			Angle: function(start, end) {
				if (start === undefined) {
					start = 0;
				}
	
				if (end === undefined) {
					end = 2 * Math.PI;
				}
	
				this.getValue = function(proportion) {
					var angle = start + (end - start) * proportion;

					if (angle > 2 * Math.PI) {
						angle = angle % 2 * Math.PI;
					} else if (angle < 0) {
						while (angle < 0) {
							angle += 2 * Math.PI;
						}
					}

					return angle;
				};
			},
			Chromatic: {},
			Linear: function(start, end) {
				if (start === undefined || end === undefined) {
					throw "Both start and end points must be defined for linear scales.";
				}
	
				this.getValue = function(proportion) {
					return start + (end - start) * proportion;
				};
			},
			Logarithmic: {},
			PointOnPath: {}
		}
	};

});
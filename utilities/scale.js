define(function() {
	var Projection = function() {
		this.domain = null;
		this.range = null;
	};

	Projection.prototype.map = function(value) {
		var proportion = this.domain.getProportion(value);
		return this.range.getValue(proportion);
	};

	function getIncrements(start, end, numberOfIncrements) {
		var range = end - start;
		var numberOfRegions = numberOfIncrements - 1;
		var niceIncrement = getNiceIncrement(range, numberOfRegions);

		var rangeOfIncrements = niceIncrement * numberOfRegions;

		if (rangeOfIncrements > range) {
			if (start >= 0 && start < niceIncrement) {
				start = 0;
			} else {
				start -= (rangeOfTicks - range) / 2;
			}
		}

		var increments = [];

		var counter = start;
		while (increments.length < numberOfIncrements) {
			increments.push(counter);
			counter += niceIncrement;
		}

		return increments;
	}

	function getNiceIncrement(range, numberOfRegions) {
		var uglyIncrement = range / numberOfRegions;

		var order = Math.floor(Math.log(uglyIncrement) / Math.LN10);
		var divisor = Math.pow(10, order);

		return Math.ceil(uglyIncrement / divisor) * divisor;
	}
	 
	var numberOfIncrements = 4;
	
	return function() {
		return {
			withIncrements: function(increments) {
				numberOfIncrements = increments;

				return this;
			},
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
					this.increments = getIncrements(min, max, numberOfIncrements, false);
					
					this.min = this.increments[0];
					this.max = this.increments[this.increments.length - 1];
		
					this.getProportion = function(value) {
						return (value - this.min) / (this.max - this.min);
					};

					return this;
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
					
					return this;
				},
				Logarithmic: {},
				PointOnPath: {}
			}
		}
	};

});
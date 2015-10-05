define(function() {
	var Projection = function() {
		this.domain = null;
		this.range = null;
	};

	Projection.prototype.map = function(value) {
		var proportion = this.domain.getProportion(value);
		return this.range.getValue(proportion);
	};
	
	function bottomUpIncrements(start, end, numberOfIncrements, incrementSize) {
		var rangeOfScale = end - start;
		var rangeOfIncrements = incrementSize * numberOfIncrements;

		if (rangeOfIncrements > end) {
			if (start >= 0 && start < incrementSize) {
				start = 0;
			} else {
				start -= (rangeOfIncrements - rangeOfScale) / 2;
			}
		}

		var increments = [];

		var counter = start;
		while (increments.length < numberOfIncrements + 1) {
			increments.push(counter);
			counter += incrementSize;
		}
		
		return increments;
	}
	
	function middleOutIncrements(start, end, incrementSize) {
		var increments = [];

		var counter;
		for (counter = 0; counter < end; counter += incrementSize) {
			increments.push(counter);
		}
		increments.push(counter);
		
		for (counter = -incrementSize; counter > start; counter -= incrementSize) {
			increments.unshift(counter);
		}
		increments.unshift(counter);
		
		return increments;
	}

	function getIncrements(start, end, numberOfIncrements) {
		var straddlesZero = end * start < 0;
		
		var range = end - start;
		
		var numberOfRegions = numberOfIncrements - 1;
		var incrementSize = getNiceIncrement(range, numberOfRegions);

		var increments;
		if (straddlesZero) {
			increments = middleOutIncrements(start, end, incrementSize);
		} else {
			increments = bottomUpIncrements(start, end, numberOfIncrements, incrementSize);
		}

		return increments;
	}

	function getNiceIncrement(range, numberOfRegions) {
		var uglyIncrement = range / numberOfRegions;

		var order = Math.floor(Math.log(uglyIncrement) / Math.LN10);
		var divisor = Math.pow(10, order);

		return Math.ceil(uglyIncrement / divisor) * divisor;
	}
	 
	var numberOfIncrements = 0;
	
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
					if (numberOfIncrements > 0) {
						this.increments = getIncrements(min, max, numberOfIncrements, false);
					
						this.min = this.increments[0];
						this.max = this.increments[this.increments.length - 1];
					} else {
						this.min = min;
						this.max = max;
					}
		
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
					
					return this;
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
define(function() {
	var Projection = function() {
		this.domain = null;
		this.range = null;
	
		this.map = function(value) {
			var proportion = this.domain.getProportion(value);
			return this.range.getValue(proportion);
	  };
	};
	 
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
				var tickMarks = [min, max]; // would actually be "getTickMarks"
				this.min = tickMarks[0];
				this.max = tickMarks[tickMarks.length - 1];
	
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
define(function() {
	return {
		left: function() {
			var xTracker = 0;
			var yTracker = 0;
			var rowBottom = 0;
			
			var xPadding = this.xPadding;
			var yPadding = this.yPadding;
			var flowWidth = this.flowWidth;

			this.children().forEach(function(element, index) {
				var bbox = element.bbox();
				
				if (bbox.height + yTracker > rowBottom) {
					rowBottom = bbox.height + yTracker;
				}
				
				if (xTracker + bbox.width > flowWidth) {
					xTracker = 0;
					yTracker = rowBottom + yPadding;
				}
				
				element.move(xTracker, yTracker);
				xTracker += bbox.width + xPadding;
			});
		},
		
		right: function() {
			var xTracker = this.flowWidth;
			var yTracker = 0;
			var rowBottom = 0;
			
			var xPadding = this.xPadding;
			var yPadding = this.yPadding;
			var flowWidth = this.flowWidth;
			
			this.children().forEach(function(element, index) {
				var bbox = element.bbox();
				
				if (bbox.height + yTracker > rowBottom) {
					rowBottom = bbox.height + yTracker;
				}
				
				if (xTracker - bbox.width < 0) {
					xTracker = flowWidth;
					yTracker = rowBottom + yPadding;
				}
				
				xTracker -= bbox.width;
				element.move(xTracker, yTracker);
				xTracker -= xPadding;
			});
		}
	};
});
define(function() {
	
	function getTotalWidth(elements) {
		var elementWidths = [];
		elements.forEach(function(element) {
			elementWidths.push(element.bbox().width);
		});

		return elementWidths.reduce(function(previousWidth, currentWidth) {
			return previousWidth + currentWidth;
		});
	}


	return function() {

		var totalWidth = getTotalWidth(this.children()) + this.xPadding * (this.children().length - 1);
		
		var xTracker = (this.flowWidth / 2) - (totalWidth / 2);

		this.children().forEach(function(element) {
			element.move(xTracker, 0);
			xTracker += element.bbox().width + this.xPadding;
		}.bind(this));

	};
});
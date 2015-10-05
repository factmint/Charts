define(function() {
	function getCellSize(elements) {
		var size = {
			height: 0,
			width: 0
		};
		
		elements.forEach(function(element) {
			var bbox = element.bbox();
			
			if (bbox.width > size.width) size.width = bbox.width;
			if (bbox.height > size.height) size.height = bbox.height;
		});
		
		return size;
	}
	
	return {
		left: function() {
			var size = getCellSize(this.children());
			
			var numberOfColumns = Math.floor((this.flowWidth + this.xPadding) / (size.width + this.xPadding));
			if (numberOfColumns < 1) numberOfColumns = 1;
			
			var xPadding = this.xPadding;
			var yPadding = this.yPadding;
			
			this.children().forEach(function(element, index) {
				var column = index % numberOfColumns;
				var row = Math.floor(index / numberOfColumns);
				
				var x = column * (size.width + xPadding);
				var y = row * (size.height + yPadding);
				
				element.move(x, y);
			});
		},
		
		right: function() {
			var size = getCellSize(this.children());
			
			var numberOfColumns = Math.floor((this.flowWidth + this.xPadding) / (size.width + this.xPadding));
			if (numberOfColumns < 1) numberOfColumns = 1;
			
			var xPadding = this.xPadding;
			var yPadding = this.yPadding;
			var flowWidth = this.flowWidth;
			
			this.children().forEach(function(element, index) {
				var column = index % numberOfColumns;
				var row = Math.floor(index / numberOfColumns);
				
				var x = flowWidth - column * (xPadding + size.width) - element.bbox().width;
				var y = row * (size.height + yPadding);
				
				element.move(x, y);
			});
		}
	};
});
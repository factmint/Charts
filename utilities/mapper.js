define(function() {
	
	var HtmlTable = function(tableNode) {
		this.keys = tableNode.querySelectorAll('thead > tr > th');
		this.rows = tableNode.querySelectorAll('tbody > tr');
	};

	HtmlTable.prototype.mapRows = function(callback) {
		if (typeof callback != "function") {
			throw new TypeError();
		}

		var headerRowObject = [];
		for (var keyIndex = 0; keyIndex < this.keys.length; keyIndex++) {
			headerRowObject.push(this.keys[keyIndex].textContent);
		}

		var dataObject = [];
		for (var rowIndex = 0; rowIndex < this.rows.length; rowIndex++) {
			var currentRow = this.rows[rowIndex];
			var rowObject = [];
			var classes = currentRow.classList;
			var attributes = currentRow.attributes;

			for (var columnIndex = 0; columnIndex < this.rows[rowIndex].children.length; columnIndex++) {
				rowObject.push(this.rows[rowIndex].children[columnIndex].textContent);
			}
			
			var dataItem = callback(rowObject, rowIndex, currentRow, headerRowObject, classes, attributes);
			if (dataItem) {
				dataObject.push(dataItem);
			}
		}

		return dataObject;
	};

	HtmlTable.prototype.forEachRows = function(callback) {
		if (typeof callback != "function") {
			throw new TypeError();
		}

		var headerRowObject = [];
		for (var keyIndex = 0; keyIndex < this.keys.length; keyIndex++) {
			headerRowObject.push(this.keys[keyIndex].textContent);
		}

		var dataObject = [];
		for (var rowIndex = 0; rowIndex < this.rows.length; rowIndex++) {
			var currentRow = this.rows[rowIndex];
			var rowObject = [];
			var classes = currentRow.classList;
			var attributes = currentRow.attributes;

			for (var columnIndex = 0; columnIndex < this.rows[rowIndex].children.length; columnIndex++) {
				rowObject.push(this.rows[rowIndex].children[columnIndex].textContent);
			}
			
			callback(rowObject, rowIndex, currentRow, headerRowObject, classes, attributes);
		}

		return dataObject;
	};

	HtmlTable.prototype.reduceRows = function(callback, reduction) {
		if (typeof callback != "function") {
			throw new TypeError();
		}
		
		if (typeof reduction === "undefined") {
			reduction = 0;
		}

		var headerRowObject = [];
		for (var keyIndex = 0; keyIndex < this.keys.length; keyIndex++) {
			headerRowObject.push(this.keys[keyIndex].textContent);
		}

		for (var rowIndex = 0; rowIndex < this.rows.length; rowIndex++) {
			var currentRow = this.rows[rowIndex];
			var rowObject = [];
			var classes = currentRow.classList;
			var attributes = currentRow.attributes;

			for (var columnIndex = 0; columnIndex < this.rows[rowIndex].children.length; columnIndex++) {
				rowObject.push(this.rows[rowIndex].children[columnIndex].textContent);
			}
			
			reduction = callback(reduction, rowObject, rowIndex, currentRow, headerRowObject, classes, attributes);
		}

		return reduction;
	};

	return HtmlTable;

});
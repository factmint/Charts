define(function() {
	return {
		sortDataByValue: function(a, b) {
			return b.value - a.value
		},
		tableToJSON: function(container) {

			var GROUP_COLUMN_INDEX = 4;
			
			function DataSet(){
				this._cacheRange = null;
				this.xLabel = null;
				this.yLabel = null;
				this.keys = null;
				this.rows = null;
			}

			DataSet.prototype = {
				"constructor": DataSet,
				"getRange": function(key) {
					var index = -1;

					if (typeof key === "string"){
						index = this.keys[key];
					} else {
						index = key;
					}

					// Check the cache
					if (! this._cacheRange[index]) {
						var min = Number.MAX_VALUE,
							max = Number.MIN_VALUE,
							value = 0;

						this.rows.forEach(function(row) {
							value = row[index];
							if (value < min) { min = value; }
							if (value > max) { max = value; }
						});
				
						var yRange = max - min;

						this._cacheRange[index] = {
							"max": max,
							"min": min
						};
					}
					return this._cacheRange[index];
				}
			};

			var keys;
			var dataItemIndex = 0;
			var numberOfRows;
			var numberOfColumns;
			var columnIndex = -1;
			var dataSet = new DataSet();
			var value;

			// Get the table column headers
			dataSet.keys = {};
			Array.prototype.forEach.call(container.rows[0].cells, function(cell, index) {
				if (index === 1) {
					dataSet.xLabel = cell.textContent;
				} else if (index === 2) {
					dataSet.yLabel = cell.textContent;
				}
				dataSet.keys[cell.textContent] = index;
			});
			numberOfColumns = container.rows[0].cells.length;

			numberOfRows = container.rows.length;
			// Minus the column header
			dataSet.rows = new Array(numberOfRows - 1);
			dataSet._cacheRange = new Array(numberOfRows - 1);
			while (++ dataItemIndex < numberOfRows) {
				dataSet.rows[dataItemIndex - 1] = new Array(numberOfColumns);
				columnIndex = -1;
				while (++ columnIndex < numberOfColumns) {
					if (container.rows[dataItemIndex].cells[columnIndex]) {
						value = container.rows[dataItemIndex].cells[columnIndex].textContent.split(',').join('');	
					} else {
						if (columnIndex === GROUP_COLUMN_INDEX) {
							value = "Other";
						}
					}
					
					if (! isNaN(value)) {
						value = parseFloat(value);
					}
					dataSet.rows[dataItemIndex - 1][columnIndex] = value;
				}
			}

			return dataSet;
		}
	}
});
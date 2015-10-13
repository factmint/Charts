define(
function() {
	return {
		tableToJSON: function(container) {

			function DataSet() {
				this.keys = [];
				this.rows = [];
				this.xRange = {
					min: null,
					max: null,
				};
				this.yRange = {
					min: null,
					max: null
				};
				this.xLabel = null;
				this.yLabel = null;
			}

			DataSet.prototype = {
				"constructor": DataSet
			};

			var VALUE_REGEX = /^\-?[0-9]+(,[0-9]{3})*(\.[0-9]+)?$/;

			var keys = container.querySelectorAll('thead > tr > th');
			var rows = container.querySelectorAll('tbody > tr');
			var data = new DataSet();

			for (var keyIndex = 0; keyIndex < keys.length; keyIndex++) {
				if (keyIndex === 1) {
					data.xLabel = keys[keyIndex].textContent;
				} else if (keyIndex === 2) {
					data.yLabel = keys[keyIndex].textContent;
				}
				
				data.keys.push({
					title: keys[keyIndex].textContent
				});
			}

			for (var rowIndex = 0; rowIndex < rows.length; rowIndex++) {
				if (
					rows[rowIndex].children[0] &&
					rows[rowIndex].children[1] &&
					rows[rowIndex].children[1].textContent.match(VALUE_REGEX) &&
					rows[rowIndex].children[2] &&
					rows[rowIndex].children[2].textContent.match(VALUE_REGEX)
				) {
					var label = rows[rowIndex].children[0].textContent;
					var xCoord = parseFloat(rows[rowIndex].children[1].textContent.replace(/,([0-9]{3})/g, '$1'));
					var yCoord = parseFloat(rows[rowIndex].children[2].textContent.replace(/,([0-9]{3})/g, '$1'));

					var groupBy = (rows[rowIndex].children[3]) ? rows[rowIndex].children[3].textContent : null;

					if (data.xRange.min === null || data.xRange.min > xCoord) {
						data.xRange.min = xCoord;
					}

					if (data.yRange.min === null || data.yRange.min > yCoord) {
						data.yRange.min = yCoord;
					}

					if (data.xRange.max === null || data.xRange.max < xCoord) {
						data.xRange.max = xCoord;
					}

					if (data.yRange.max === null || data.yRange.max < yCoord) {
						data.yRange.max = yCoord;
					}

					data.rows.push({
						title: label,
						x: xCoord,
						y: yCoord,
						group: groupBy
					});
				}
			}
			
			var yRange = data.yRange.max - data.yRange.min;
			data.yRange.min -= yRange * 0.1;
			data.yRange.max += yRange * 0.1;

			return data;

		}
	}
});
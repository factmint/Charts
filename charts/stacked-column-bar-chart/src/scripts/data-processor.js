define(
function() {
	return {
		tableToJSON: function(container, options) {

			function DataSet() {
				this.series = [];
				this.rows = [];
				this.range = {
					min: null,
					max: null
				};
				this.labels = [];
			}

			DataSet.prototype = {
				"constructor": DataSet
			};
			
			var pulloutItems = [];
			if (options.pulloutItems) {
				pulloutItems = options.pulloutItems.split(',');
			}

			var VALUE_REGEX = /^[0-9]+(,[0-9]{3})*(\.[0-9]+)?$/;

			var series = container.querySelectorAll('thead > tr > th');
			var rows = container.querySelectorAll('tbody > tr');
			var data = new DataSet();

			for (var seriesIndex = 1; seriesIndex < series.length; seriesIndex++) {
				dataObject = {
					title: series[seriesIndex].textContent
				};
				
				var colorOverride = series[seriesIndex].getAttribute("data-fm-color");
				if (colorOverride) dataObject.colorOverride = colorOverride;
				
				data.series.push(dataObject);
			}

			for (var rowIndex = 0; rowIndex < rows.length; rowIndex++) {
				if (rows[rowIndex].children[0]) {
					var label = rows[rowIndex].children[0].textContent;
					data.labels.push(label);
					
					var pullout = false;
					if (pulloutItems.indexOf(String(rowIndex + 1)) !== -1 || pulloutItems.indexOf(label) !== -1) {
						pullout = true;
					}

					var dataObject = {
						key: rowIndex,
						title: label,
						values: [],
						total: 0,
						pullout: pullout
					};
					
					var colorOverride = rows[rowIndex].getAttribute("data-fm-color");
					if (colorOverride) dataObject.colorOverride = colorOverride;

					data.rows.push(dataObject);

					for (var seriesIndex = 1; seriesIndex < rows[rowIndex].children.length; seriesIndex++) {
						var dataValue = null;
	
						if (rows[rowIndex].children[seriesIndex].textContent.match(VALUE_REGEX)) {
							dataValue = parseFloat(rows[rowIndex].children[seriesIndex].textContent.replace(/,([0-9]{3})/g, '$1'));
						}

						if (data.range.min === null || data.range.min > dataValue) {
							data.range.min = dataValue;
						}

						if (data.range.max === null || data.range.max < dataValue) {
							data.range.max = dataValue;
						}

						data.rows[rowIndex].values.push({
							value: dataValue
						});
						
						data.rows[rowIndex].total += dataValue;
					}
				}
			}

			return data;

		}
	}
});
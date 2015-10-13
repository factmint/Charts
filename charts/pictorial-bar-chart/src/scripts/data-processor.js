define(['color-utils', 'number-utils', 'config'],
	function(ColorUtils, NumberUtils, Config) {

		var VALUE_REGEX = /^\-?[0-9]+(,[0-9]{3})*(\.[0-9]+)?$/;

		function DataSet() {
			this.groups = [];
			this.series = [];
			this.data = {};
			this.rows = {};
			this.unitValue = 1;
		}
		
		return {
			tableToJSON: function(container, options) {

				var series = container.querySelectorAll('thead > tr > th');
				var rows = container.querySelectorAll('tbody > tr');
				var data = new DataSet();
				
				var prefix = (options.valuePrefix) ? options.valuePrefix : '';
				var suffix = (options.valueSuffix) ? options.valueSuffix : '';
				
				var defaultColors = ColorUtils.harmonious(series.length);

				for (var seriesIndex = 1; seriesIndex < series.length; seriesIndex++) {
					var seriesName = series[seriesIndex].textContent;
					var seriesGlyph = series[seriesIndex].hasAttribute('data-fm-glyph') ? series[seriesIndex].getAttribute('data-fm-glyph') : seriesName.substr(0, 1).toUpperCase();
					var seriesClass = series[seriesIndex].getAttribute('data-fm-glyph-class');
					var seriesColor = defaultColors[seriesIndex];
					
					data.series.push({
						name: seriesName,
						glyph: seriesGlyph,
						class: seriesClass,
						color: seriesColor
					});
				}

				for (var groupIndex = 0; groupIndex < rows.length; groupIndex++) {
					var group = rows[groupIndex];
					if (group.children.length < 2) continue;

					var groupName = group.children[0].textContent;
					data.groups.push(groupName);
					
					var values = [];
					var total = 0;

					for (var columnIndex = 1; columnIndex < group.children.length; columnIndex++) {
						var column = group.children[columnIndex].textContent;

						if (column.match(VALUE_REGEX)) {
							
							var value = parseFloat(column.replace(/,([0-9]{3})/g, '$1'));

							values.push({
								value: value,
								text: prefix + NumberUtils.renderValue(value) + suffix
							});
							
							total += value;
						} else {
							values.push(null);
						}
					}
					
					var row = [];
					var remainders = [];
					
					var unitValue = total / Config.GLYPHS_ACROSS;
					var missingUnits = Config.GLYPHS_ACROSS;
					
					values.forEach(function(value, index) {
						var numberOfUnits = value.value / unitValue;
						value.numberOfUnits = Math.floor(numberOfUnits);
						
						missingUnits -= value.numberOfUnits;
						
						remainders.push({
							index: index,
							remainder: numberOfUnits % 1
						});
					});
					
					remainders.sort(function(a, b) {
						return b.remainder - a.remainder;
					});
					
					while (missingUnits > 0) {
						var greatestRemainder = remainders.shift();
						values[greatestRemainder.index].numberOfUnits++;
						missingUnits--;
					}
					
					data.data[groupName] = values;
					data.rows[groupName] = values.reduce(function(row, nextValues, seriesIndex) {
						for (var cellIndex = 0; cellIndex < nextValues.numberOfUnits; cellIndex++) {
							row.push(seriesIndex);
						}
						
						return row;
					}, new Array());
				}

				return data;
			}
		};
	});
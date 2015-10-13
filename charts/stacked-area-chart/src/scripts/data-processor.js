define(['config', 'number-utils', 'moment'],
	function(Config, NumberUtils, Moment) {

		function DataSet() {
			this.keys = [];
			this.rows = [];
			this.numberOfSeries = 0;
			this.yRange = {
				min: null,
				max: null
			};
			this.xLabels = [];
		}
		
		function calculateYAverage(ySeries) {
			var numberOfSeriesEntries = 0;
			var yTotal = ySeries.reduce(function(sum, y) {
				if (y !== null) {
					numberOfSeriesEntries++;
					return sum + y.runningTotal;	
				} else {
					return sum;
				}
			}, 0);
			
			return yTotal / numberOfSeriesEntries;
		}
		
		return {
			tableToJSON: function(container, options) {
				var dateFormat = (options.dateFormat) ? options.dateFormat : 'DD/MM/YYYY';
				var includeZero = options.includeZero;
				var prefix = (options.valuePrefix) ? options.valuePrefix : '';
				var suffix = (options.valueSuffix) ? options.valueSuffix : '';
				var abbreviateLabels = (options.width < Config.ABBREVIATE_LABELS_THRESHOLD);
				
				var displayDateFormat = dateFormat;
				if (abbreviateLabels) {
					displayDateFormat = displayDateFormat
						.replace(/YYYY/g, 'YY')
						.replace(/MMM/g, '[__]M[__]')
						.replace(/MM/g, 'M')
						.replace(/[\/\-]/g, '[.]')
						.replace(/\s/g, '[.]');
				}

				var VALUE_REGEX = /^\-?[0-9]+(,[0-9]{3})*(\.[0-9]+)?$/;

				var keys = container.querySelectorAll('thead > tr > th');
				var rows = container.querySelectorAll('tbody > tr');
				var data = new DataSet();

				for (var keyIndex = 1; keyIndex < keys.length; keyIndex++) {
					data.keys.push(keys[keyIndex].textContent);
				}

				for (var rowIndex = 0; rowIndex < rows.length; rowIndex++) {
					var row = rows[rowIndex];
					if (row.children.length < 2) continue;

					if (row.children.length - 1 > data.numberOfSeries) {
						data.numberOfSeries = row.children.length - 1;
					}

					var xLabel = row.children[0].textContent;
					var ySeries = [];
					
					var runningTotalYValue = 0;

					var skipRow = false;
					for (var columnIndex = 1; columnIndex < row.children.length; columnIndex++) {
						var column = row.children[columnIndex].textContent;

						var yAnnotation = null;
						if (column.match(/#/)) {
							yAnnotation = column.replace(/.*#/, '')
							column = column.replace(/#.*/, '');
						};
						if (column.match(VALUE_REGEX)) {
							
							var yValue = parseFloat(column.replace(/,([0-9]{3})/g, '$1'));
							
							runningTotalYValue += yValue;

							ySeries.push({
								value: yValue,
								runningTotal: runningTotalYValue,
								text: prefix + NumberUtils.renderValue(yValue) + suffix,
								annotation: yAnnotation
							});
							
							if (runningTotalYValue > data.yRange.max || data.yRange.max === null) {
								data.yRange.max = runningTotalYValue;
							}
							if (runningTotalYValue < data.yRange.min || data.yRange.min === null) {
								data.yRange.min = runningTotalYValue;
							}
						} else {
							console.error('Warning: Row ' + columnIndex + ' was skipped because it contained an invalid number (' + column + ')');
							skipRow = true;
						}
					}
					
					if (! skipRow) {
						data.rows.push({
							xLabel: xLabel,
							ySeries: ySeries,
							averageYValue: calculateYAverage(ySeries)
						});
					}
				}
			
				var first = data.rows[0].xLabel;
				var last = data.rows[data.rows.length - 1].xLabel;
				
				var firstDate = Moment(first, dateFormat, true);
				var lastDate = Moment(last, dateFormat, true);
				
				var dateGranularity = null;
				
				if (firstDate.isValid() && lastDate.isValid()) {
					
					data.rows.sort(function(a, b) {
						return Moment(a.xLabel, dateFormat, true) - Moment(b.xLabel, dateFormat, true);
					});

					if (dateFormat.match(/[Dd]/)) {
						dateGranularity = 'days';
					} else if (dateFormat.match(/[Mm]/)) {
						dateGranularity = 'months';
					} else {
						dateGranularity = 'years';
					}
					
					var fillData = [];
					var tomorrow = Moment(first, dateFormat).add(1, 'days');
					
					var existingKeys = data.rows.map(function(row) {
						if (abbreviateLabels) {
							row.xLabel = Moment(row.xLabel, dateFormat, true).format(displayDateFormat);
						}
						return row.xLabel;	
					});
					
					data.rows.forEach(function(datum) {
						var nextRecordedDay = Moment(datum.xLabel, displayDateFormat, true);
						
						for (; tomorrow < nextRecordedDay; tomorrow.add(1, dateGranularity)) {
							var fillerDateLabel = tomorrow.format(displayDateFormat);
							
							if (existingKeys.indexOf(fillerDateLabel) !== -1) {
								continue; // (If we are adding days and the date format only shows months, for example)
							} else {
								existingKeys.push(fillerDateLabel);
							}
							
							fillData.push({
								xLabel: fillerDateLabel,
								isFill: true
							});
						}
						
						tomorrow = nextRecordedDay.add(1, dateGranularity);
					});
					
					data.rows = data.rows.concat(fillData);
					data.rows.sort(function(a, b) {
						return Moment(a.xLabel, displayDateFormat) - Moment(b.xLabel, displayDateFormat);
					});
				}
				
				data.rows.forEach(function(row) {
					data.xLabels.push(row.xLabel);
				});
				
				while (
					(data.xLabels.length - 1) % Config.TARGET_MARKER_COUNT !== 0
					&&
					(data.xLabels.length - 1) % (Config.TARGET_MARKER_COUNT - 1) !== 0
				) {
					last = data.xLabels[data.xLabels.length - 1];
					
					var padding = '…';
					
					var penultimate = data.xLabels[data.xLabels.length - 2];
					if (typeof(last) == 'number' && typeof(penultimate) == 'number') {
						padding = last + last - penultimate;
					} else if (dateGranularity !== null) {
						lastDate = Moment(last + " +0000", displayDateFormat + ' Z', true);
						
						var paddingDate = lastDate.add(1, dateGranularity);
							
						padding = paddingDate.format(displayDateFormat);
					}
					
					data.xLabels.push(padding);
				}
				
				if (abbreviateLabels) {
					data.xLabels = data.xLabels.map(function(label) {
						return label
							.replace(/__1__/, 'j')
							.replace(/__2__/, 'f')
							.replace(/__3__/, 'm')
							.replace(/__4__/, 'a')
							.replace(/__5__/, 'm')
							.replace(/__6__/, 'j')
							.replace(/__7__/, 'j')
							.replace(/__8__/, 'a')
							.replace(/__9__/, 's')
							.replace(/__10__/, 'o')
							.replace(/__11__/, 'n')
							.replace(/__12__/, 'd');
					});
				}
				
				var minValueRatio = data.yRange.min / (data.yRange.max - data.yRange.min);
				if (
					data.yRange.min > 0 && 
					(minValueRatio < 0.5 || includeZero)
				) {
					data.yRange.min = 0;
				}

				if (options.percent === "true") {
					options.percent = true;
				} else if (options.percent === "false" || ! options.percent) {
					options.percent = false;
				} else if (typeof options.percent !== "boolean") {
					console.error("Percent option (" + options.percent + ") is invalid, defaulting to false.");
					options.percent = false;
				}

				if (options.percent) {
					this.totalToPercentage(data);
				}

				return data;

			},
			
			totalToPercentage: function(data) {
				data.yRange = {
					min: 0,
					max: 0
				};
				
				data.rows.forEach(function (row) {
					if (! row.isFill) {
						var total = row.ySeries.reduce(function(result, y) {
							return result + y.value;
						}, 0);
						
						row.ySeries = row.ySeries.map(function(y, index) {
							if (y === null) return null;
							
							var percentage = 100 * y.runningTotal / total;
							
							if (percentage < data.yRange.min) {
								data.yRange.min = percentage;
							}
							if (percentage > data.yRange.max) {
								data.yRange.max = percentage;
							}
							
							return {
								value: y.value,
								runningTotal: percentage,
								text: y.text
							};
						});
						
						row.averageYValue = calculateYAverage(row.ySeries);
					}
				});
			}
		};
	});
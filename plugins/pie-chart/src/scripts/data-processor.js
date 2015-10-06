define(['geometry'],
function(Geometry) {

return {
	sortDataByValue: function(a, b) {
		return b.value - a.value;
	},
	tableToJSON: function(container, options) {
		var MIN_RADIANS = Math.PI / 20;
		var OVERFLOW_LABEL = "Other";
		var VALUE_REGEX = /^[0-9]+(\.[0-9]+)?$/;

		container.classList.add('fm-hidden');
		var rows = container.querySelectorAll('tbody > tr');
		var data = [];
		var overflow = [];
		
		var dataTotal = 0;
		for (var rowIndex = 0; rowIndex < rows.length; rowIndex++) {
			if (rows[rowIndex].children[1] && rows[rowIndex].children[1].innerHTML.match(VALUE_REGEX)) {
				dataTotal += parseFloat(rows[rowIndex].children[1].innerHTML);
			}
		}

		var overflowItemCount = 0;
		for (var rowIndex = 0; rowIndex < rows.length; rowIndex++) {
			if (rows[rowIndex].children[1] && rows[rowIndex].children[1].innerHTML.match(VALUE_REGEX)) {
				var value = parseFloat(rows[rowIndex].children[1].innerHTML);
				if (Geometry.circle.getAngle(value, dataTotal) <= MIN_RADIANS) {
					overflowItemCount++;
				}
			}
		}

		function overflowTotal(data) {
			var total = 0;
			for (var overflowIndex = 0; overflowIndex < overflow.length; overflowIndex++) {
				total += overflow[overflowIndex].value;
			}
			return total;
		}

		for (var rowIndex = 0; rowIndex < rows.length; rowIndex++) {
			if (
				rows[rowIndex].children[0] && 
				rows[rowIndex].children[1] && 
				rows[rowIndex].children[1].innerHTML.match(VALUE_REGEX)
			) {
				var label = rows[rowIndex].children[0].innerHTML;
				var value = parseFloat(rows[rowIndex].children[1].innerHTML);
				var details = [];

				var detailsIndex = 2;
		
				for (var detailsIndex = 2; detailsIndex < rows[rowIndex].children.length; detailsIndex++) {
					details.push(rows[rowIndex].children[detailsIndex].innerHTML);
				}

				if (Geometry.circle.getAngle(value, dataTotal) > MIN_RADIANS || overflowItemCount < 2) {
					data.push({
						title: label,
						value: value,
						details: details
					});
				} else {
					overflow.push({
						title: label,
						value: value,
						details: details
					});
				}
			}
		}

		data.sort(this.sortDataByValue);

		if (overflow.length > 0) {
			overflow.sort(this.sortDataByValue);
			var overflowValue = overflowTotal(data);
			data.push({
				title: OVERFLOW_LABEL,
				value: overflowValue,
				overflow: overflow
			});
		}

		return data;
	}
}

});
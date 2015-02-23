define(function() {
	return {
		getDataTotal: function(data) {
			var dataTotal = 0;
			for (var i = 0; i < data.length; i++) {
				dataTotal += data[i].value;
			}
			return dataTotal;
		}
	}
});
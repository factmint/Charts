define(function() {
	return {
		roundToOrder: function(number, orderlessTarget, degrees) {
			number = parseFloat(number);

			if (number == 0) return 0;

			if (! degrees) degrees = 2;

			if (orderlessTarget === 1) {
				return parseFloat( number.toPrecision( degrees ) );
			}
			
			return recurse(number, orderlessTarget);

			function recurse(number, orderlessTarget) {
				var magnitude = Math.abs(number);
				if (magnitude >= Math.pow(10, degrees)) {
					number /= 10;
					number = recurse(number, orderlessTarget);
					number *= 10;
				} else if (magnitude < Math.pow(10, degrees - 1)) {
					number *= 10;
					number = recurse(number, orderlessTarget);
					number /= 10;
				} else {
					var roundedValue = Math.round(number / orderlessTarget) * orderlessTarget;
					if (roundedValue === 0) {
						degrees++;
						roundedValue = recurse(number, orderlessTarget);
					}
					number = roundedValue;
				}

				return parseFloat( number.toPrecision( degrees + 1 ) );
			}

		},
		renderValue: function(value) {

			if (value === 0) return "0";
			if (! value) return '';

			var sign = 1;
			if (value < 0) {
				sign = -1;
				value *= -1;
			}

			var value = this.roundToOrder(value, 1, 3);
			var power = 0;

			function recurseToStandardForm(number) {
				if (number == 0) {
					return 0;
				} else if (number >= 1 && number < 1000) {
					return number;
				} else if (number < 1) {
					power -= 3;
					return recurseToStandardForm(number * 1000);
				} else if (number >= 1000) {
					power += 3;
					return recurseToStandardForm(number / 1000);
				}
			}

			var normalizedNumber = new String(sign * recurseToStandardForm(value));

			if (power == 3) {
				return normalizedNumber + "k";
			} else if (power == 6) {
				return normalizedNumber + "m";
			} else if (power == 9) {
				return normalizedNumber + "bn";
			} else if (power == 12) {
				return normalizedNumber + " trillion";
			} else {
				return new String(sign * value);
			}
		},
		getDataTotal: function(data) {
			var dataTotal = 0;
			for (var i = 0; i < data.length; i++) {
				dataTotal += data[i].value;
			}
			return dataTotal;
		},
		getAngle: function(value, dataTotal, totalSize) {
			totalSize = (typeof totalSize === 'undefined') ? Circle.whole : totalSize;
			return (totalSize / dataTotal) * value;
		},
		getFactor: function(number) {
			for (var factor = number - 1; factor > 1; factor--) {
				var fraction = number / factor;
				if (parseInt(fraction) == fraction) {
					return factor;
				}
			}
			
			return number;
		}
	}
});
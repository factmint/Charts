var chart = SVG('chart');

var size = 500;

var data = [
	{
		title: 'China',
		value: 50
	},
	{
		title: 'Japan',
		value: 50
	}
];

chart.size(size, size);

var SEGMENT_PATH = "M{originX},{originY}L{x1},{y1}A{radius},{radius} 0 {large},1 {x2},{y2}Z";

function format(string, values) {
	var regex = new RegExp("{[^{}]*}", "g");
	var tokens = string.match(regex);

	tokens.forEach(function(token) {
		string = string.replace(token, values[token.replace(/[{}]/g, '')]);
	});

	return string;
}

data.forEach(function(dataItem) {
	var path = format(SEGMENT_PATH, {
		originX: 1,
		originY: 1,
		x1: 1,
		y1: 1,
		radius: 1,
		large: 1,
		x2: 1,
		y2: 1
	});

	var segment = chart.ellipse(100, 100)
		.stroke('black');
});
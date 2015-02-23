define([
	'flow',
	'float',
	'grid',
	'path',
	'svg-js'
], function(
	Float,
	Flow,
	Grid,
	Path,
	SVG
) {

return function(chart, width, values, colorClasses) {

var INDICATOR_SIZE = 13;
var TITLE_PADDING_LEFT = 7;
var KEY_ITEM_PADDING_LEFT = 10;
var PADDING_TOP = 20;
var PADDING_RIGHT = 20;
var PADDING_BOTTOM = 20;
var PADDING_LEFT = 20;

var key = chart.group()
	.addClass('fm-key');

var topBorder = chart.line(0, 0, width, 0)
	.addClass('fm-key-top-border');

var centredKeyItems;
var isReDraw = false;

key.backgroundColorClass = 'fm-datum-color-neutral';

key.setValues = function(values) {
	if (key.keyItems) {
		isReDraw = true;
		key.keyItems.clear();
	} else {
		key.keyItems = chart.flow(
			width - PADDING_RIGHT - PADDING_LEFT,
			KEY_ITEM_PADDING_LEFT,
			PADDING_BOTTOM
		);
	}

	values.forEach(function(value, valueIndex) {
		var keyItem = chart.group();

		var valueTitle = chart.text(value)
			.move(INDICATOR_SIZE + TITLE_PADDING_LEFT, 0)
			.addClass('fm-key-value-title');
		var valueIndicator = chart.rect(INDICATOR_SIZE, INDICATOR_SIZE)
			.addClass('fm-key-value-indicator ' + colorClasses[valueIndex]);

		keyItem.add(valueTitle);
		keyItem.add(valueIndicator);

		key.keyItems.add(keyItem);
	});

	key.keyItems.gridLeft();

	var keyBackgroundHeight = key.keyItems.bbox().height + PADDING_TOP + PADDING_BOTTOM

	if (isReDraw) {
		key.background.attr('height', keyBackgroundHeight);
	} else {
		key.background = chart.rect(width, keyBackgroundHeight)
			.addClass('fm-key-background ' + key.backgroundColorClass);
	}

	centredKeyItems = chart.flow(width, 100, 100);

	centredKeyItems.add(key.keyItems);
	centredKeyItems.centre();
	centredKeyItems.move(0, PADDING_TOP);

	key.add(key.background);
	key.add(topBorder);
	key.add(centredKeyItems);
};

key.clearItems = function() {
	key.keyItems.clear();
};

key.setValues(values);

return key;
	
}

});
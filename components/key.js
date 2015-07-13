define([
	'flow',
	'float',
	'grid',
	'svg-js'
], function(
	Float,
	Flow,
	Grid,
	SVG
) {

return function(chart, width, values, colorClasses, colorOverrides) {

var Configuration = {
	INDICATOR_SIZE: 13,
	TITLE_PADDING_LEFT: 7,
	KEY_ITEM_PADDING_LEFT: 10,
	PADDING_TOP: 20,
	PADDING_RIGHT: 20,
	PADDING_BOTTOM: 20,
	PADDING_LEFT: 20
};

var key = chart.group()
	.addClass('fm-key');
	
key.configuration = Configuration;

var topBorder = chart.line(0, 0, width, 0)
	.addClass('fm-key-top-border');

var centeredKeyItems;
var isReDraw = false;

key.backgroundColorClass = 'fm-datum-color-neutral';

key.setValues = function(values, colorOverrides) {
	if (key.keyItems) {
		isReDraw = true;
		key.keyItems.clear();

		key.keyItems = chart.flow(
			width - Configuration.PADDING_RIGHT - Configuration.PADDING_LEFT,
			Configuration.KEY_ITEM_PADDING_LEFT,
			Configuration.PADDING_BOTTOM
		)
			.addClass("fm-key-items");
	}
	
	key.keyItems = chart.flow(
		width - Configuration.PADDING_RIGHT - Configuration.PADDING_LEFT,
		Configuration.KEY_ITEM_PADDING_LEFT,
		Configuration.PADDING_BOTTOM
	)
		.addClass("fm-key-items");

	values.forEach(function(value, valueIndex) {
		var keyItem = chart.group();

		var valueTitle = chart.text(value)
			.move(Configuration.INDICATOR_SIZE + Configuration.TITLE_PADDING_LEFT, 0)
			.addClass('fm-key-value-title');
		var valueIndicator = chart.rect(Configuration.INDICATOR_SIZE, Configuration.INDICATOR_SIZE)
			.addClass('fm-key-value-indicator');
		
		if (colorOverrides && colorOverrides[valueIndex]) {
			valueIndicator.attr({ fill: colorOverrides[valueIndex] });
		} else {
			valueIndicator.addClass(colorClasses[valueIndex]);
		}

		keyItem.add(valueTitle);
		keyItem.add(valueIndicator);

		key.keyItems.add(keyItem);
	});

	key.keyItems.gridLeft();

	var keyBackgroundHeight = key.keyItems.bbox().height + Configuration.PADDING_TOP + Configuration.PADDING_BOTTOM

	if (isReDraw) {
		key.background.attr('height', keyBackgroundHeight);
	} else {
		key.background = chart.rect(width, keyBackgroundHeight)
			.addClass('fm-key-background ' + key.backgroundColorClass);
	}

	centeredKeyItems = chart.flow(width, 100, 100);

	centeredKeyItems.add(key.keyItems);
	centeredKeyItems.center();
	centeredKeyItems.move(0, Configuration.PADDING_TOP);

	key.add(key.background);
	key.add(topBorder);
	key.add(centeredKeyItems);
};

key.clearItems = function() {
	key.keyItems.clear();
};

key.setValues(values, colorOverrides);

return key;
	
}

});
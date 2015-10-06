define([
	'circle-segment',
	'configuration-builder',
	'key'
],
function(
	CircleSegmentConfiguration,
	combineConfigurations,
	KeyConfiguration
) {

var chartConfiguration = {
	// Layout settings
	ASPECT_RATIO: 2.5/3,
	MAX_HEIGHT: 10000,
	SMALL_BREAKPOINT: 500,
	MAP_AREA_PADDING: 0.1,
	TARGET_KEY_AREA_PROPORTION: 1/5,
	DEBOUNCE_TIMEOUT: 200,
	// Spillover size
	SPILLOVER_TOP: 0,
	SPILLOVER_RIGHT: 15,
	SPILLOVER_BOTTOM: 0,
	SPILLOVER_LEFT: 0.15,
	// Padding
	PADDING_FOR_LABELS: 70,
	KEY_AREA_PADDING: 20,
	// Key
	MAX_KEY_WIDTH: 200,
	MAX_KEY_HEIGHT: 200,
	DEFAULT_TARGET_INCREMENT_COUNT: 5,
	MAX_TINT_NUMBER: 9,
	POSITIVE_COLOR_CLASS: "fm-datum-color-wheel-d",
	NEGATIVE_COLOR_CLASS: "fm-datum-color-wheel-k",
	// Thumbnail map
	THUMBNAIL_MAP_SCALE_FACTOR: 0.3,
	THUMBNAIL_MAP_SIDE_PADDING: 30,
	THUMBNAIL_MAP_TOP_BOTTOM_PADDING: 10,
	ANIMATE_SPEED: 120
};

return combineConfigurations([CircleSegmentConfiguration, chartConfiguration]);
	
});
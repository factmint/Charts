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
	ASPECT_RATIO: 2/3,
	ASPECT_RATIO_BREAKPOINT: 4/3,
	MAX_HEIGHT: 600,
	MIN_RADIUS: 100,
	DEBOUNCE_TIMEOUT: 200,
	MIN_RADIANS: Math.PI / 20,
	// Spillover size
	SPILLOVER_TOP: 50,
	SPILLOVER_RIGHT: 15,
	SPILLOVER_BOTTOM: 50,
	SPILLOVER_LEFT: 0.15,
	// Padding
	PADDING_FOR_LABELS: 70,
	// Overflow
	OVERFLOW_SPREAD: 6, // The size of the "doughnut" as a proportion of a whole circle (e.g. 3 is a third)
	OVERFLOW_INNER_RADIUS: 1.20, // The inner radius proportional to the pie radius
	OVERFLOW_OUTER_RADIUS: 1.36, // The outer radius proportional to the pie radius
	// These  can be used to alter proportions for the dotted bracket
    BRACKET_INNER_RADIUS_ADJUST: 0.03, // Start point of middle line
    BRACKET_MIDDLE_RADIUS_ADJUST: 0.1, // End point of middle line and start of arms
    BRACKET_OUTER_RADIUS_ADJUST: 0.15, // End point of arms
    // Tooltips
    TOOLTIP_DISTANCE_FROM_CIRCUMFERENCE: 3,
	// Key
	KEY_TOP_MARGIN: 30, // Applicable to portrait mode
	KEY_LEFT_MARGIN: 20 // Applicable to landscape mode
};

return combineConfigurations([CircleSegmentConfiguration, chartConfiguration]);
	
});

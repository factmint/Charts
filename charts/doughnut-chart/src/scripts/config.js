define(['circle-utils'],
function(Circle) {
	return {
		// Global settings
		FONT_FAMILY: "'Lato', sans-serif",
		TEXT_SIZE_SMALL: "12px",
		TEXT_SIZE_MEDIUM: "14.4px",
		// Viewbox settings
		TOP_PADDING_FOR_OVERFLOW: 65,
		TOP_PADDING_FOR_LABELS: 30,
		SIDE_PADDING_FOR_LABELS: 70,
		// Spillover margins
		SPILLOVER_TOP: 0.04,
		SPILLOVER_RIGHT: 0.2,
		SPILLOVER_BOTTOM: 0.03,
		SPILLOVER_LEFT: 0.2,
		// Overflow data settings
		OVERFLOW_SPREAD: 3.5 * Circle.tenth, // The size of the "doughnut"
		OVERFLOW_THICKNESS: 0.25, // The thickness of the "doughnut"
		OVERFLOW_MESSAGE: "Click to expand segment",
		// These can be used to alter proportions for the "doughnut" shapes
		DOUGHNUT_THICKNESS: 1.4,
		FORCE_BASIC_MODE_WIDTH: 300,
		// These  can be used to alter proportions for the dotted bracket
		BRACKET_INNER_RADIUS_ADJUST: 0.03, // Start point of middle line
		BRACKET_MIDDLE_RADIUS_ADJUST: 0.15, // End point of middle line and start of arms
		BRACKET_OUTER_RADIUS_ADJUST: 0.2, // End point of arms
		// These  can be used to alter proportions for the key relative to the doughnut chart's radius
		KEY_WIDTH: 2,
		KEY_HEIGHT: 1,
		KEY_PADDING: 0.5,
		// Label distance from circumference of doughnut chart
		LABEL_MARGIN: 3,
		// Label plugin configuration
		LABEL_BORDER_RADIUS: 5,
		LABEL_ARROW_LENGTH: 10,
		LABEL_ARROW_WIDTH: 9,
		LABEL_PADDING: 10,
		LABEL_FONT_SIZE: 10,
		// Padding between inner circumference and central data
		CENTRAL_DATA_PADDING: 0.9
	}
});
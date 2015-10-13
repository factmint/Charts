define(function(Circle) {
	return {
		// Global settings
		FONT_FAMILY: "'Lato', sans-serif",
		TEXT_SIZE_SMALL: 12,
		TEXT_SIZE_MEDIUM: 14.4,
		KEY_TOP_MARGIN: 30,
		// Spillover size
		SPILLOVER_TOP: 0,
		SPILLOVER_RIGHT: 0,
		SPILLOVER_BOTTOM: 0,
		SPILLOVER_LEFT: 0,
		// Viewbox settings
		NEGATIVE_MARGIN: "-20%",
		// Marker settings
		TARGET_MARKER_COUNT: 10,
		SMALL_MARKER_SIZE: 5,
		// Range settings
		X_RANGE_PADDING: 0.1, // This constricts a range so start and points are not at the very ends of the axis
		// Trend line settings
		EXTRAPOLATION_FACTOR: 0.05, // How far beyond the min and max for the group the trend lines can extend
		TREND_LINE_KEY_LABEL_FONT_COLOR: '#AAAAAA',
		// Scatter point (dot) settings
		DOT_SIZE: 3.7,
		LARGE_DOT_FACTOR: 1.3, // Large dot size (when hovered) is DOT_SIZE * LARGE_DOT_FACTOR
		TOOLTIP_MARGIN: 2, // Distance of tooltip arrow from outer edge of dot
		// Tooltip plugin configuration
		TOOLTIP_MAX_VALUE_LENGTH: 20,
		// Key plugin configuration
		KEY_PADDING_TOP: 20,
		KEY_PADDING_RIGHT: 30,
		KEY_PADDING_BOTTOM: 20,
		KEY_PADDING_LEFT: 30,
		KEY_SIDE_PADDING: 30,
		KEY_MAX_VALUES: 12,
		KEY_MAX_VALUE_LENGTH: 12,
		KEY_PADDING: 20,
		KEY_COLUMNS: 1,
		KEY_ROWSPACING: 8,
		KEY_TEXT_SPACING: 5,
		KEY_NEUTRAL_FILL: "#E4E4E3",
		KEY_NEUTRAL_STROKE: "#676A68",
		// Tick mark configuration
		TICK_MARK_HORIZONTAL_PADDING: 10,
		TICK_MARK_VERTICAL_PADDING: 10,
		TICK_MARK_FONT_WEIGHT: 300
	}
});
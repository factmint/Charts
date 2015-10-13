define(function() {

  return {
    // Global settings
    FONT_FAMILY: "'Lato', sans-serif",
    TEXT_SIZE_SMALL: 12,
    TEXT_SIZE_MEDIUM: 14.4,
    // Viewbox settings
    SPILLOVER_TOP: 0,
    SPILLOVER_RIGHT: 0,
    SPILLOVER_BOTTOM: 0,
    SPILLOVER_LEFT: 0,
    // Marker settings
    TARGET_MARKER_COUNT: 5,
    SMALL_MARKER_SIZE: 5,
    // Range setting
    X_RANGE_PADDING: 0.1, // This constricts a range so start and points are not at the very ends of the axis
    // Scatter point (dot) settings
    DOT_SIZE: 3,
    // Bubble chart area settings
    BUBBLE_MAX_RADIUS_PROPORTION: 0.12,
    BUBBLE_MIN_RADIUS_PROPORTION: 0.03,
    // Key plugin configuration
    KEY_SIDE_PADDING: 50,
    KEY_MAX_VALUES: 12,
    KEY_PADDING_TOP: 20,
    KEY_PADDING_RIGHT: 50,
    KEY_PADDING_BOTTOM: 20,
    KEY_PADDING_LEFT: 50,
    KEY_COLUMNS: 3,
    KEY_ROWSPACING: 25,
    KEY_TEXT_SPACING: 5,
    KEY_NEUTRAL_FILL: "#E4E4E3",
    KEY_NEUTRAL_STROKE: "#676A68",
    KEY_MAX_TEXT_LENGTH: 18,
    KEY_MARGIN_TOP: 100,
    // Tick mark configuration
    TICK_MARK_HORIZONTAL_PADDING: 10,
    TICK_MARK_VERTICAL_PADDING: 10,
    TICK_MARK_FONT_WEIGHT: 300
  }

});
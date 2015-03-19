define([
	"svg-js",
	"number"
], function(
	SVG,
	NumberUtilities
) {

return function(chart, tickMarks, colorClass, scale, orientation) {
	var colorScaleKey = chart.group();

	var colorMarkers = chart.group();

	var COLOR_MARKER_THICKNESS = 5;
	var TICK_MARK_EXTRUDE = 8;
	var TICK_LABEL_MARGIN = 5;
	var TICK_LABEL_FONT_HEIGHT = 12;
	var VALUE_MARKER_THICKNESS = 10;
	var VALUE_MARKER_LENGTH = 10;
	var VALUE_MARKER_MARGIN = 2;

	function drawVerticalScale() {
		tickMarks.forEach(function(tickMark, tickMarkIndex) {
			if (tickMarkIndex === tickMarks.length - 1) {
				return;
			}

			var markPosition = scale.map(tickMark.value);

			var colorMarker = chart.rect(COLOR_MARKER_THICKNESS, scale.map(scale.domain.max) / (tickMarks.length - 1));
			colorMarker.move(VALUE_MARKER_LENGTH + VALUE_MARKER_MARGIN, markPosition);
			colorMarker.addClass(colorClass);

			if (tickMark.tintClass) {
				colorMarker.addClass(tickMark.tintClass);
			}
			
			var tickLine = chart.line(
				VALUE_MARKER_LENGTH + VALUE_MARKER_MARGIN,
				markPosition,
				VALUE_MARKER_LENGTH + VALUE_MARKER_MARGIN + COLOR_MARKER_THICKNESS + TICK_MARK_EXTRUDE,
				markPosition
			);
			tickLine.addClass("fm-color-scale-key-tick-line");

			var tickLabel = chart.text("" + NumberUtilities.renderValue(tickMark.value));
			tickLabel.move(
				VALUE_MARKER_LENGTH + VALUE_MARKER_MARGIN + COLOR_MARKER_THICKNESS + TICK_MARK_EXTRUDE + TICK_LABEL_MARGIN,
				markPosition - TICK_LABEL_FONT_HEIGHT
			);
			tickLabel.addClass("fm-color-scale-key-tick-label");

			colorMarkers.add(colorMarker);
			colorMarkers.add(tickLine);
			colorMarkers.add(tickLabel);
		});

		var finalTickLine = chart.line(
			VALUE_MARKER_LENGTH + VALUE_MARKER_MARGIN,
			scale.map(tickMarks[tickMarks.length - 1].value),
			VALUE_MARKER_LENGTH + VALUE_MARKER_MARGIN + COLOR_MARKER_THICKNESS + TICK_MARK_EXTRUDE,
			scale.map(tickMarks[tickMarks.length - 1].value)
		);
		finalTickLine.addClass("fm-color-scale-key-tick-line");

		var finalTickLabel = chart.text("" + NumberUtilities.renderValue(tickMarks[tickMarks.length - 1].value));
		finalTickLabel.move(
			VALUE_MARKER_LENGTH + VALUE_MARKER_MARGIN + COLOR_MARKER_THICKNESS + TICK_MARK_EXTRUDE + TICK_LABEL_MARGIN,
			scale.map(tickMarks[tickMarks.length - 1].value) - TICK_LABEL_FONT_HEIGHT
		);
		finalTickLabel.addClass("fm-color-scale-key-tick-label");
		colorMarkers.add(finalTickLine);
		colorMarkers.add(finalTickLabel);

		colorScaleKey.add(colorMarkers);
	}

	function drawHorizontalScale() {
		tickMarks.forEach(function(tickMark, tickMarkIndex) {
			if (tickMarkIndex === tickMarks.length - 1) {
				return;
			}

			var markPosition = scale.map(tickMark.value);

			var colorMarker = chart.rect(scale.map(scale.domain.max) / (tickMarks.length - 1), COLOR_MARKER_THICKNESS);
			colorMarker.move(markPosition, VALUE_MARKER_LENGTH + VALUE_MARKER_MARGIN);
			colorMarker.addClass(colorClass);
			
			if (tickMark.tintClass) {
				colorMarker.addClass(tickMark.tintClass);
			}

			var tickLine = chart.line(
				markPosition,
				VALUE_MARKER_LENGTH + VALUE_MARKER_MARGIN,
				markPosition,
				VALUE_MARKER_LENGTH + VALUE_MARKER_MARGIN + COLOR_MARKER_THICKNESS + TICK_MARK_EXTRUDE
			);
			tickLine.addClass("fm-color-scale-key-tick-line");

			var tickLabel = chart.text("" + NumberUtilities.renderValue(tickMark.value));
			tickLabel.move(
				markPosition - tickLabel.bbox().width / 2,
				VALUE_MARKER_LENGTH + VALUE_MARKER_MARGIN + COLOR_MARKER_THICKNESS + TICK_MARK_EXTRUDE + TICK_LABEL_MARGIN
			);

			tickLabel.addClass("fm-color-scale-key-tick-label");

			colorMarkers.add(colorMarker);
			colorMarkers.add(tickLine);
			colorMarkers.add(tickLabel);
		});

		var finalTickLine = chart.line(
			scale.map(tickMarks[tickMarks.length - 1].value),
			VALUE_MARKER_LENGTH + VALUE_MARKER_MARGIN,
			scale.map(tickMarks[tickMarks.length - 1].value),
			VALUE_MARKER_LENGTH + VALUE_MARKER_MARGIN + COLOR_MARKER_THICKNESS + TICK_MARK_EXTRUDE
		);
		finalTickLine.addClass("fm-color-scale-key-tick-line");

		var finalTickLabel = chart.text("" + NumberUtilities.renderValue(tickMarks[tickMarks.length - 1].value));
		finalTickLabel.move(
			scale.map(tickMarks[tickMarks.length - 1].value) - finalTickLabel.bbox().width / 2,
			VALUE_MARKER_LENGTH + VALUE_MARKER_MARGIN + COLOR_MARKER_THICKNESS + TICK_MARK_EXTRUDE + TICK_LABEL_MARGIN
		);
		finalTickLabel.addClass("fm-color-scale-key-tick-label");
		colorMarkers.add(finalTickLine);
		colorMarkers.add(finalTickLabel);

		colorScaleKey.add(colorMarkers);
	}

	if (orientation === "horizontal") {
		drawHorizontalScale();
	} else if (orientation === "vertical") {
		drawVerticalScale();
	} else {
		console.log("Incorrect scale orientation of " + orientation + " specified. Defaulting to vertical.");
		drawVerticalScale();
	}

	colorScaleKey.markValue = function(value, secondary) {
		var markPosition = scale.map(value);

		var markerPoints;

		if (orientation === "horizontal") {
			markerPoints = [
				[markPosition - (1/2 * VALUE_MARKER_THICKNESS), 0],
				[markPosition, VALUE_MARKER_LENGTH],
				[markPosition + (1/2 * VALUE_MARKER_THICKNESS), 0]
			];
		} else {
			markerPoints = [
				[0, markPosition - (1/2 * VALUE_MARKER_THICKNESS)],
				[VALUE_MARKER_LENGTH, markPosition],
				[0, markPosition + (1/2 * VALUE_MARKER_THICKNESS)]
			];
		}

		var valueMarker = chart.polygon().plot(markerPoints);

		valueMarker.addClass("fm-color-scale-key-marker hidden");
		valueMarker.removeClass("hidden");

		if (! secondary) {
			this.valueMarker = valueMarker;
			colorScaleKey.add(this.valueMarker);
		} else {
			this.secondaryValueMarker = valueMarker;
			this.secondaryValueMarker.addClass("secondary");
			colorScaleKey.add(this.secondaryValueMarker);
		}

	};

	colorScaleKey.reset = function() {
		if (this.valueMarker) {
			this.valueMarker.remove();
		}
	};

	return colorScaleKey;
}

});
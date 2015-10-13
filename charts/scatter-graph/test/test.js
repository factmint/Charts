define(['scale-utils'],
function(ScaleUtils) {
	QUnit.test( "Test scale functionality", function( assert ) {
		var pixelOffset = 10;
		var pixelRange = 300;
		var minValue = 0;
		var maxValue = 500;

		var scaleUnderTest = new ScaleUtils.Scale(pixelOffset, pixelRange, minValue, maxValue);

		assert.equal(scaleUnderTest.getPixel(250), 160, "We would expect 250 to be half the pixel range, and 300 / 2 + 10 (pixel offset) = 150");
		assert.throws(
			function() {
				scaleUnderTest.getPixel(-10, false);
			},
			"This value is out of the specified range for the scale so an error should be thrown when allowOutOfRangeValues is false."
		);
	});

	QUnit.test( "Test scale edge cases", function( assert ) {

		var pixelOffset = 10;

		assert.equal(new ScaleUtils.Scale(pixelOffset, 300, -15, -10).getPixel(-11), 250, "Even with negative values, we would expect 240 to be four fifths the pixel range in this instance");
		assert.equal(new ScaleUtils.Scale(pixelOffset, 300, -15, 15).getPixel(-5), 110, "Even with negative min and positive max, we would expect -5 to be a third of the pixel range in this instance");
		assert.equal(new ScaleUtils.Scale(pixelOffset, 300, 15, -15).getPixel(-5), 210, "Even with with a min that is higher than the max, we would expect -5 to be a third from the max of the pixel range in this instance");
		assert.equal(new ScaleUtils.Scale(pixelOffset, 300, 15, -15).getPixel(-15), 310, "Even with with a min that is higher than the max, we would expect -5 to be a third from the max of the pixel range in this instance");
		assert.throws(
			function() {
				new ScaleUtils.Scale(10, 300, 15, 15).getPixel(15);
			},
			"A scale between a number and itself should throw and error because this will make your brain bleed"
		);
	});
});
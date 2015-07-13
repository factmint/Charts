require.config({
    paths: {
		// Factmint Charts API
		"number": "../../../utilities/number"
    }
});

require(["number"], function(NumberUtilities) {
	console.log(NumberUtilities.getFactor(100));
});
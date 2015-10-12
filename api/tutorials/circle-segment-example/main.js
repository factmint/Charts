require.config({
    paths: {
		// Vendor
		"path": "../../../factmint-charts/node_modules/paths-js/dist/amd/path",
		"svg-js": "../../../factmint-charts/node_modules/svg.js/dist/svg",
        // Factmint Charts API
		"circle-segment": "../../../factmint-charts/inventions/circle-segment",
		"geometry": "../../../factmint-charts/utilities/geometry",
    }
});

require(["svg-js", "circle-segment"], function(SVG) {
	if (SVG.supported) {
		var chart = SVG("chart").size(500, 500);
        var segment = chart.circleSegment(250, 250, 100, 0, Math.PI / 2);
	} else {
		console.log("SVG is not supported by your browser.");
	}
});
require.config({
	paths: {
		// Vendor
		"classList": "../../node_modules/classList/classList",
		"path": "../../node_modules/paths-js/dist/amd/path",
		"svg-js": "../../node_modules/svg.js/dist/svg.min",
		// Factmint Charts API
		"center": "../../../../factmint-charts/etc/center",
		"circle-segment": "../../../../factmint-charts/inventions/circle-segment",
		"color": "../../../../factmint-charts/utilities/color",
		"color-scale-key": "../../../../factmint-charts/components/color-scale-key",
		"configuration-builder": "../../../../factmint-charts/utilities/configuration-builder",
		"doughnut-segment": "../../../../factmint-charts/inventions/doughnut-segment",
		"flow": "../../../../factmint-charts/inventions/flow",
		"float": "../../../../factmint-charts/etc/float",
		"geometry": "../../../../factmint-charts/utilities/geometry",
		"grid": "../../../../factmint-charts/etc/grid",
		"key": "../../../../factmint-charts/components/key",
		"mapper": "../../../../factmint-charts/utilities/mapper",
		"multi-measure-tooltip": "../../../../factmint-charts/components/multi-measure-tooltip",
		"number": "../../../../factmint-charts/utilities/number",
		"scale": "../../../../factmint-charts/utilities/scale",
		"state": "../../../../factmint-charts/utilities/state",
		"tooltip": "../../../../factmint-charts/components/tooltip",
		"tooltip-background": "../../../../factmint-charts/inventions/tooltip-background",
		"G.unshift": "../../../../factmint-charts/extensions/G.unshift"
	}
});

require(['svg-builder'], function(buildSVG) {
	/**
	 * Check if the browser supports SVG
	 */
	function supportsSvg() {
		return !! document.createElementNS &&
			!! document.createElementNS("http://www.w3.org/2000/svg","svg").createSVGRect;
	}

	/**
	 * Check the browser returns correct SVG getBoundingClientRect() values (see https://bugzilla.mozilla.org/show_bug.cgi?id=479058)
	 */
	function supportsGetBoundingClientRectForSvg() {
		var testWidth = 500;

		var testSvgNode = document.createElementNS("http://www.w3.org/2000/svg", "svg");
		testSvgNode.style.width = "" + testWidth + "px";
		document.body.appendChild(testSvgNode);

		var testSvgNodeBoundingClientRect = testSvgNode.getBoundingClientRect();
		testSvgNode.parentNode.removeChild(testSvgNode);
		if (testSvgNodeBoundingClientRect.width === testWidth) {
			return true;
		} else {
			return false;
		}
	}

	/**
	 * Check if we are in preview mode
	 */
	function inPreviewMode() {
		return window['factmint'] && window['factmint'].previewVisualizations;
	}
	
	var tables = document.querySelectorAll('table.fm-choropleth-uk-constituencies');

	if (! supportsSvg()) {
		console.log("SVG not supported: visualizations disabled");
	} else if (! supportsGetBoundingClientRectForSvg()) {
		console.log("Your browser does not correctly support getBoundingClientRect() for SVG elements: visualizations disabled");
	} else {
		for (var tableIndex = 0; tableIndex < tables.length; tableIndex++) {
			if (inPreviewMode() || ! tables[tableIndex].hasAttribute('data-fm-rendered')) {
				tables[tableIndex].setAttribute('data-fm-rendered', 'true');
				
				try {
					buildSVG(tables[tableIndex]);
				} catch(exception) {
					console.log('ERROR: chart rendering failed');
					if (exception instanceof Error) {
						console.log(exception.stack);
					} else {
						console.log(exception);
					}
				}				
			}
		}
	}
});
require.config({
	paths: {
		// Vendor
		"classList": "../../node_modules/classList/classList",
		"path": "../../node_modules/paths-js/dist/amd/path",
		"svg-js": "../../node_modules/svg.js/dist/svg",
		// Factmint Charts API
		"center": "../../../../api/etc/center",
		"circle-segment": "../../../../api/inventions/circle-segment",
		"color": "../../../../api/utilities/color",
		"color-scale-key": "../../../../api/components/color-scale-key",
		"configuration-builder": "../../../../api/utilities/configuration-builder",
		"doughnut-segment": "../../../../api/inventions/doughnut-segment",
		"flow": "../../../../api/inventions/flow",
		"float": "../../../../api/etc/float",
		"geometry": "../../../../api/utilities/geometry",
		"grid": "../../../../api/etc/grid",
		"key": "../../../../api/components/key",
		"mapper": "../../../../api/utilities/mapper",
		"multi-measure-tooltip": "../../../../api/components/multi-measure-tooltip",
		"number": "../../../../api/utilities/number",
		"scale": "../../../../api/utilities/scale",
		"state": "../../../../api/utilities/state",
		"tooltip": "../../../../api/components/tooltip",
		"tooltip-background": "../../../../api/inventions/tooltip-background",
		"G.unshift": "../../../../api/extensions/G.unshift"
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
		if (! window['factmint']) {
			window['factmint'] = {};
		}
		
		window['factmint'].choroplethUKConstituencies = buildSVG;
		
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
require.config({
	paths: {
		"text": "../../bower_components/requirejs-text/text",
		"classList": "../../bower_components/classlist/classList.min",
		"snap": "../../bower_components/Snap.svg/dist/snap.svg",
		"axis": "../../bower_components/axis/dist/axis",
		"grid-lines": "../../bower_components/grid-lines/dist/grid-lines",
		"scale-utils": "../../bower_components/scale-utilities/dist/scale-utils",
		"number-utils": "../../bower_components/number-utils/dist/number-utils",
		"color-utils": "../../bower_components/color-utils/dist/color",
		"tick-mark": "../../bower_components/tick-mark/dist/tick-mark",
		"multitext": "../../bower_components/multitext/dist/multitext",
		"key": "../../bower_components/key/dist/key",
	"scatter-key": "../../bower_components/scatter-key/dist/scatter-key",
		"Tooltip": "../../bower_components/Tooltip/dist/Tooltip",
		"moment": "../../bower_components/moment/moment"
	},
	shim: {
		snap: {
			exports: 'Snap'
		}
	}
});

require(['render'], function(render) {
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
	
	var tables = document.querySelectorAll('table.fm-candlestick');

	if (! supportsSvg()) {
		console.log("SVG not supported: visualizations disabled");
	} else if (! supportsGetBoundingClientRectForSvg()) {
		console.log("Your browser does not correctly support getBoundingClientRect() for SVG elements: visualizations disabled");
	} else {
		for (var tableIndex = 0; tableIndex < tables.length; tableIndex++) {
			if (inPreviewMode() || ! tables[tableIndex].hasAttribute('data-fm-rendered')) {
				tables[tableIndex].setAttribute('data-fm-rendered', 'true');
				
				try {
					render(tables[tableIndex]);
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
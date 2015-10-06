require.config({
	paths: {
		"snap": "../../bower_components/Snap.svg/dist/snap.svg",
		"classList": "../../bower_components/classlist/classList",
		"number-utils": "../../bower_components/number-utils/dist/number-utils",
		"circle-utils": "../../bower_components/circle-utils/dist/circle",
		"color-utils": "../../bower_components/color-utils/dist/color",
		"dashed-bracket": "../../bower_components/dashed-bracket/dist/dashed-bracket",
		"pie-segment": "../../bower_components/pie-segment/dist/pie-segment",
		"doughnut-segment": "../../bower_components/doughnut-segment/dist/doughnut-segment",
		"two-section-tooltip": "../../bower_components/two-section-tooltip/dist/two-section-tooltip",
		"tooltip": "../../bower_components/Tooltip/dist/Tooltip",
		"multitext": "../../bower_components/multitext/dist/multitext",
		"central-data": "../../bower_components/central-data/dist/central-data"
	},
	shim: {
		snap: {
			exports: 'Snap'
		}
	}
});

require(['render'], function(render) {
	// This is at the top to distance if from the throw - to make it as harder to reverse engineer
	/**
	 * Check origin is Factmint.io
	 */
	var checkDrm = function() {
		var verified = false;
		var scriptTags = document.querySelectorAll('script');
		
		for (var scriptNumber = 0; scriptNumber < scriptTags.length; scriptNumber++) {
			var src = scriptTags[scriptNumber].getAttribute('src');
			if (src) {
	 			var offset = (src[4] == 's') ? 1 : 0;
				if (src[7 + offset] == 'f' && src[16 + offset] == 'i' && src[9 + offset] == 'c' && src[15 + offset] == '.') {
					verified = true;
					break;
				}
			}
		}
		
		return verified;
	};
	
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
	
	var tables = document.querySelectorAll('table.fm-doughnut');

	if (! supportsSvg()) {
		console.log("SVG not supported: visualizations disabled");
	} else if (! supportsGetBoundingClientRectForSvg()) {
		console.log("Your browser does not correctly support getBoundingClientRect() for SVG elements: visualizations disabled");
	} else {
		//NODRM if(! checkDrm()) throw 'Licence error'; // This check will be un-commented by the grunt release task
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
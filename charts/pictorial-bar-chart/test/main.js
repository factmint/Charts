require.config({
	paths: {
		"text": "../../bower_components/requirejs-text/text",
		snap: "../../bower_components/Snap.svg/dist/snap.svg",
		"axis": "../../bower_components/axis/dist/axis",
		"grid-lines": "../../bower_components/grid-lines/dist/grid-lines",
		"scale-utils": "../../bower_components/scale-utilities/dist/scale-utils",
		"number-utils": "../../bower_components/number-utils/dist/number-utils",
		"color-utils": "../../bower_components/color-utils/dist/color",
		"tick-mark": "../../bower_components/tick-mark/dist/tick-mark",
		"multi-line-label": "../../bower_components/multi-line-label/dist/multi-line-label",
		"multitext": "../../bower_components/multitext/dist/multitext",
		"scatter-key": "../../bower_components/scatter-key/dist/scatter-key",
		"Tooltip": "../../bower_components/Tooltip/dist/Tooltip"
	},
	shim: {
		"snap": {
			exports: "Snap"
		}
	}
});

require(['test']);
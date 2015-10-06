define([
	"renderer",
	"configuration"
],
function(
	renderer,
	Configuration
) {

function attributeToCamelCase(attribute) {
	return attribute.split("-").map(function(part, index) {
		if (index === 0) {
			return part;
		}
		else {
			return part.charAt(0).toUpperCase() + part.substr(1);
		}
	}).join("");
}

if (! (window.addEventListener && window.document.createEvent)) {
	return;
}

function drawPoweredByFactmint(previousSibling, width) {
	var link = document.createElement('div');
	link.className = 'fm-powered-by-factmint';
	link.innerHTML = 'Powered by <a style="color: #527a92" href="http://factmint.com/charts">Factmint</a>';
	link.style.fontSize = '8px';
	link.style.lineHeight = '12px';
	link.style.width = width;
	link.style.textAlign = 'center';
	link.style.fontFamily = 'Lato, sans-serif';

	previousSibling.parentNode.insertBefore(link, previousSibling.nextSibling);
}

var resizeFinishedEvent = window.document.createEvent("Event");
resizeFinishedEvent.initEvent("resizefinished", false, false);

var debounceTimeout = null;

var debounce = function() {
	clearTimeout(debounceTimeout);
	debounceTimeout = setTimeout(function() {
		window.dispatchEvent(resizeFinishedEvent);
	}, Configuration.DEBOUNCE_TIMEOUT);
	return debounceTimeout;
};
window.addEventListener("resize", debounce, false);

return function(table) {

	var drawSVGNode = function(redraw) {
		var configObject = table.getAttribute('data-fm-config');
		var options = (configObject && window[configObject]) ? window[configObject] : {};
		var dataOptions = [].filter.call(table.attributes, function(attribute) {
			if (attribute.name === 'data-fm-config') {
				return false;
			} else {
				return /^data-fm-/.test(attribute.name);	
			}
		}).forEach(function(dataAttribute) {
			var optionKey = dataAttribute.name.replace(/^data-fm-/, '');
			optionKey = attributeToCamelCase(optionKey);
			options[optionKey] = dataAttribute.value;
		});

		var svgNode = document.createElementNS("http://www.w3.org/2000/svg", "svg");
		svgNode.className.baseVal += "fm-unrendered-chart fm-chart";

		table.parentElement.insertBefore(svgNode, table);

		var lengthRegex = /([0-9]+)(px|%|rem|em|ex|ch|vw|vh|vmin|vmax|mm|cm|in|pt|pc)/;

		function setWidth() {
			var width = {};
			if (! options.width) {
				width.value = 100;
				width.units = "%";
			} else {
				options.width.replace(lengthRegex, function(match, length, units) {
					width.value = parseFloat(length);
					width.units = units;
				});
			}
			return width;
		}

		function setHeight() {
			var height = {};
			if (! options.height) {
				var optimalHeight = svgNode.getBoundingClientRect().width / Configuration.ASPECT_RATIO;
				height.value = Math.min(Configuration.MAX_HEIGHT, optimalHeight);
				height.units = "px";
			} else {
				options.height.replace(lengthRegex, function(match, length, units) {
					height.value = parseFloat(length);
					height.units = units;
				});
			}
			return height;
		}

		var width = setWidth();
		svgNode.style.width = (width.value) + width.units;

		var height = setHeight();
		svgNode.style.height = (height.value) + height.units;

		var boundingBox = svgNode.getBoundingClientRect();

		var primaryWidth = boundingBox.width;
		var primaryHeight = boundingBox.height;

		if (! options.disableSpillover) {
			var totalHeight = Configuration.SPILLOVER_TOP + Configuration.SPILLOVER_BOTTOM + primaryHeight;
			var totalWidth = Configuration.SPILLOVER_LEFT + Configuration.SPILLOVER_RIGHT + primaryWidth;

			var verticalSpilloverProportion = totalHeight / primaryHeight;
			var horizontalSpilloverProportion = totalWidth / primaryWidth;

			svgNode.style.height = (height.value * verticalSpilloverProportion) + height.units;
			svgNode.style.width = (width.value * horizontalSpilloverProportion) + width.units;

			svgNode.style.margin = 
				"-" + Configuration.SPILLOVER_TOP + "px " + 
				"-" + Configuration.SPILLOVER_RIGHT + "px " + 
				"-" + Configuration.SPILLOVER_BOTTOM + "px " + 
				"-" + Configuration.SPILLOVER_LEFT + "px";
		}

		boundingBox = svgNode.getBoundingClientRect();
		var nodeWidth = boundingBox.right - boundingBox.left;
		var nodeHeight = boundingBox.bottom - boundingBox.top;

		//svgNode.setAttribute("viewBox", "0 0 " + nodeWidth + " " + nodeHeight);

		var chart = SVG(svgNode);

		// Ensure SVG.js doesn't automatically assign incorrect width/height attributes
		svgNode.removeAttribute("width");
		svgNode.removeAttribute("height");

		renderer(
			Configuration.SPILLOVER_LEFT,
			Configuration.SPILLOVER_TOP,
			primaryWidth,
			primaryHeight,
			options,
			table,
			chart
		);

		svgNode.className.baseVal = svgNode.className.baseVal.replace("fm-unrendered-chart", "");

		drawPoweredByFactmint(svgNode, width.value + width.units);

		return svgNode;
	}

	var svgNode = drawSVGNode();

	window.addEventListener("resizefinished", function() {
		svgNode.parentNode.removeChild(svgNode);
		var poweredByFactmintLink = document.querySelector(".fm-powered-by-factmint");
		poweredByFactmintLink.parentNode.removeChild(poweredByFactmintLink);
		svgNode = drawSVGNode();
	}, false);

}
	
});
define([
	'snap',
	'classList',
	'config',
	'data-processor',
	'stacked-area'
],
function(
	Snap,
	classList,
	Config,
	DataProcessor,
	stackedAreaGraph
) {
	
function attributeToCamelCase(attribute) {
	return attribute.split('-').map(function(part, index) {
		if (index === 0) {
			return part;
		}
		else {
			return part.charAt(0).toUpperCase() + part.substr(1);
		}
	}).join('');
}
	
function drawPoweredByFactmint(previousSibling) {
	var link = document.createElement('div');
	link.className = 'fm-powered-by-factmint';
	link.innerHTML = 'Powered by <a style="color: #527a92" href="http://factmint.com/charts">Factmint</a>';
	link.style.fontSize = '8px';
	link.style.lineHeight = '12px';
	link.style.width = '100%';
	link.style.textAlign = 'right';
	link.style.fontFamily = 'Lato, sans-serif';
}

function drawPoweredByFactmint(previousSibling, width) {
	var link = document.createElement('div');
	link.innerHTML = 'Powered by <a style="color: #527a92" href="http://factmint.com/charts">Factmint</a>';
	link.style.fontSize = '8px';
	link.style.lineHeight = '12px';
	link.style.width = width;
	link.style.textAlign = 'center';
	link.style.fontFamily = 'Lato, sans-serif';

	previousSibling.parentNode.insertBefore(link, previousSibling.nextSibling);
}

var lengthRegex = /([0-9]+)(px|%|rem|em|ex|ch|vw|vh|vmin|vmax|mm|cm|in|pt|pc)/;

return function(table) {

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

	if (! options.width) {
		options.width = "100%";
	}

	if (! options.height) {
		options.height = "450px";
	}
	
	if (options.height.match(lengthRegex) === null || options.width.match(lengthRegex) === null) {
		throw "A valid CSS length must be used for the chart dimensions (such as 50% or 400px)";
	}
	
	var width = {};
	options.width.replace(lengthRegex, function(match, length, units) {
		width.value = parseFloat(length);
		width.spillover = width.value * (Config.SPILLOVER_LEFT + Config.SPILLOVER_RIGHT);
		width.units = units;
	});
	
	var height = {};
	options.height.replace(lengthRegex, function(match, length, units) {
		height.value = parseFloat(length);
		height.spillover = height.value * (Config.SPILLOVER_TOP + Config.SPILLOVER_BOTTOM);
		height.units = units;
	});

	var svgNode = document.createElementNS("http://www.w3.org/2000/svg", "svg");
	svgNode.style.opacity = 0;
	svgNode.style.transition = "opacity 0.3s ease-in-out";
	
	if (! table.id) {
		table.id = Math.floor(Math.random() * 0x1000000).toString(16);
	}
	svgNode.setAttribute('aria-describedby', table.id);
	
	if (options.enableSpillover) {
		svgNode.style.height = (height.value + height.spillover) + height.units;
		svgNode.style.width = (width.value + width.spillover) + width.units;
		
		svgNode.style.margin = 
			'-' + (Config.SPILLOVER_TOP * height.value) + height.units + ' ' + 
			'-' + (Config.SPILLOVER_RIGHT * width.value) + width.units + ' ' + 
			'-' + (Config.SPILLOVER_BOTTOM * height.value) + height.units + ' ' + 
			'-' + (Config.SPILLOVER_LEFT * width.value) + width.units;
	} else {
		svgNode.style.height = (height.value) + height.units;
		svgNode.style.width = (width.value) + width.units;
	}

	table.parentElement.insertBefore(svgNode, table);

	var paper = Snap(svgNode);

	var data = DataProcessor.tableToJSON(table, options);
	
	var boundingBox = svgNode.getBoundingClientRect();
	var nodeWidth = boundingBox.right - boundingBox.left;
	var nodeHeight = boundingBox.bottom - boundingBox.top;

	var canvasWidth = nodeWidth / (1 + Config.SPILLOVER_LEFT + Config.SPILLOVER_RIGHT);
	var canvasHeight = nodeHeight / (1 + Config.SPILLOVER_TOP + Config.SPILLOVER_BOTTOM);
	var canvasLeft = canvasWidth * Config.SPILLOVER_LEFT;
	var canvasTop = canvasHeight * Config.SPILLOVER_TOP;
	
	svgNode.setAttribute("viewBox", "0 0 " + nodeWidth + " " + nodeHeight);

	paper.chart(canvasLeft, canvasTop, canvasWidth, canvasHeight, data, options);
	
	table.classList.add("fm-hidden");
	svgNode.style.opacity = 1;
	
	drawPoweredByFactmint(svgNode, width.value + width.units);
};
});
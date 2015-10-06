define([
	"color",
	"configuration",
	"geometry",
	"path",
	"scale"
],
function(
	Color,
	Configuration,
	Geometry,
	Path,
	Scale
) {

function applyBorderFilter(chart, map) {
	var dilateRadius = 1.2 / map.scaleFactor;
	var namespace = "http://www.w3.org/2000/svg";

	var filter = document.createElementNS(namespace, "filter");
	filter.id = "black-border";
	filter.setAttribute("x", "-5%");
	filter.setAttribute("y", "-5%");
	filter.setAttribute("width", "110%");
	filter.setAttribute("height", "110%");

	var morphology = document.createElementNS(namespace, "feMorphology");
	morphology.setAttribute("in", "SourceAlpha");
	morphology.setAttribute("operator", "dilate");
	morphology.setAttribute("radius", "" + dilateRadius);
	morphology.setAttribute("result", "border");

	var gaussianBlur = document.createElementNS(namespace, "feGaussianBlur");
	gaussianBlur.setAttribute("in", "border");
	gaussianBlur.setAttribute("result", "blurred-border");
	gaussianBlur.setAttribute("stdDeviation", "0.1");

	var merge = document.createElementNS(namespace, "feMerge");
	var mergeNodeOne = document.createElementNS(namespace, "feMergeNode");
	mergeNodeOne.setAttribute("in", "blurred-border");
	var mergeNodeTwo = document.createElementNS(namespace, "feMergeNode");
	mergeNodeTwo.setAttribute("in", "SourceGraphic");
	merge.appendChild(mergeNodeOne);
	merge.appendChild(mergeNodeTwo);

	filter.appendChild(morphology);
	filter.appendChild(gaussianBlur);
	filter.appendChild(merge);

    chart.node.querySelector("defs").appendChild(filter);
}

/*
 * Map groups to corresponding colours
 */
function buildColorGroupMap(groups, classes) {
	var map = {};
	groups.forEach(function(currentGroup, groupIndex) {
		map[currentGroup] = classes[groupIndex];
	});
	return map;
}

/*
 * Create an array of the groups in the data
 */
function getGroupsFromKeys(keys) {
	var groups = [];

	for (var keyIndex = 1; keyIndex < keys.length; keyIndex++) {
		groups.push(keys[keyIndex].textContent);
	}

	return groups;
}

/*
 * Create a Scale object
 */
function createScale(rows, targetNumberOfIncrements, keySize) {
	if (! targetNumberOfIncrements) {
		targetNumberOfIncrements = Configuration.DEFAULT_TARGET_INCREMENT_COUNT;
	}
	var maxValue = Math.max
		.apply(Math, rows.map(function(row) {
			return row.value
		}));
		
	var minValue = Math.min
		.apply(Math, rows.map(function(row) {
			return row.value
		}));

	return Scale()
		.withIncrements(targetNumberOfIncrements)
		.project(new Scale().domains.RealNumbers(minValue, maxValue))
		.onto(new Scale().ranges.Linear(0, keySize));
}

/*
 * Create a deep clone of an SVG.js group, including one level of nested groups
 */
function cloneGroup(group) {
	var clone = group.parent.group();
	group.each(function(childIndex, children) {
		var childToAdd;

		if (children[childIndex].type == "g") {
			childToAdd = children[childIndex].clone();
			children[childIndex].each(function(innerChildIndex, innerChildren) {
				var innerChildToAdd = innerChildren[innerChildIndex].clone();

				innerChildToAdd.title = children[childIndex].title;
				if (! isNaN(children[childIndex].value)) {
					innerChildToAdd.value = children[childIndex].value;
				}
				if (children[childIndex].values) {
					innerChildToAdd.values = children[childIndex].values;
				}

				childToAdd.add(innerChildToAdd);
			})
		} else {
			childToAdd = children[childIndex].clone();
		}

		childToAdd.title = children[childIndex].title;
		if (! isNaN(children[childIndex].value)) {
			childToAdd.value = children[childIndex].value;
		}
		if (children[childIndex].values) {
			childToAdd.values = children[childIndex].values;
		}

		clone.add(childToAdd);

	});

	return clone;
}

/*
 * Draw a "zoom-in" magnifying glass icon
 */
function drawZoomIcon(chart, color, size) {
	if (! color) {
		color = "black";
	}
	if (! size) {
		size = 0.22;
	}
	
	var icon = chart.group();

	var plusSymbol = chart.path("M42.4,23.1v39 M22.9,42.6h40")
		.attr({
			"fill": "none",
			"stroke": color,
			"stroke-width": "9",
			"stroke-miterlimit": "10"
		});
	var handle = chart.path("M78,43c0,19.3-15.7,35-35,35S8,62.3,8,43 S23.7,8,43,8S78,23.7,78,43z M67.2,68.3l30.2,30")
		.attr({
			"fill": "none",
			"stroke": color,
			"stroke-width": "16",
			"stroke-miterlimit": "10"
		});

	icon.add(plusSymbol);
	icon.add(handle);

	icon.scale(size, size);

	icon.addClass("fm-choropleth-zoom-icon");

	return icon;
}


/*
 * Draw visible rectangles to illustrate layout regions (for testing only)
 */
function drawTestRegions(chart, layout) {
	var mapArea = chart.rect(
		layout.drawRegions.mapArea.width,
		layout.drawRegions.mapArea.height
	);
	mapArea.move(
		layout.drawRegions.mapArea.x,
		layout.drawRegions.mapArea.y
	);
	mapArea.attr({
		"fill": "transparent",
		"stroke": "black"
	});

	var keyArea = chart.rect(
		layout.drawRegions.keyArea.width,
		layout.drawRegions.keyArea.height
	);
	keyArea.move(
		layout.drawRegions.keyArea.x,
		layout.drawRegions.keyArea.y
	);
	keyArea.attr({
		"fill": "transparent",
		"stroke": "black"
	});

	return {
		mapArea: mapArea,
		keyArea: keyArea
	};
}

function hasCollision(bBoxOne, bBoxTwo) {
	return !(
		((bBoxOne.y + bBoxOne.height) < (bBoxTwo.y)) ||
		(bBoxOne.y > (bBoxTwo.y + bBoxTwo.height)) ||
		((bBoxOne.x + bBoxOne.width) < bBoxTwo.x) ||
		(bBoxOne.x > (bBoxTwo.x + bBoxTwo.width))
	)
}

return {
	applyBorderFilter: applyBorderFilter,
	buildColorGroupMap: buildColorGroupMap,
	getGroupsFromKeys: getGroupsFromKeys,
	cloneGroup: cloneGroup,
	createScale: createScale,
	drawTestRegions: drawTestRegions,
	drawZoomIcon: drawZoomIcon,
	hasCollision: hasCollision
};

});
define([
	"color",
	"color-scale-key",
	"configuration",
	"key",
	"multi-measure-tooltip",
	"number",
	"path",
	"svg-js",
	"tooltip",
	"utilities"
],
function(
	Color,
	ColorScaleKey,
	Configuration,
	Key,
	MultiMeasureTooltip,
	NumberUtilities,
	Path,
	SVG,
	Tooltip,
	Utilities
) {

function removeTooltip(chart) {
	if (chart.tooltip) {
		chart.tooltip.remove();
	}
}

function removeSecondaryTooltip(chart) {
	if (chart.secondaryTooltip) {
		chart.secondaryTooltip.remove();
	}
}

function deactivateAllAreas(map) {
	map.each(function() {
		this.active = false;
		this.removeClass("fm-highlighted");
		this.removeClass("fm-active");
	});
}

function markKeyValue(keyType, key, value, secondaryMarker) {
	if (keyType == "scalar" && value) {
		key.markValue(value, secondaryMarker);
	}
}

function removeKeyMarker(key) {
	if (key.valueMarker) {
		key.valueMarker.remove();
	}
}

function removeSecondaryKeyMarker(key) {
	if (key.secondaryValueMarker) {
		key.secondaryValueMarker.remove();
	}
}

/*
 * Handle mouse over events on a map area
 */
var areaMouseOverHandler = function(map, chartDescription, stateMachine, key) {
	var currentArea = this;

	var areaActive = stateMachine.isInState("AreaActive") || stateMachine.isInState("ShowingZoomRegionAndAreaActive");
	var showingZoomRegion = stateMachine.isInState("ShowingZoomRegion") || stateMachine.isInState("ShowingZoomRegionAndAreaActive");

	this.remove();
	map.add(currentArea);

	if (areaActive) {
		var activeArea = chartDescription.chart.activeArea;
		chartDescription.chart.activeArea.remove();
		map.add(activeArea);
	}

	if (areaActive && ! currentArea.active) {
		markKeyValue(chartDescription.keyType, key, currentArea.value, true);
		currentArea.addClass("fm-highlighted");
		if (showingZoomRegion && chartDescription.keyType == "non-scalar" && currentArea.values) {
			showMultiMeasureTooltip(currentArea, chartDescription, true, stateMachine);
		} else {
			showTooltip(currentArea, chartDescription, true, showingZoomRegion, stateMachine);
		}
	} else if (! areaActive) {
		markKeyValue(chartDescription.keyType, key, currentArea.value);
		currentArea.addClass("fm-active");
		showTooltip(currentArea, chartDescription, false, showingZoomRegion, stateMachine);
	}
}

/*
 * Handle mouse out events on a map area
 */
var areaMouseOutHandler = function(map, chartDescription, stateMachine, key) {
	var currentArea = this;

	var areaActive = stateMachine.isInState("AreaActive") || stateMachine.isInState("ShowingZoomRegionAndAreaActive");

	if (areaActive) {
		currentArea.removeClass("fm-highlighted");
		removeSecondaryKeyMarker(key);
		if (currentArea.active !== true) {
			removeSecondaryTooltip(chartDescription.chart);
		}
	} else {
		currentArea.removeClass("fm-active");
		removeKeyMarker(key);
		removeTooltip(chartDescription.chart);
	}
}

/*
 * Handle click events on a map area
 */
var areaClickHandler = function(map, chartDescription, stateMachine, key) {
	var currentArea = this;

	var areaActive = stateMachine.isInState("AreaActive") || stateMachine.isInState("ShowingZoomRegionAndAreaActive");
	var showingZoomRegion = stateMachine.isInState("ShowingZoomRegion") || stateMachine.isInState("ShowingZoomRegionAndAreaActive");

	if (showingZoomRegion && chartDescription.keyType == "non-scalar") {
		if (! currentArea.values) {
			return;
		}

		if (! areaActive) {
			removeTooltip(chartDescription.chart);
			deactivateAllAreas(map);
			currentArea.addClass("fm-active");
			showMultiMeasureTooltip(currentArea, chartDescription, false, stateMachine);
		} else if (areaActive && ! currentArea.active) {
			removeTooltip(chartDescription.chart);
			removeSecondaryTooltip(chartDescription.chart);
			deactivateAllAreas(map);
			currentArea.addClass("fm-active");
			showMultiMeasureTooltip(currentArea, chartDescription, false, stateMachine);
		}

		if (! currentArea.active) {
			currentArea.active = true;
			chartDescription.chart.activeArea = currentArea;
			stateMachine.transition("ShowingZoomRegionAndAreaActive");
		} else {
			currentArea.active = false;
			chartDescription.chart.activeArea = null;
			stateMachine.transition("ShowingZoomRegion");
			removeTooltip(chartDescription.chart);
		}

	} else {
		if (! currentArea.value) {
			return;
		}
		
		if (areaActive && ! currentArea.active) {
			removeTooltip(chartDescription.chart);
			removeSecondaryTooltip(chartDescription.chart);
			deactivateAllAreas(map);
			currentArea.addClass("fm-active");
			showTooltip(currentArea, chartDescription, false, showingZoomRegion, stateMachine);
		}

		if (! currentArea.active) {
			currentArea.active = true;
			chartDescription.chart.activeArea = currentArea;
			if (showingZoomRegion) {
				stateMachine.transition("ShowingZoomRegionAndAreaActive");
			} else {
				stateMachine.transition("AreaActive");
			}
			removeKeyMarker(key);
			markKeyValue(chartDescription.keyType, key, currentArea.value);
		} else {
			currentArea.active = false;
			chartDescription.chart.activeArea = null;
			if (stateMachine.isInState("ShowingZoomRegionAndAreaActive")) {
				stateMachine.transition("ShowingZoomRegion");
			} else {
				stateMachine.transition("Neutral");
			}
			removeTooltip(chartDescription.chart);
		}
	}
}

/**
 * Apply the relevant mouse handlers to a given map area
 */
function applyAreaPathMouseHandlers(areaPath, map, chartDescription, stateMachine, key) {
	areaPath.on("mouseover", function() {
		areaMouseOverHandler.call(this, map, chartDescription, stateMachine, key);
	});
	areaPath.on("mouseout", function() {
		areaMouseOutHandler.call(this, map, chartDescription, stateMachine, key);
	});
	areaPath.on("click", function() {
		areaClickHandler.call(this, map, chartDescription, stateMachine, key);
	});
}

/**
 * Apply the relevant mouse handlers to a given map region
 */
function applyRegionMouseHandlers(region, map, chartDescription, stateMachine, key) {
	region.on("mouseover", function() {
		var currentRegion = this;
		currentRegion.remove();
		map.add(currentRegion);
		currentRegion.attr({
			"filter": "url(#black-border)"
		});
		showTooltip(region, chartDescription, false, false, stateMachine, true);
	});

	region.on("mouseout", function() {
		var currentRegion = this;
		currentRegion.attr({
			"filter": ""
		});
		removeTooltip(chartDescription.chart);
	});

	region.on("click", function() {
		var currentRegion = this;
		var currentRegionBBox = currentRegion.bbox();
		reset(chartDescription, key, map, stateMachine);

		map.addClass("fm-hidden");

		showZoomRegion(map, chartDescription, key, currentRegion, currentRegionBBox, stateMachine);
	});
}

function tooltipMouseOverHandler(chartDescription, tooltipDescription, stateMachine, isMultiMeasure) {
	var arrowPosition = (tooltipDescription.arrowPosition == "left") ? "right" : "left";

	var newTooltip;
	if (isMultiMeasure) {
		newTooltip = MultiMeasureTooltip(
			chartDescription.chart,
			tooltipDescription.title,
			tooltipDescription.values,
			chartDescription.colorClasses,
			arrowPosition
		);
	} else {
		newTooltip = Tooltip(
			chartDescription.chart,
			tooltipDescription.title,
			arrowPosition
		);
	}
	
	newTooltip.move(
		tooltipDescription.invertedLeftPoint,
		tooltipDescription.arrowTopPoint
	);

	var newInvertedLeftPoint = tooltipDescription.arrowLeftPoint;
	tooltipDescription.arrowLeftPoint = tooltipDescription.invertedLeftPoint;
	tooltipDescription.invertedLeftPoint = newInvertedLeftPoint;
	tooltipDescription.arrowPosition = arrowPosition;

	newTooltip.on("mouseover", function() {
		tooltipMouseOverHandler(chartDescription, tooltipDescription, stateMachine, isMultiMeasure);
	});

	removeTooltip(chartDescription.chart);
	chartDescription.chart.tooltip = newTooltip;
}

/**
 * Show a tooltip for a given map area
 */
function showTooltip(area, chartDescription, secondary, showingZoomRegion, stateMachine, includeZoomIcon) {
	var map = area.parent;
	var tooltipDescription = {};

	var areaBBox = area.bbox();

	tooltipDescription.arrowLeftPoint = (areaBBox.x * map.scaleFactor) + map.translateX;
	tooltipDescription.arrowTopPoint = (areaBBox.y * map.scaleFactor)
		+ map.translateY
		+ areaBBox.height * map.scaleFactor / 2;

	var mapAreaMidpoint = chartDescription.layout.drawRegions.mapArea.x
		+ chartDescription.layout.drawRegions.mapArea.width / 2;

	if (tooltipDescription.arrowLeftPoint < mapAreaMidpoint) {
		tooltipDescription.arrowPosition = "left";
		tooltipDescription.invertedLeftPoint = tooltipDescription.arrowLeftPoint;
		tooltipDescription.arrowLeftPoint += areaBBox.width * map.scaleFactor;
	} else {
		tooltipDescription.arrowPosition = "right";
		tooltipDescription.invertedLeftPoint = tooltipDescription.arrowLeftPoint + (areaBBox.width * map.scaleFactor);
	}

	tooltipDescription.title = area.title;
	if (! isNaN(area.value)) {
		tooltipDescription.title += ": " + NumberUtilities.renderValue(area.value);
	}

	var tooltip;
	
	if (includeZoomIcon) {
		var zoomIcon = Utilities.drawZoomIcon(chartDescription.chart, "white", 0.14);

		tooltip = Tooltip(
			chartDescription.chart,
			tooltipDescription.title,
			tooltipDescription.arrowPosition,
			zoomIcon
		);
	} else {
		tooltip = Tooltip(
			chartDescription.chart,
			tooltipDescription.title,
			tooltipDescription.arrowPosition
		);
	}

	tooltip.move(
		tooltipDescription.arrowLeftPoint,
		tooltipDescription.arrowTopPoint
	);

	if (secondary) {

		var tooltipBBox = chartDescription.chart.tooltip.bbox();
		var secondaryTooltipBBox = tooltip.bbox();
		if (Utilities.hasCollision(tooltipBBox, secondaryTooltipBBox)) {
			tooltipDescription.arrowPosition = (tooltipDescription.arrowPosition == "left") ? "right" : "left";
			tooltip.remove();
			tooltip = Tooltip(
				chartDescription.chart,
				tooltipDescription.invertedLeftPoint,
				tooltipDescription.arrowTopPoint,
				tooltipDescription.title,
				tooltipDescription.arrowPosition
			);
		}

		chartDescription.chart.secondaryTooltip = tooltip;
		chartDescription.chart.secondaryTooltip.addClass("fm-secondary");
	} else {
		chartDescription.chart.tooltip = tooltip;
		tooltip.on("mouseover", function() {
			tooltipMouseOverHandler(chartDescription, tooltipDescription, stateMachine);
		});
	}
}

/**
 * Show a tooltip with multiple measures for a given map area
 */
function showMultiMeasureTooltip(area, chartDescription, secondary, stateMachine) {
	var map = area.parent;
	var tooltipDescription = {};

	var areaBBox = area.node.getBBox();

	tooltipDescription.arrowLeftPoint = (areaBBox.x * map.scaleFactor) + map.translateX;
	tooltipDescription.arrowTopPoint = (areaBBox.y * map.scaleFactor)
		+ map.translateY
		+ areaBBox.height * map.scaleFactor / 2;

	var mapAreaMidpoint = chartDescription.layout.drawRegions.mapArea.x
		+ chartDescription.layout.drawRegions.mapArea.width / 2;

	if (tooltipDescription.arrowLeftPoint < mapAreaMidpoint) {
		tooltipDescription.arrowPosition = "left";
		tooltipDescription.invertedLeftPoint = tooltipDescription.arrowLeftPoint;
		tooltipDescription.arrowLeftPoint += areaBBox.width * map.scaleFactor;
	} else {
		tooltipDescription.arrowPosition = "right";
		tooltipDescription.invertedLeftPoint = tooltipDescription.arrowLeftPoint + (areaBBox.width * map.scaleFactor);
	}

	tooltipDescription.title = area.title;
	tooltipDescription.values = chartDescription.groups.map(function(groupItem) {
		var value = NumberUtilities.renderValue(area.values[groupItem]);
		return {
			title: groupItem,
			value: value
		}
	});

	var tooltip = MultiMeasureTooltip(
		chartDescription.chart,
		tooltipDescription.title,
		tooltipDescription.values,
		chartDescription.colorClasses,
		tooltipDescription.arrowPosition
	);
	
	tooltip.move(
		tooltipDescription.arrowLeftPoint,
		tooltipDescription.arrowTopPoint
	);
	
	var tooltipBBox = tooltip.bbox();

	if (secondary) {
		chartDescription.chart.secondaryTooltip = tooltip;
		chartDescription.chart.secondaryTooltip.addClass("fm-secondary");
	} else {
		chartDescription.chart.tooltip = tooltip;
		tooltip.on("mouseover", function() {
			tooltipMouseOverHandler(chartDescription, tooltipDescription, stateMachine, true);
		});
	}
}

/**
 * Draw the main choropleth
 */
var drawMap = function(chartDescription, key, mapData, rows, scale, stateMachine) {
	var map = chartDescription.chart.group();
	map.addClass("fm-choropleth-large-map");

	/*
	 * Draw an area on the map based on the provided path string
	 */
	function drawArea(pathString, title) {
		var areaPath = chartDescription.chart.path(pathString);
		
		areaPath.title = title;

		areaPath.addClass("fm-choropleth-area");
		areaPath.addClass("fm-choropleth-neutral-area");

		return areaPath;
	}

	function applyColorClass(area, areaKey) {
		if (key.type == "non-scalar") {
			rows.forEach(function(rowItem, rowIndex) {
				if (rowItem.title == areaKey) {
					area.removeClass("fm-choropleth-neutral-area");
					area.addClass(chartDescription.colorGroupMap[rowItem.majority.title]);
					area.values = rowItem.values;
				}
			});
		}
	}

	/*
	 * Draw all areas from the paths in the supplied data object
	 */
	function drawMapAreas() {
		var areas = {};
		var regionGroups = [];
		for (var mapDataKey in mapData) {
			var area;
			if (typeof mapData[mapDataKey] === "object") {
				var regionGroup = chartDescription.chart.group();
				regionGroup.addClass("fm-choropleth-region");
				regionGroup.title = mapDataKey;
				applyRegionMouseHandlers(
					regionGroup,
					map,
					chartDescription,
					stateMachine,
					key
				);
				for (var groupAreaKey in mapData[mapDataKey]) {
					area = drawArea(mapData[mapDataKey][groupAreaKey], groupAreaKey, true);
					regionGroup.add(area);
					area.title = groupAreaKey;

					map.add(regionGroup)

					applyColorClass(area, groupAreaKey);

					areas[groupAreaKey] = area;
				}
				
				regionGroups.push(regionGroup);
			} else {
				area = drawArea(mapData[mapDataKey], mapDataKey);
				area.title = mapDataKey;

				map.add(area);

				applyAreaPathMouseHandlers(
					area,
					map,
					chartDescription,
					stateMachine,
					key
				);

				applyColorClass(area, mapDataKey);

				areas[mapDataKey] = area;
			}
		}

		return areas;
	}

	/*
	 * Apply tint classes to the map areas based on data
	 */
	function addTintClasses(areas) {
		var tintStepSize = Math.ceil(Configuration.MAX_TINT_NUMBER / (key.tickMarks.length - 2));
		rows.forEach(function(rowItem, rowIndex) {
			if (areas[rowItem.title]) {
				if (rowItem.value == key.tickMarks[key.tickMarks.length - 1].value) {
					areas[rowItem.title].addClass(Configuration.POSITIVE_COLOR_CLASS);
					areas[rowItem.title].removeClass("fm-choropleth-neutral-area");
					areas[rowItem.title].value = rowItem.value;
				} else {
					key.tickMarks.some(function(tickMark, tickMarkIndex, tickMarks) {
						if (tickMarkIndex == tickMarks.length - 1) {
							return false;
						}
						if (rowItem.value >= tickMark.value && rowItem.value < key.tickMarks[tickMarkIndex + 1].value) {
							var tintNumber = parseInt(Configuration.MAX_TINT_NUMBER - tickMarkIndex * tintStepSize);
							if (rowItem.value >= 0) {
								areas[rowItem.title].addClass(Configuration.POSITIVE_COLOR_CLASS);
							} else {
								areas[rowItem.title].addClass(Configuration.NEGATIVE_COLOR_CLASS);
							}
							areas[rowItem.title].removeClass("fm-choropleth-neutral-area");
							areas[rowItem.title].value = rowItem.value;
							if (tintNumber > 0) {
								areas[rowItem.title].addClass("tint-" + tintNumber);
							}
							return true;
						}
					});
				}
			}
		});
	}

	var areas = drawMapAreas();

	map.boundingBox = map.bbox();

	if (key.type == "scalar") {
		addTintClasses(areas);
	}

	var heightScaleFactor = chartDescription.layout.drawRegions.mapArea.height
		/ map.boundingBox.height
		/ (1 + Configuration.MAP_AREA_PADDING);
	var widthScaleFactor = chartDescription.layout.drawRegions.mapArea.width
		/ map.boundingBox.width
		/ (1 + Configuration.MAP_AREA_PADDING);
	
	map.scaleFactor = Math.min(
		heightScaleFactor,
		widthScaleFactor
	);

	for (key in areas) {
		areas[key].attr({
			"stroke": "white",
			"stroke-width": 1 / map.scaleFactor
		});
	}

	map.scale(
		map.scaleFactor,
		map.scaleFactor
	);

	map.boundingBox = map.bbox();

	// Workaround for inaccurate SVG bounding box
	var halfWidthDivisorAccountingForBBoxError = 2.8;

	map.translateX = chartDescription.layout.drawRegions.mapArea.x
		+ chartDescription.layout.drawRegions.mapArea.width / 2
		- map.boundingBox.width / halfWidthDivisorAccountingForBBoxError;

	map.translateY = chartDescription.layout.drawRegions.mapArea.y
		+ chartDescription.layout.drawRegions.mapArea.height / 2
		- map.boundingBox.height / halfWidthDivisorAccountingForBBoxError;

	map.move(
		map.translateX,
		map.translateY
	);

	return map;
};

/**
 * Draw the key
 */
var drawKey = function(chartDescription, data, scale, type) {
	var key;

	if (type == "scalar") {
		var tintStepSize = Math.ceil(Configuration.MAX_TINT_NUMBER / (scale.domain.increments.length - 2));

		var tickMarks = scale.domain.increments.map(function(increment, incrementIndex, increments) {
			var tickMark = {
				value: increment
			};

			var tintStepSize = Math.ceil(Configuration.MAX_TINT_NUMBER / (scale.domain.increments.length - 2));
			var tintNumber = parseInt(Configuration.MAX_TINT_NUMBER - incrementIndex * tintStepSize);
			if (tintNumber > 0) {
				tickMark.tintClass = "tint-" + tintNumber;
			}

			return tickMark;
		});

		key = ColorScaleKey(
			chartDescription.chart,
			tickMarks,
			Configuration.MAX_TINT_NUMBER,
			scale,
			chartDescription.layout.keyOrientation,
			Configuration.POSITIVE_COLOR_CLASS,
			Configuration.NEGATIVE_COLOR_CLASS
		);

		key.addClass('color-scale-key');

	} else {
		key = Key(
			chartDescription.chart,
			chartDescription.width,
			chartDescription.groups.slice(0, chartDescription.layout.keyValueCount),
			chartDescription.colorClasses
		)
			.move(
				chartDescription.layout.drawRegions.keyArea.x,
				chartDescription.layout.drawRegions.keyArea.y
			);
	}

	key.type = type;
	return key;
};

function positionKey(chartDescription, key, keyBBox) {
	var xPosition;
	var yPosition;

	if (chartDescription.layout.keyOrientation === "horizontal") {
		xPosition = chartDescription.layout.drawRegions.keyArea.x
			+ chartDescription.layout.drawRegions.keyArea.width / 2;
		if (key.type == "scalar") {
			xPosition -= key.colorMarkers.bbox().width / 2;
		} else {
			xPosition -= keyBBox.width / 2;
		}
		yPosition = chartDescription.layout.drawRegions.keyArea.y
			+ chartDescription.layout.drawRegions.keyArea.height / 2
			- keyBBox.height / 2;
		if (key.type == "scalar") {
			yPosition -= key.configuration.VALUE_MARKER_LENGTH;
		} 
	} else {
		xPosition = chartDescription.layout.drawRegions.keyArea.x
			+ chartDescription.layout.drawRegions.keyArea.width / 2
			- keyBBox.width / 2;
		yPosition = chartDescription.layout.drawRegions.keyArea.y
			+ chartDescription.layout.drawRegions.keyArea.height
			- keyBBox.height;
	}

	key.move(xPosition, yPosition);
}

/*
 * Reset the chart (hide tooltips and remove active styles)
 */
function reset(chartDescription, key, map, stateMachine) {
	var showingZoomRegion = stateMachine.isInState("ShowingZoomRegion") || stateMachine.isInState("ShowingZoomRegionAndAreaActive");
	if (showingZoomRegion) {
		map.zoomedRegion.animate(Configuration.ANIMATE_SPEED).attr("opacity", "0").after(function() {
			this.remove();
		});
		hideThumnailMap(chartDescription.chart, map, function() {
			map.removeClass("fm-hidden");
		});
	}
	removeTooltip(chartDescription.chart);
	removeSecondaryTooltip(chartDescription.chart);
	removeKeyMarker(key);
	removeSecondaryKeyMarker(key);
	map.each(function() {
		this.active = false;
		this.removeClass("fm-highlighted");
		this.removeClass("fm-active");
	});
	stateMachine.transition("Neutral");
}

function showThumbnailMap(chartDescription, key, map, stateMachine) {
	var thumbnailMapGroup = chartDescription.chart.group();

	var thumbnailMap = Utilities.cloneGroup(map);
	thumbnailMap.scale(map.scaleFactor, map.scaleFactor);
	thumbnailMap.addClass("fm-choropleth-thumbnail-map");

	thumbnailMap.animate(Configuration.ANIMATE_SPEED).scale(
		map.scaleFactor * Configuration.THUMBNAIL_MAP_SCALE_FACTOR,
		map.scaleFactor * Configuration.THUMBNAIL_MAP_SCALE_FACTOR
	).after(function() {
		var thumbnailMapBBox = thumbnailMap.bbox();

		// Workarround for inaccurate SVG bounding box
		var inaccurateBBoxCompensationFactor = 1.2;
		
		thumbnailMap.move(Configuration.THUMBNAIL_MAP_SIDE_PADDING * inaccurateBBoxCompensationFactor, Configuration.THUMBNAIL_MAP_TOP_BOTTOM_PADDING * inaccurateBBoxCompensationFactor);

		var thumbnailMapBackgroundWidth = thumbnailMapBBox.width / inaccurateBBoxCompensationFactor  + Configuration.THUMBNAIL_MAP_SIDE_PADDING * 2;
		var thumbnailMapBackgroundHeight = thumbnailMapBBox.height / inaccurateBBoxCompensationFactor + Configuration.THUMBNAIL_MAP_TOP_BOTTOM_PADDING * 2;

		var thumbnailMapBackground = chartDescription.chart.rect(
			thumbnailMapBackgroundWidth,
			thumbnailMapBackgroundHeight
		)
		thumbnailMapBackground.attr("opacity", "0").animate(Configuration.ANIMATE_SPEED).attr("opacity", "1");
		thumbnailMapBackground.addClass("fm-choropleth-thumbnail-map-background");

		var zoomIcon = Utilities.drawZoomIcon(chartDescription.chart);
		zoomIcon.attr("opacity", "0");
		zoomIcon.move(
			thumbnailMapBackgroundWidth - Configuration.THUMBNAIL_MAP_SIDE_PADDING / 2 - zoomIcon.bbox().width,
			Configuration.THUMBNAIL_MAP_SIDE_PADDING / 2
		);
		zoomIcon.animate(Configuration.ANIMATE_SPEED).attr("opacity", "1");

		thumbnailMapGroup.add(thumbnailMapBackground);
		thumbnailMapGroup.add(zoomIcon);
		thumbnailMapGroup.add(thumbnailMap);

		thumbnailMapGroup.addClass("fm-choropleth-thumbnail-map");

		thumbnailMapGroup.on("click", function() {
			reset(chartDescription, key, map, stateMachine);
		});

		chartDescription.chart.thumbnailMap = thumbnailMap;
		chartDescription.chart.thumbnailMapBackground = thumbnailMapBackground;
		chartDescription.chart.thumbnailMapZoomIcon = zoomIcon;
	});

}

function hideThumnailMap(chart, map, callback) {
	chart.thumbnailMapBackground.remove();
	chart.thumbnailMapZoomIcon.remove();
	chart.thumbnailMap.animate(Configuration.ANIMATE_SPEED).scale(map.scaleFactor, map.scaleFactor).after(function() {
		callback();
		chart.thumbnailMap.remove();
	});
}

/*
 * Show a zoom region
 */
function showZoomRegion(map, chartDescription, key, region, regionBBox, stateMachine) {
	stateMachine.transition("ShowingZoomRegion");

	showThumbnailMap(chartDescription, key, map, stateMachine);

	var zoomedRegion = Utilities.cloneGroup(region);
	zoomedRegion.attr("opacity", "0");

	zoomedRegion.addClass("fm-choropleth-zoomed-region fm-choropleth-large-map");

	var thumbnailMapHeight = map.boundingBox.height * Configuration.THUMBNAIL_MAP_SCALE_FACTOR;

	var heightScaleFactor = (chartDescription.layout.drawRegions.mapArea.height - thumbnailMapHeight)
		/ regionBBox.height
		/ (1 + Configuration.MAP_AREA_PADDING);
	var widthScaleFactor = chartDescription.layout.drawRegions.mapArea.width
		/ regionBBox.width
		/ (1 + Configuration.MAP_AREA_PADDING);

	zoomedRegion.scaleFactor = Math.min(
		heightScaleFactor,
		widthScaleFactor
	);

	zoomedRegion.scale(
		zoomedRegion.scaleFactor,
		zoomedRegion.scaleFactor
	);

	zoomedRegion.animate(Configuration.ANIMATE_SPEED).attr("opacity", "1");

	zoomedRegion.each(function(areaIndex, area) {
		this.attr({
			"stroke": "white",
			"stroke-width": 1 / zoomedRegion.scaleFactor
		});
	});

	zoomedRegion.translateX = chartDescription.layout.drawRegions.mapArea.x
		+ chartDescription.layout.drawRegions.mapArea.width / 2
		- regionBBox.width * zoomedRegion.scaleFactor / 2
		- regionBBox.x * zoomedRegion.scaleFactor;

	zoomedRegion.translateY = chartDescription.layout.drawRegions.mapArea.y
		- regionBBox.y * zoomedRegion.scaleFactor
		+ thumbnailMapHeight + Configuration.THUMBNAIL_MAP_TOP_BOTTOM_PADDING * 2;

	zoomedRegion.move(
		zoomedRegion.translateX,
		zoomedRegion.translateY
	);

	chartDescription.chart.add(zoomedRegion);

	zoomedRegion.children().forEach(function(area, areaIndex) {
		applyAreaPathMouseHandlers(area, zoomedRegion, chartDescription, stateMachine, key);
	});

	map.zoomedRegion = zoomedRegion;

}

return {
	drawMap: drawMap,
	drawKey: drawKey,
	positionKey: positionKey,
	reset: reset
};

});
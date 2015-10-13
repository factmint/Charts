define([
	"configuration",
	"key",
	"state",
	"svg-js",
	"text-area"
],
function(
	Configuration,
	Key,
	StateUtilities,
	SVG,
	TextArea
) {

return function(chartDescription, data, innerSegments, outerSegments, dashedBracket, key) {
	
var KEY_DETAILS_SPACING = 10;

function repositionKey() {
	var yPosition = chartDescription.layout.drawRegions.keyArea.y;
	if (chartDescription.orientation == "landscape") {
		yPosition += chartDescription.layout.drawRegions.keyArea.height / 2 - key.background.bbox().height / 2;
	} else {
		yPosition += chartDescription.top + chartDescription.height - key.bbox().height
	}

	key.move(
		chartDescription.layout.drawRegions.keyArea.x,
		yPosition
	);
}

function resetKey(data) {
	var keyValues = [];
	var colorOverrides = [];
	data.forEach(function(dataItem, dataItemIndex) {
		keyValues.push(dataItem.title);
		if (dataItem.colorOverride) {
			colorOverrides[dataItemIndex] = dataItem.colorOverride;
		}
	});
	key.setValues(keyValues, colorOverrides);
	key.background.removeClass(key.backgroundColorClass);
	key.background.attr({ fill: "none" });
	key.background.removeClass("tint-9");
	key.background.addClass("fm-datum-color-neutral");
	key.backgroundColorClass = "fm-datum-color-neutral";
	
	repositionKey();
}

function showOverflowItemsInKey() {
	if (key.titleText) key.titleText.remove();
	if (key.bodyText) key.bodyText.remove();
	
	var overflowData = data[data.length - 1].overflow;
	
	resetKey(overflowData);
}

function showDefaultItemsInKey() {
	if (key.titleText) key.titleText.remove();
	if (key.bodyText) key.bodyText.remove();
	
	resetKey(data);
}

function showSegmentDetailsInKey(details) {
	key.clearItems();
	if (key.titleText) key.titleText.remove();
	if (key.bodyText) key.bodyText.remove();
	
	if (details.title && details.body) {
		var keyBBox = key.bbox();
		
		var titleText = chartDescription.chart.text(details.title)
			.addClass("fm-key-title");
			
		var titleTextBBox = titleText.bbox();

		titleText.move(
			keyBBox.width / 2 - titleTextBBox.width / 2,
			KEY_DETAILS_SPACING
		);
		
		key.add(titleText);
		key.titleText = titleText;
		
		var bodyText = TextArea(
			chartDescription.chart,
			keyBBox.width - key.configuration.PADDING_LEFT - key.configuration.PADDING_RIGHT,
			chartDescription.layout.drawRegions.keyArea.height - titleTextBBox.height - KEY_DETAILS_SPACING * 5,
			details.body,
			"fm-key-body"
		);
		
		bodyText.move(
			key.configuration.PADDING_LEFT,
			titleTextBBox.y2 + KEY_DETAILS_SPACING
		);
			
		key.background.height(bodyText.bbox().height + titleTextBBox.height + KEY_DETAILS_SPACING * 4);
		repositionKey();			

		key.add(bodyText);
		key.bodyText = bodyText;
	}
	
	key.background.removeClass(key.backgroundColorClass);
	
	if (details.colorOverride) {
		key.background.attr({ fill: details.colorOverride.morph("#fff").at(0.65).toHex() });
		titleText.attr({ fill: details.colorOverride.morph("#000").at(0.45).toHex() });
	} else {
		key.background.addClass(details.colorClass);
		
		if (! key.background.hasClass("tint-9")) {
			key.background.addClass("tint-9");
		}
		key.backgroundColorClass = details.colorClass;
		
		if (details.title && details.body) {
			titleText.addClass(details.colorClass);
		}
	}
}

var Neutral = new StateUtilities.State("Neutral");
Neutral.enter = function(data, previousState) {
	innerSegments.each(function() {
		this.isCurrentlyActive = false;
	});
	outerSegments.addClass("fm-hidden");
	dashedBracket.addClass("fm-hidden");
	if (previousState && previousState != "Neutral") {
		showDefaultItemsInKey();
	}
};
Neutral.leave = function() {
	
};

var ShowingDataInKey = new StateUtilities.State("ShowingDataInKey");
ShowingDataInKey.enter = function(keyData, previousState) {
	showSegmentDetailsInKey(keyData);
};
ShowingDataInKey.leave = function() {

};

var ShowingOverflow = new StateUtilities.State("ShowingOverflow");
ShowingOverflow.enter = function() {
	innerSegments.each(function() {
		this.isCurrentlyActive = false;
	});
	outerSegments.removeClass("fm-hidden");
	dashedBracket.removeClass("fm-hidden");
	showOverflowItemsInKey();
};
ShowingOverflow.leave = function(newState) {
	if (newState != "ShowingOverflowAndDataInKey") {
		outerSegments.addClass("fm-hidden");
		dashedBracket.addClass("fm-hidden");
	}
};

var ShowingOverflowAndDataInKey = new StateUtilities.State("ShowingOverflowAndDataInKey");
ShowingOverflowAndDataInKey.enter = function(keyData) {
	showSegmentDetailsInKey(keyData);
};
ShowingOverflowAndDataInKey.leave = function(newState) {
	if (newState != "ShowingOverflowAndDataInKey") {
		outerSegments.addClass("fm-hidden");
		dashedBracket.addClass("fm-hidden");
	}
};

return new StateUtilities.StateMachine(
	Neutral,
	ShowingDataInKey,
	ShowingOverflow,
	ShowingOverflowAndDataInKey
);

};
});
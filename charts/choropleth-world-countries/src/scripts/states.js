define([
	'color-scale-key',
	"configuration",
	"state",
	"svg-js"
],
function(
	ColorScaleKey,
	Configuration,
	StateUtilities,
	SVG
) {

return function(chart, data, key) {

var Neutral = new StateUtilities.State("Neutral");
Neutral.enter = function() {
};
Neutral.leave = function() {

};

var AreaActive = new StateUtilities.State("AreaActive");
AreaActive.enter = function() {
};
AreaActive.leave = function() {
};

var ShowingZoomRegion = new StateUtilities.State("ShowingZoomRegion");
ShowingZoomRegion.enter = function() {
};
ShowingZoomRegion.leave = function() {
};

var ShowingZoomRegionAndAreaActive = new StateUtilities.State("ShowingZoomRegionAndAreaActive");
ShowingZoomRegionAndAreaActive.enter = function() {
};
ShowingZoomRegionAndAreaActive.leave = function() {
};

return new StateUtilities.StateMachine(
	Neutral,
	AreaActive,
	ShowingZoomRegion,
	ShowingZoomRegionAndAreaActive
);

};

});
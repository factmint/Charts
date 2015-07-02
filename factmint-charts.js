window['factmint'] = {
  ready: function(callback) {
    window.factmint._onready = callback;
  }
};

require([
   "svg-js",
   "color",
   "geometry",
   "mapper",
   "number",
   "scale",
   "state",
   "key",
   "color-scale-key",
   "tooltip",
   "two-section-tooltip",
   "multi-measure-tooltip",
   "text-area",
   "G.unshift",
   "circle-segment",
   "doughnut-segment",
   "flow",
   "dashed-bracket"
], function(
    SVG,
    colorUtils,
    geometryUtils,
    mapperUtils,
    numberUtils,
    scaleUtils,
    stateUtils,
    keyComponent,
    colorScaleKeyComponent,
    tooltipComponent,
    twoSectionTooltipComponent,
    multiMeasureTooltipComponent,
    textAreaComponent
) {
    window.factmint.draw = function(parent) {
        return new SVG(parent);
    }
    
    window.factmint.utilities = {
        color: colorUtils,
        geometry: geometryUtils,
        mapper: mapperUtils,
        number: numberUtils,
        scale: scaleUtils,
        state: stateUtils
    };
    
    window.factmint.components = {
        key: keyComponent,
        colorScaleKey: colorScaleKeyComponent,
        tooltip: tooltipComponent,
        twoSectionTooltip: twoSectionTooltipComponent,
        multiMeasureTooltip: multiMeasureTooltipComponent,
        textArea: textAreaComponent
    }
    
    window.factmint._onready();
});
window['factmint'] = {
  ready: function(success, failure) {
    window.factmint._onready = success;
    window.factmint._onnotsupported = failure;
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
    if (SVG.supported) {
        window.factmint.draw = function(parent, width, height) {
            if (typeof width === "undefined") {
                width = "100%";
            }
            
            if (typeof height === "undefined") {
                height = "500px";
            }
            
            var draw = new SVG(parent);
            
            draw.size(width, height);
            
            return draw;
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
        
        if (window.factmint._onready instanceof Function) {
            window.factmint._onready();
        }
    } else {
        if (window.factmint._onnotsupported instanceof Function) {
            window.factmint._onnotsupported();
        }
    }
});

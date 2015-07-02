window['factmint'] = {
  ready: function(callback) {
    window.factmint._onready = callback;
  }
};

require.config({
    paths: {
        "classList": "node_modules/classList/classList",
        "path": "node_modules/paths-js/dist/amd/path",
        "svg-js": "node_modules/svg.js/dist/svg",
        "circle-segment": "inventions/circle-segment",
        "geometry": "utilities/geometry"
    }
});

require([
   "svg-js",
   "circle-segment"
], function(
    SVG
) {
    window.factmint.SVG = SVG;
    
    window.factmint._onready();
});
window['factmint'] = {
  ready: function(callback) {
    window.factmint._onready = callback;
  }
};

require([
   "svg-js",
   "circle-segment"
], function(
    SVG
) {
    window.factmint.SVG = SVG;
    
    window.factmint._onready();
});
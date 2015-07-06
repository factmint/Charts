define([
	"svg-js"
], function(
	SVG
) {

return function(
	chart,
	width,
	height,
	text,
	className
) {
    
    var words = text.split(/\s+/);
    var lines = [];
    
    var line = "";
    words.forEach(function(word, wordIndex) {
        var stringToTest = (wordIndex != 0) ? line + " " + word : word;
        var lineToTest = chart.text(stringToTest).addClass(className);
        var widthToTest = lineToTest.bbox().width;
        lineToTest.remove();
        
        if (widthToTest < width) {
            line = stringToTest;
            if (wordIndex == words.length - 1) {
                lines.push(line);
            }
        } else {
            lines.push(line);
            if (wordIndex == words.length - 1) {
                lines.push(word);
            } else {
                line = word;
            }
        }
    });
    
    var textArea = chart.text(function(add) {
        lines.forEach(function(line) {
            var elementToTest = add.tspan(line).newLine().addClass(className);
            var heightToTest = add.bbox().height;
            elementToTest.node.parentNode.removeChild(elementToTest.node);
            
            if (heightToTest <= height) {
                add.tspan(line).newLine().addClass(className);
            }
        });
    }).addClass("fm-text-area");
    
    return textArea;
    
}

});
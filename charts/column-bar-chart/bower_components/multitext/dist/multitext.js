define(['snap'],
function(Snap) {
	return Snap.plugin(function (Snap, Element, Paper, glob) {
	    Paper.prototype.multitext = function (x, y, text, lineHeight, textAnchor) {
	    	if (typeof lineHeight === 'undefined') {
	    		lineHeight = '1.8em'
	    	}
	    	if (typeof textAnchor === 'undefined') {
	    		textAnchor = 'start'
	    	}
	        text = text.split("\n");
	        var multitext = this.text(x, y, text);
	        multitext.attr({
	            textAnchor: textAnchor
	        });
	        multitext.selectAll("tspan:nth-child(n+2)").attr({
	            dy: lineHeight,
	            x: x
	        });
	        return multitext;
	    };
	});
});
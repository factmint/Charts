SVG.extend(SVG.G, {
	unshift: function(svgJSElement) {
		this.node.insertBefore(svgJSElement.node, this.children()[0].node);
	}
});
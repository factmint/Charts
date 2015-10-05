define(['snap'],
function(Snap) {
	return Snap.plugin(function(Snap, Element, Paper) {

		Paper.prototype.gridLines = function(startX, startY, startPoints, length, orientation) {
			var paper = this;
			var gridLines = this.g();

			function drawHorizontalGridLines() {
				startPoints.forEach(function(startPoint, startPointIndex) {
					var newGridLine = paper.line(
						startX,
						startPoint.y,
						startX + length,
						startPoint.y
					)
						.addClass('fm-grid-line');
					gridLines.append(newGridLine);
				});
			}

			function drawVerticalGridLines() {
				startPoints.forEach(function(startPoint, startPointIndex) {
					var newGridLine = paper.line(
						startPoint.x,
						startY,
						startPoint.x,
						startY + length
					)
						.addClass('fm-grid-line');
					gridLines.append(newGridLine);
				});
			}

			if (orientation === 'horizontal') {
				drawHorizontalGridLines();
			} else if (orientation === 'vertical') {
				drawVerticalGridLines();
			} else {
				console.err('Invalid orientation specified');
			}

			return gridLines;
		};

	});
});
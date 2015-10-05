define(['snap', 'config', 'key', 'color-utils'],
function(Snap,   Config,   Key,   Color) {
	/**
	 * Represents a key
	 * @constructor
	 * @param {Snap} paper
	 * @param {Number} x
	 * @param {Number} y
	 * @param {Number} width
	 * @param {Number} columns
	 * @param {Number} columnWidth
	 * @param {String} alignment
	 * @param {Array.<string>} values
	 * @param {Number} maxValues
	 */
	function ScatterKey(paper, x, y, width, columns, columnWidth, centerItems, values, maxValues, maxValueLength) {
		
		Key.call(this, paper, x, y, width, columns, columnWidth, centerItems, values, maxValues, maxValueLength);

	}

	ScatterKey.prototype = Object.create(Key.prototype);

  ScatterKey.prototype.constructor = ScatterKey;

  ScatterKey.prototype.render = function(trendlineData) {

      Key.prototype.render.call(this);

      if ( trendlineData !== undefined && trendlineData.length > 0 ) {

        var paper = this._paper;
        var trendDetails = paper.g();
        var columnOffset = 0;
        var rowOffset = 0;
        var trendItem = null;
        var trendItemLabel = null;
        var trendItemLine = null;
        var trendItemLineContainer = null;
        var trendItemLineContainerBBox = null;
        var colorClass = null;

        trendlineData.forEach(function renderTrendlineKey(trendline) {

          colorClass = trendline.data("colorClass");

          trendItem = paper.g();

          trendItemLineContainer = paper.rect(columnOffset, rowOffset + Config.KEY_PADDING, 13, 13)
            .attr("opacity", 0);
          trendItemLineContainerBBox = trendItemLineContainer.getBBox();
          trendItemLine = paper.line(
            trendItemLineContainerBBox.x,
            trendItemLineContainerBBox.y + trendItemLineContainerBBox.height,
            trendItemLineContainerBBox.x + trendItemLineContainerBBox.width,
            trendItemLineContainerBBox.y
          ).addClass('fm-trend-line ' + colorClass + ' with-stroke');

          trendItemLabel = paper.text(
            columnOffset + trendItemLineContainerBBox.width + Config.KEY_TEXT_SPACING + 1,
            rowOffset + Config.KEY_PADDING + Config.TEXT_SIZE_SMALL,
            trendline.data("correlationStrength")
          ).attr({
            "font-family": Config.FONT_FAMILY,
            "font-size": Config.TEXT_SIZE_SMALL
          }).addClass( colorClass );

          trendItem.append(trendItemLine);
          trendItem.append(trendItemLabel);

          trendDetails.append(trendItem);

          rowOffset += trendItem.getBBox().height + Config.KEY_ROWSPACING;
          trendItemLineContainer.remove();

        });

        this.node.select(".fm-key").append( trendDetails );

        // keyObject.setHeight(keyBBox.height + Config.KEY_PADDING * 2);

        var keyItems = paper.select('.fm-key-items');
        var containerBBox = this.node.select(".fm-key-container").getBBox();

        keyItems.transform('t ' + (this.width / 4) + ' 0');

        if (trendDetails !== undefined) {
          trendDetails.transform('t ' + (containerBBox.x + this.width / 2) + ' ' + containerBBox.y );
        }

      }

      return this.node;

    };

	return ScatterKey;
});
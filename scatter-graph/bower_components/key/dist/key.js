define(['snap', 'config', 'color-utils'],
function(Snap,   Config,   Color) {
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
	var Key = function(
		paper,
		x,
		y,
		width,
		columns,
		columnWidth,
		centerItems,
		values,
		maxValues,
		maxValueLength,
		lastItemIsOther,
		colorClasses
	) {
		this._paper = paper;
		this.node = paper.g();
		this.x = x;
		this.y = y;
		this.width = width;
		this.columns = columns;
		this.columnWidth = columnWidth;
		this.centerItems = centerItems;
		this.values = values;
		this.maxValues = maxValues;
		this.maxValueLength = maxValueLength;
		this.lastItemIsOther = lastItemIsOther;
		this.colorClasses = colorClasses;
	}

	Key.prototype = {
		"constructor": Key,
		"hide": function() {},
		"remove": function() {
			this.node.parent.remove(this.node);
			this.node = null;
		},
		"render": function() {
			var numberOfValues = this.values.length;

			if (typeof this.maxEntries === 'undefined' ||
				this.maxEntries > numberOfValues) {
				this.maxEntries = numberOfValues;
			}

			if (typeof this.maxValueLength === 'undefined') {
				this.maxValueLength = Config.KEY_MAX_TEXT_LENGTH;
			}

			var colorClasses;
			if (! this.colorClasses) {
				colorClasses = Color.harmonious(numberOfValues);
			} else {
				colorClasses = this.colorClasses;
			}

			this.container = this.node.rect(this.x, this.y, this.width, 10)
				.addClass('fm-key-container')
				.attr({
					fill: Config.KEY_NEUTRAL_FILL,
					stroke: Config.KEY_NEUTRAL_STROKE
				});

			var items = this.node.g().addClass('fm-key-items');

			var columnOffset = 0;
			var rowOffset = 0;

			var title;
			this.values.forEach(function(value, valueIndex) {

				var keyColor;
				if (valueIndex === this.values.length - 1 && this.lastItemIsOther) {
					keyColor = 'fm-datum-color-overflow';
				} else {
					keyColor = colorClasses[valueIndex];
				}

				if (valueIndex !== 0 && valueIndex % this.columns === 0) {
					columnOffset = 0;
					rowOffset += title.getBBox().height + Config.KEY_ROWSPACING;
				}

				var truncated = false;
				if (value.length > this.maxValueLength) {
					var labelText = value.substring(0, this.maxValueLength - 1) + '…';
					truncated = true;
				} else {
					var labelText = value;
				}

				var colorRect = this.node.rect(this.x + columnOffset, this.y + Config.KEY_PADDING_TOP + rowOffset, 13, 13)
					.addClass(keyColor);
				title = this.node.text(
					this.x + Config.KEY_TEXT_SPACING + colorRect.getBBox().width + columnOffset,
					this.y + Config.KEY_PADDING_TOP + rowOffset + parseInt(colorRect.attr('height'), 10) - 1,
					labelText
				)
					.attr({
						'font-family': Config.FONT_FAMILY,
						'font-size': Config.TEXT_SIZE_SMALL
					});

				var itemGroup = this.node.g(colorRect, title)
					.data('fullText', value[valueIndex]);

        trimTitleToFitWidth( itemGroup, this.columnWidth - Config.KEY_TEXT_SPACING );

				items.append(itemGroup);
				columnOffset += this.columnWidth;

			}.bind(this));

			var itemsBBox = items.getBBox();
			var containerBBox = this.container.getBBox();

			this.container.attr({
				height: itemsBBox.height + Config.KEY_PADDING_TOP + Config.KEY_PADDING_BOTTOM
			});

			if (this.centerItems === true) {
				items.transform('t' + (containerBBox.width / 2 - itemsBBox.width / 2) + ' 0');
			} else {
        items.transform('t' + Config.KEY_PADDING_LEFT + ' 0');
      }

			return this.node.g(this.container, items)
				.addClass('fm-key')
				.attr({ // Assume the height will never be more than 100 * the width
					strokeDasharray: this.width + ',' + containerBBox.height + ',0,' + this.width * 100+ ',0'
				});

      /**
       * Trim series text and adds ellipsis 
       * @param  {Snap.Element} itemGroup   
       * @param  {Number} columnWidth
       */
      function trimTitleToFitWidth( itemGroup, columnWidth ){

        var itemGroupWidth = itemGroup.getBBox().width;

        if( itemGroupWidth <= columnWidth ){
          return;
        }

        var titleElement = itemGroup.select("text");
        var titleText = titleElement.attr("text");
        var minCharacters = 5; // 4 characters + 1 (…)
        var keepTrimming = true;

        titleText = titleText.substr( 0, titleText.length - 1 ) + "…";

        while( keepTrimming ){

          // Trim the text
          titleText = titleText.substr( 0, titleText.length - 2 ) + "…";
          titleElement.attr("text", titleText);

          // Measure
          itemGroupWidth = itemGroup.getBBox().width;

          // Check if we've hit our limit of characters trimmed or if small enough
          if( itemGroupWidth <= columnWidth || titleText.length === minCharacters ){
            keepTrimming = false;
          }

        }

      }

		},
		"show": function() {},
		"setHeight": function(newHeight) {
			var container = this.node.select('.fm-key-container');

			container.attr({
				height: newHeight + 'px'
			});
		}
	};

	return Key;
});

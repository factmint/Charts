define(['multi-tier-tooltip', 'key', 'config'],

function(MultiTierTooltip, Key, Config) {
	
	var isIE = function() {
		if (navigator.userAgent.indexOf('MSIE') !== -1 || navigator.appVersion.indexOf('Trident/') > 0) {
			return true;
		} else {
			return false;
		}
	}
	
	var createTooltip = function(paper, x, y, position, title, total, labels, values, group) {
		
		var details = labels.map(function(label, labelIndex) {
    		return {
    			title: label.title,
    			value: values[labelIndex].value
    		};	
    	});
    	
		var tooltipObject = new MultiTierTooltip(
			paper,
			'fm-column-bar-tooltip',
			'fm-datum-color-overflow'
		);
        var tooltip = tooltipObject.render(
        	title,
        	[{
        		title: "Total",
        		value: total
        	}],
        	details
        )
            .addClass('with-fill');

		group.append(tooltip);
        tooltipObject.setPosition(x, y, position);
        
        return tooltipObject;
	};
		
	var drawPullout = function(paper, x1, y1, width, height) {
		var pullout = paper.rect(x1, y1, width, height);
		pullout.addClass('fm-pullout');
		
		return pullout;
	};

	var calculateTotalLabelsLength = function(labels, paper) {
		var maxLength = 0;
		var reducedFontsizeMaxLength = 0;
		labels.forEach(function(label) {
			var labelWrapper = paper.group().addClass('fm-axis');
			
			var labelElement = paper.text(-1000, -1000, label);
			var reducedLabelElement = paper.text(-1000, -1000, label).addClass('fm-squeezed-label');
			
			labelWrapper.append(labelElement);
			labelWrapper.append(reducedLabelElement);
			
			var labelWidth = labelElement.getBBox().width;
			if (labelWidth > maxLength) {
				maxLength = labelWidth;
			}
			
			var reducedLabelWidth = reducedLabelElement.getBBox().width;
			if (reducedLabelWidth > reducedFontsizeMaxLength) {
				reducedFontsizeMaxLength = reducedLabelWidth;
			}
			
			labelElement.remove();
			reducedLabelElement.remove();
			labelWrapper.remove();
		});

		return {
			target: maxLength * labels.length,
			squeezed: reducedFontsizeMaxLength * labels.length
		};
	};
	
	var straddlesZero = function(range) {
		return (range.min * range.max) < 0;
	};
	
	var getNegativeProportion = function(min, max) {
		if (min * max > 0) {
			return 0;
		} else {
			return -min / max;
		}
	};
	
    /**
     * Draw a key to the canvas
     * @param {Array.<string>} values
     */
    var drawKey = function(paper, x, y, width, targetColumnWidth, values, colorClasses, pulloutTitle) {
    	var keyValues = values.map(function(entry) {
    		return entry.value;
    	});
    	
        var hasPullout = (pulloutTitle) ? true : false;

		var keyGroup = paper.group().addClass('fm-key');

		var numberOfEntries = values.length;
		if (hasPullout) numberOfEntries++;
		
		var numberOfColumns = Math.min(numberOfEntries, Math.ceil(width / targetColumnWidth));
		if (numberOfColumns < 2 && hasPullout) numberOfColumns = 2;

		var columnWidth = width / (numberOfColumns + Config.KEY_COLUMN_PADDING_RATIO);
		
		if (hasPullout) numberOfColumns--;

		var topBorder = paper.line(x, y, x + width, y);
		
        var keyObject = new Key(
            paper,
            x,
            y,
            width,
            numberOfColumns,
            columnWidth,
            ! hasPullout,
            keyValues,
            null,
            100,
            false,
            colorClasses
        );
        
        var key = keyObject.render();
        
		var keyEntryGroups = key.node.querySelectorAll(".fm-key-items > g");
		for (var entryNumber = 0; entryNumber < keyEntryGroups.length; entryNumber++) {
			if (values[entryNumber].colorOverride) {
				var keyEntryRect = keyEntryGroups[entryNumber].querySelector("rect");
				keyEntryRect.setAttribute("fill", values[entryNumber].colorOverride);
				keyEntryRect.className.baseVal = "";
			}
		}
        
        keyGroup.append(key);
        keyGroup.append(topBorder);

        if (hasPullout) {
        	var keyItems = key.select('.fm-key-items');
            var keyItemsBBox = keyItems.getBBox();
            
            var pulloutKey = paper.group();
            var pulloutX = x + width - columnWidth;
            var pulloutY = keyItemsBBox.cy;
            
            var dividor = paper.line(pulloutX, pulloutY - Config.KEY_DIVIDOR_HEIGHT / 2, pulloutX, pulloutY + Config.KEY_DIVIDOR_HEIGHT / 2)
            	.addClass('fm-key-dividor');
            pulloutKey.append(dividor);
            	
            pulloutX += Config.KEY_SQUARE_LENGTH;
            
            var colorRectangle = paper.rect(pulloutX, pulloutY - Config.KEY_SQUARE_LENGTH / 2, Config.KEY_SQUARE_LENGTH, Config.KEY_SQUARE_LENGTH)
            	.addClass('fm-pullout-key');
            pulloutKey.append(colorRectangle);
            	
            pulloutX += Config.KEY_SQUARE_LENGTH + Config.KEY_TEXT_SPACING;
            
            var pulloutTitleText = paper.text(pulloutX, pulloutY, pulloutTitle)
            	.addClass('fm-pullout-title');
            	
            if (isIE()) {
            	pulloutTitleText.attr({ 'dy': '0.5em' });
            }
            
        	while (pulloutTitleText.getBBox().x2 > x + width) {
        		if (pulloutTitle.length <= Config.KEY_MIN_PULLOUT_TITLE_LENGTH) break;	
            	pulloutTitle = pulloutTitle.substring(0, pulloutTitle.length - 1);
            	pulloutTitleText.node.textContent = pulloutTitle + '…';
            }
            
            pulloutKey.append(pulloutTitleText);
            
            keyGroup.append(pulloutKey);
            
        }
        
        return keyGroup;
    }
	
	return {
		calculateTotalLabelsLength: calculateTotalLabelsLength,
		straddlesZero: straddlesZero,
		getNegativeProportion: getNegativeProportion,
		createTooltip: createTooltip,
		drawPullout: drawPullout,
		drawKey: drawKey,
		isIE: isIE
	};
});
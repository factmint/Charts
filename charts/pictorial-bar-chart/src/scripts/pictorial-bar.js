define([
		'snap',
		'config',
		'scale-utils',
		'axis',
		'pictorial-key',
		'Tooltip'
	],
	function(
		Snap,
		Config,
		ScaleUtils,
		axis,
		PictorialKey,
		Tooltip
	) {
		
		function applyTooltip(paper, group, seriesGroup, seriesGroupIndex, data) {
			var seriesGroupBBox = seriesGroup.group.getBBox();

			var rectangleForPointerEvents = paper.rect(
				seriesGroupBBox.x,
				seriesGroupBBox.y,
				seriesGroupBBox.width,
				seriesGroupBBox.height
			).attr({ opacity: 0 });

			seriesGroup.group.append(rectangleForPointerEvents);
			
			var tooltipLocation = 'top';
			var tooltipXPosition = seriesGroupBBox.x + seriesGroupBBox.width / 2;
			var tooltipYPosition = seriesGroupBBox.y;

			var seriesDetail;
			for (var key in data.data) {
				if (key === group) {
					seriesDetail = data.data[key][seriesGroupIndex].value;
					break;
				}
			}
			
			seriesGroup.group.hover(function() {
				showTooltip(
					paper,
					tooltipXPosition,
					tooltipYPosition,
					tooltipLocation,
					seriesGroup.name,
					seriesDetail,
					'fm-datum-color-overflow'
				);
			}, function() {
				hideTooltip(paper);
			});
		}
		
		function drawGroupAxis(paper, startX, startY, groupIndexScale, data) {
			var axis = paper.axis(startX, startY, groupIndexScale, data.groups.map(function(name, value) {
				return {
					position: value,
					label: name
				}
			}), 0, 'vertical', null, true).addClass('fm-y-axis');
			
			//var axisOverflow = (axis.getBBox().x < 0) ? Math.abs(axis.getBBox().x) : 0;
			var axisOverflow = startX - axis.getBBox().x;
			
			if (axisOverflow) {
				axis.transform('t ' + axisOverflow + ' 0');
			}
			
			axis.xOffset = axisOverflow;
			
			return axis;
		}
		
		function drawMatrix(paper, xScale, yScale, data, fontSize) {
			var glyphs = paper.group();
			data.groups.forEach(function(group, groupIndex) {
				var barGroup = paper.group().addClass('fm-pictorial-bar');
				var seriesGroups = [];
				data.series.forEach(function(series) {
					seriesGroups.push({
						name: series.name,
						group: paper.group()
					});
				});

				for (var columnIndex = 0; columnIndex < Config.GLYPHS_ACROSS; columnIndex++) {
					var seriesIndex = data.rows[group][columnIndex];
					
					var glyph = paper.text(
						xScale.getPixel(columnIndex),
						yScale.getPixel(groupIndex),
						data.series[seriesIndex].glyph
					)
						.addClass('fm-pictorial-glyph')
						.addClass(data.series[seriesIndex].color)
						.attr({
							'font-size': fontSize
						});
					
					if (data.series.class !== null) {
						glyph.addClass(data.series[seriesIndex].class)
					}

					var currentGroup;
					seriesGroups.forEach(function(seriesGroup) {
						if (seriesGroup.name === data.series[seriesIndex].name) {
							seriesGroup.group.append(glyph);
							currentGroup = seriesGroup.group;
							return false;
						} else {
							return true;
						}
					});

					barGroup.append(currentGroup);
				}

				seriesGroups.forEach(function(seriesGroup, seriesGroupIndex) {
					applyTooltip(paper, group, seriesGroup, seriesGroupIndex, data);
				});

				glyphs.append(barGroup);
			});
			
			return glyphs;
		}
		
		function resizeSvg(paper, newWidth, newHeight) {
			paper.node.setAttribute('viewBox', '0 0 ' + newWidth + ' ' + newHeight);
			paper.node.style.height = newHeight + 'px';
		}

		function showTooltip(paper, xPosition, yPosition, location, label, detail) {
			var tooltipObject = new Tooltip(paper, 'fm-pictorial-bar-tooltip', 'fm-datum-color-overflow');
			var tooltip = tooltipObject.render(label, detail);

			tooltipObject.setPosition(xPosition, yPosition, 'top');
			tooltipObject.show();
		}

		function hideTooltip(paper) {
			paper.select('.fm-tooltip').remove();
		}

		return Snap.plugin(function(Snap, Element, Paper) {

			/**
			 * pictorial bar graph plugin
			 * @param {Number} startX
			 * @param {Number} startY
			 * @param {Number} width
			 * @param {Number} height
			 * @param {Object} data
			 * @param {Object} options
			 */
			Paper.prototype.chart = function(startX, startY, width, height, data, options) {

				var paper = this;
				var chart = paper.group();
				
				// Square the canvas
				var availableChartWidth = width - Config.LEFT_PADDING - Config.RIGHT_PADDING;
				var availableChartHeight = height - Config.TOP_PADDING - Config.BOTTOM_PADDING;
				var approximateAxisWidthInGlyphs = 1;
				var glyphsAcross = Config.GLYPHS_ACROSS + approximateAxisWidthInGlyphs;
				var unitSquareLength = Math.min(
					availableChartWidth / glyphsAcross,
					availableChartHeight / data.groups.length
				);
				
				var gridXOrigin = startX + (width + Config.LEFT_PADDING - Config.RIGHT_PADDING - (unitSquareLength * glyphsAcross)) / 2;
				var gridYOrigin = startY + (height + Config.TOP_PADDING - Config.BOTTOM_PADDING - (unitSquareLength * data.groups.length)) / 2;
				
				var gridYRange = unitSquareLength * data.groups.length;
				var groupIndexScale = new ScaleUtils.Scale(gridYOrigin, gridYRange, -Config.NUMBER_OF_Y_PADDING_POINTS, data.groups.length - 1 + Config.NUMBER_OF_Y_PADDING_POINTS);
				
				var groupAxis = drawGroupAxis(paper, gridXOrigin, gridYOrigin, groupIndexScale, data);
				chart.append(groupAxis);
				
				var gridWidth = (unitSquareLength * glyphsAcross) - groupAxis.xOffset;
				var glyphRowScale = new ScaleUtils.Scale(gridXOrigin + groupAxis.xOffset, gridWidth, -Config.NUMBER_OF_X_PADDING_POINTS, Config.GLYPHS_ACROSS - Config.NUMBER_OF_X_PADDING_POINTS);
				
				var fontSize = gridWidth * Config.GLYPH_BLACK_PROPORTION / Config.GLYPHS_ACROSS;
				
				var glyphs = drawMatrix(paper, glyphRowScale, groupIndexScale, data, fontSize);
				chart.append(glyphs);
				
				var key = paper.pictorialKey(gridXOrigin, gridYOrigin + gridYRange + Config.BOTTOM_PADDING, unitSquareLength * glyphsAcross, data.series);
				chart.append(key);
				
				resizeSvg(paper, width, key.getBBox().y2);
				
				return chart;
			};
		});
	});

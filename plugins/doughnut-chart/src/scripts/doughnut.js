define([
	'snap',
	'config',
	'number-utils',
	'circle-utils',
	'color-utils',
	'dashed-bracket',
	'pie-segment',
	'doughnut-segment',
	'two-section-tooltip',
	'multitext',
	'central-data'
],
function(
	Snap,
	Config,
	NumberUtils,
	Circle,
	Color,
	dashedBracket,
	pieSegment,
	doughnutSegment,
	TwoSectionTooltip,
	multitext,
	centralData
) {

	return Snap.plugin(function(Snap, Element, Paper) {

		// These are named identifiers for the states the doughnut chart can be in
		var STATE = {
			'neutral': 0,
			'activeData': 1,
			'showingOverflow': 2,
			'showingOverflowAndActiveData': 3
		};

		/**
		 * Doughnut chart plugin
         * @param {Number} left
         * @param {Number} top
         * @param {Number} width
         * @param {Number} height
         * @param {Object} data
         * @param {Object} options
		 */
		Paper.prototype.chart = function(left, top, width, height, data, options) {

			var paper = this;

			options = getOptions(options, data);

			var totalVisualizationSize = getVisualizationSize(width, height);
			var radius;
			var yCenterOffset;

			if (data[data.length - 1].hasOwnProperty('overflow')) {
				radius = 0.5 * totalVisualizationSize;
			} else {
				radius = 0.5 * totalVisualizationSize;
			}

			var centerX = left + width / 2;
			var centerY = top + height / 2;

			var colorClasses = Color.harmonious(data.length);

			var drawingCenter = {
				x: centerX,
				y: centerY
			};

			var innerRadius = radius / Config.DOUGHNUT_THICKNESS;

			var tooltipObjects = [];

			/**
			 * Works out the visualization size based on width, height and Config vars
			 * @param	{Number} width
			 * @param	{Number} height
			 * @return {Number}
			 */
			function getVisualizationSize(width, height) {
				var workingHeight = height;
				var workingWidth = width;
				if (options.basicMode || ! paper.data("hasOverflow")) {
					workingHeight = height - Config.TOP_PADDING_FOR_OVERFLOW - Config.TOP_PADDING_FOR_LABELS * 2;
				}

				if (! options.basicMode) {
					workingWidth = width - Config.SIDE_PADDING_FOR_LABELS * 2;
				}

				var size = Math.min(
					workingWidth,
					workingHeight
				);

				return size;
			}

			/**
			 * Sets up default options if they are not set
			 * @param	{Object} options Current options
			 * @param	{Array} data
			 * @return {Object}
			 */
			function getOptions(options, data) {

				options.valuePrefix = (options.valuePrefix) ? options.valuePrefix : '';
				options.valueSuffix = (options.valueSuffix) ? options.valueSuffix : '';

				if (width < Config.FORCE_BASIC_MODE_WIDTH) {
					options.basicMode = true;
				}

				if (typeof options.maxKeyEntries === 'undefined') {
					options.maxKeyEntries = Config.DEFAULT_MAX_KEY_ENTRIES;
				} else {
					options.maxKeyEntries = parseInt(options.maxKeyEntries, 10);
				}

				if (options.maxKeyEntries > data.length) {
					options.maxKeyEntries = data.length;
				}

				return options;

			}

			function hideOverflow() {
				var outerSegments = paper.selectAll('.fm-doughnut-segment');
				if (outerSegments.length > 0) {
					outerSegments.forEach(function(segment) {
						segment.animate({ opacity: 0 }, 80, function() {
							segment.attr({ display: 'none' });
						});
					});
					var bracket = paper.select('.fm-bracket');
					bracket.animate({ opacity: 0 }, 80, function() {
						bracket.attr({ display: 'none' });
					});
				}
			}

			function showOverflow() {
				var outerSegments = paper.selectAll('.fm-doughnut-segment');
				outerSegments.attr({ display: 'block' });
				outerSegments.animate({ opacity: 1 }, 80);
				var bracket = paper.select('.fm-bracket');
				bracket.attr({ display: 'block' });
				bracket.animate({ opacity: 1 }, 80);
			}

			function removeCentralData() {
				var centralData = paper.select('.fm-central-data');
				if (centralData) {
					centralData.remove();
				}
			}

			function drawSegmentDetailsInCenter() {
				removeCentralData();

				var centralData = paper.centralData(
					drawingCenter.x,
					drawingCenter.y,
					innerRadius * 2 * Config.CENTRAL_DATA_PADDING,
					this.data('mainText'),
					this.data('secondaryText'),
					dataTotal,
					this.data('colorClass'),
					options.valuePrefix,
					options.valueSuffix
				);

				if (this.data('colorOverride')) {
					var dataElements = centralData.node.children;
					var title = dataElements[0];
					title.style.fill = this.data('colorOverride');
				}
			}

			function hoverOverSegment() {
				if (paper.data('state') === STATE.activeData ||
					(paper.data('state') === STATE.showingOverflowAndActiveData && 
					! this.data('overflowData'))) {
					if (! options.basicMode) {
						showTooltip.call(this);
					}
				} else if ((paper.data('state') === STATE.showingOverflow ||
					paper.data('state') === STATE.showingOverflowAndActiveData) &&
					this.data('overflowData')) {
					return;
				} else {
					drawSegmentDetailsInCenter.call(this);
				}
			}

			function hoverOutOfSegment() {
				if (paper.data('state') === STATE.activeData ||
					paper.data('state') === STATE.showingOverflowAndActiveData) {
					hideTooltips();
				} else {
					removeCentralData();
				}
			}

			function activateSegment(segment) {
				drawSegmentDetailsInCenter.call(segment);
				hideTooltips();
				if (! segment.hasClass('fm-outer-segment')) {
					hideOverflow();
					var overlaySegment = paper.pieSegment(
						drawingCenter.x,
						drawingCenter.y,
						radius,
						segment.data('startAngle'),
						segment.data('totalAngle')
					)
						.addClass(segment.data('colorClass') + ' fm-overlay-segment');
					
					if (segment.data('colorOverride')) {
						overlaySegment.attr({'style': "fill: " + segment.data('colorOverride')});
					}
				}
			}

			function hideOverlay() {
				var overlay = paper.select('.fm-overlay-segment');
				if (overlay) {
					overlay.remove();
				}
			}

			function resetDoughnutChart() {
				removeCentralData();
				hideOverlay();
				hideOverflow();
				paper.data('state', STATE.neutral);
			}

			function controlCentralData(segment, centralData) {
				if (!paper.data('state')) {
					paper.data('state', STATE.neutral);
				}
				if (segment.data('overflowData')) {
					if (paper.data('state') === STATE.showingOverflow || 
						paper.data('state') === STATE.showingOverflowAndActiveData) {
						resetDoughnutChart();
						//segment.hover(hoverOverSegment, hoverOutOfSegment);
						paper.data('state', STATE.neutral);
					} else {
						showOverflow();
						//segment.unhover();
						if (paper.data('state') !== STATE.activeData) {
							removeCentralData();
							paper.data('state', STATE.showingOverflow);
						} else {
							paper.data('state', STATE.showingOverflowAndActiveData);
						}
					}
				} else {
					if (paper.data('state') === STATE.neutral ||
						paper.data('state') === STATE.showingOverflow) {
						removeCentralData();
						activateSegment(segment);
						if (segment.hasClass('fm-outer-segment')) {
							paper.data('state', STATE.showingOverflowAndActiveData);
						} else {
							paper.data('state', STATE.activeData);
						}
					} else if (paper.data('state') === STATE.showingOverflowAndActiveData) {
						removeCentralData();
						hideOverlay();
						activateSegment(segment);
						if (!segment.hasClass('fm-outer-segment')) {
							paper.data('state', STATE.activeData);
						}
					} else if (paper.data('state') === STATE.activeData) {
						resetDoughnutChart();
						activateSegment(segment);
						paper.data('state', STATE.activeData);
					}
				}
			}

			function showTooltip() {
				if (paper.data('state') !== 2 || this.hasClass('fm-doughnut-segment')) {
					var middleAngle = this.data('middleAngle') % (Math.PI * 2);
					var midpoint = {
						x: this.data('centerX') + (parseInt(this.data('radius'), 10) + Config.LABEL_MARGIN) * Math.sin(middleAngle),
						y: this.data('centerY') - (parseInt(this.data('radius'), 10) + Config.LABEL_MARGIN) * Math.cos(middleAngle)
					};

					var colorClass = this.data('colorClass');

					var mainText = this.data('mainText');
					var secondaryText = this.data('secondaryText');

					var tooltipPosition;

					if (this.data('hasOverflow')) {
						tooltipPosition = 'top';
					} else if (middleAngle < Circle.eighth || middleAngle >= 7 * Circle.eighth) {
						if (middleAngle <= Math.PI * 1/4) {
							tooltipPosition = 'topRight';
						} else {
							tooltipPosition = 'topLeft';
						}
					} else if (middleAngle >= Circle.eighth && middleAngle < 3 * Circle.eighth) {
						tooltipPosition = 'right';
					} else if (middleAngle >= 3 * Circle.eighth && middleAngle < 5 * Circle.eighth) {
						if (middleAngle <= Circle.half) {
							tooltipPosition = 'bottomRight';
						} else {
							tooltipPosition = 'bottomLeft';
						}
					} else if (middleAngle >= 5 * Circle.eighth && middleAngle < 7 * Circle.eighth) {
						tooltipPosition = 'left';
					}

					var tooltipObject = new TwoSectionTooltip(paper, 'fm-doughnut-tooltip', colorClass);
					tooltipObjects.push(tooltipObject);
					var tooltip = tooltipObject.render(
						mainText,
						secondaryText
					);

					tooltip.addClass('fm-doughnut-tooltip');
					
					if (this.data('colorOverride')) {
						var color = this.data('colorOverride');
						var colorComponents = Snap.color(color);
						var tintColor = Snap.rgb((colorComponents.r * 4 + 255) / 5, (colorComponents.g * 4 + 255) / 5, (colorComponents.b * 4 + 255) / 5);
						
						var tooltipElements = tooltip.node.querySelectorAll('rect');
						
						tooltipElements[0].style.fill = color;
						tooltipElements[1].style.fill = tintColor;
						tooltip.node.querySelector('polygon').style.fill = tintColor;
					}

					tooltipObject.setPosition(midpoint.x, midpoint.y, tooltipPosition);
					tooltipObject.show();
				}
			}

			function hideTooltips() {
				var tooltips = paper.selectAll('.fm-tooltip');
				tooltips.remove();
			}

			function drawOverflowSegments(segment, startAngle, totalAngle, overflowData) {
				var overflowDataTotal = NumberUtils.getDataTotal(overflowData);

				segment.addClass(Color.overflowClass)
					.data('colorClass', Color.overflowClass)
					.data('hasOverflow', true)
					.data('overflowData', overflowData)
					.data('mainText', Config.OVERFLOW_MESSAGE)

				var middleOfOverflow = (startAngle + totalAngle) / 2;
				var overflowTotalAngle = middleOfOverflow - Config.OVERFLOW_SPREAD / 2;
				var overflowFinalAngle = middleOfOverflow + Config.OVERFLOW_SPREAD / 2;

				var strokeWidth = parseInt(segment.attr('strokeWidth'), 10);

				var bracket = paper.dashedBracket(
					drawingCenter.x,
					drawingCenter.y,
					radius + radius * Config.BRACKET_INNER_RADIUS_ADJUST,
					radius + radius * Config.BRACKET_MIDDLE_RADIUS_ADJUST,
					radius + radius * Config.BRACKET_OUTER_RADIUS_ADJUST,
					(overflowTotalAngle + strokeWidth / radius),
					(overflowFinalAngle - strokeWidth / radius)
				)
					.attr({
						display: 'none',
						opacity: 0,
						fill: 'none'
					});

				var outerSegments = paper.g();

				for (var dataIndex = 0; dataIndex < overflowData.length; dataIndex++) {
					var overflowStartAngle = overflowTotalAngle;
					overflowTotalAngle += Circle.getAngle(overflowData[dataIndex].value, overflowDataTotal, Config.OVERFLOW_SPREAD);
					var doughnutSegment = paper.doughnutSegment(
						drawingCenter.x,
						drawingCenter.y,
						radius * (Config.OVERFLOW_THICKNESS) + radius,
						radius + radius * (Config.OVERFLOW_THICKNESS * 1.7),
						overflowStartAngle,
						overflowTotalAngle
					)
						.addClass('fm-segment fm-doughnut-segment fm-outer-segment ' + colorClasses[dataIndex])
						.data('colorClass', colorClasses[dataIndex])
						.data('startAngle', overflowStartAngle)
						.data('totalAngle', overflowTotalAngle)
						.data('middleAngle', ((overflowStartAngle + overflowTotalAngle) / 2))
						.data('centerX', centerX)
						.data('centerY', centerY)
						.data('radius', radius + radius * (Config.OVERFLOW_THICKNESS * 1.7) + 3)
						.data('mainText', overflowData[dataIndex].title)
						.data('secondaryText', options.valuePrefix + NumberUtils.renderValue(overflowData[dataIndex].value) + options.valueSuffix)
						.data('showingInKey', false)
						.data('details', overflowData[dataIndex].details)
						.hover(hoverOverSegment, hoverOutOfSegment)
						.click(function() {
							controlCentralData(this);
						});
						
					if (overflowData[dataIndex].hasOwnProperty('colorOverride')) {
						doughnutSegment
							.attr({'style': "fill: " + overflowData[dataIndex].colorOverride})
							.data('colorOverride', overflowData[dataIndex].colorOverride);
					}

					outerSegments.append(doughnutSegment);
				}

				hideOverflow();
			}

			// Begin drawing doughnut chart

			var whitespace = this.rect(0, 0, '100%', '100%')
				.attr({
					opacity: 0
				});

			whitespace.click(resetDoughnutChart);

			var dataTotal = NumberUtils.getDataTotal(data);

			var totalAngle = 0;
			var startAngle = 0;

			for (var dataIndex = 0; dataIndex < data.length; dataIndex++) {
				startAngle = totalAngle;
				totalAngle += Circle.getAngle(data[dataIndex].value, dataTotal);

				var segment = paper.doughnutSegment(
					drawingCenter.x,
					drawingCenter.y,
					innerRadius,
					radius,
					startAngle,
					totalAngle
				)
					.addClass('fm-segment fm-pie-segment')
					.data('middleAngle', ((startAngle + totalAngle) / 2))
					.data('centerX', centerX)
					.data('centerY', centerY)
					.data('radius', radius)
					.data('showingInKey', false)
					.data('startAngle', startAngle)
					.data('totalAngle', totalAngle)
					.hover(hoverOverSegment, hoverOutOfSegment)
					.click(function() {
						controlCentralData(this);
						if (this.data('overflowData')) {
		                    hideTooltips();
	                    }
					});

				if (data[dataIndex].hasOwnProperty('colorOverride')) {
					segment
						.attr({'style': "fill: " + data[dataIndex].colorOverride})
						.data('colorOverride', data[dataIndex].colorOverride);
				}

				if (data[dataIndex].hasOwnProperty('overflow')) {
					drawOverflowSegments(segment, startAngle, totalAngle, data[dataIndex].overflow);
				} else {
					segment.addClass(colorClasses[dataIndex])
						.data('colorClass', colorClasses[dataIndex])
						.data('mainText', data[dataIndex].title)
						.data('secondaryText', options.valuePrefix + NumberUtils.renderValue(data[dataIndex].value) + options.valueSuffix)
						.data('details', data[dataIndex].details);
				}
			}
		};
	});
});

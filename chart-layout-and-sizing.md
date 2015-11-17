---
title: Chart Layout and Sizing
layout: doc-page
---

By default, Factmint charts will draw themselves in an SVG. The actual chart will attempt to make the best use of the space available; for a column chart that would mean filling the space but for other chart types - like Pie Charts - there is an optimum aspect ratio which may lead to unused white-space for some dimensions.

<h2 id="size">Configuring chart size</h2>

All charts accept configuration values: <strong>data-fm-width</strong> and <strong>data-fm-height</strong>. Both of these values can be set to any <a title="W3C cheatsheet" href="http://www.w3.org/Style/Examples/007/units.en.html">valid CSS length</a>, including px, %, em and rem. By default, the width is 100% and the height is 450px.

<img class="alignnone size-medium wp-image-550" src="http://factmint.com/wp-content/uploads/2015/01/Factmint-Chart-Layout.svg" alt="Factmint Chart Layout" style="width: 60%; max-width: 750px;" />

The chart would then appear within this space:

<img class="alignnone size-medium wp-image-552" src="http://factmint.com/wp-content/uploads/2015/01/Factmint-Chart-Layout-with-vis.svg" alt="Factmint Chart Layout with vis"  style="width: 60%; max-width: 750px;" />

<h2 id="spillover">Chart "spillover"</h2>
Most charts can be configured to create an SVG element which is larger than the chart's size; a negative margin is applied to keep the position of the chart consistent despite the larger SVG element.

<img class="alignnone size-medium wp-image-551" src="http://factmint.com/wp-content/uploads/2015/01/Factmint-Chart-spillover.svg" alt="Factmint Chart spillover" style="width: 60%; max-width: 750px;" />

This creates extra room around the graphic, allowing for transient elements, such as tooltips.

<img class="alignnone size-medium wp-image-553" src="http://factmint.com/wp-content/uploads/2015/01/Factmint-Chart-spillover-with-vis.svg" alt="Factmint Chart spillover with vis" style="width: 60%; max-width: 750px;" />

There are some disadvantages to enabling the spillover - most notably that the visualization will sit <em>on top</em> of any previous content, potentially covering links and other clickable content. The spillover can be enabled by setting the configuration option: <strong>data-fm-enable-spillover="true"</strong>. The reason for the inclusion of the spillover option is that by default all content, including transient elements, will be drawn within the area defined by <strong>data-fm-width</strong> and <strong>data-fm-height</strong>: this can sometimes cause the chart to appear to be surrounded by too much negative space when the transient elements are not visible.

<img class="alignnone size-medium wp-image-554" src="http://factmint.com/wp-content/uploads/2015/01/Factmint-Chart-spillover-disabled-with-vis.svg" alt="Factmint Chart spillover disabled with vis" style="width: 60%; max-width: 750px;" />
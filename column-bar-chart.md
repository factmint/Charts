---
title: Column/Bar Chart
layout: doc-page
---

<a id="column-bar-description"></a>

A column chart uses vertical bars to represent groups or data, a bar chart uses horizontal bars. The Column/Bar Chart will favour drawing a column chart, which is easier to read, but will switch to a bar chart if there is too much data to comparably fit along the x-axis.

### Interactions

On hover a tooltip shows the exact value of a column or bar.

### Usage

The first data column is the name of the entity. All subsequent data columns represent a data series. If you have multiple series then there will be one coloured column/bar for each series, with the series name shown in the key.

## Example

<pre class="line-numbers" data-src="code-examples/column-bar-documentation.html"></pre>
<a href="http://codepen.io/Factmint/pen/PwJGEE" class="codepen-button">
	{% include code-pen-icon.svg %}
</a>

<div id="demo" class="documentation-example-container">
<table class="fm-column-bar" data-fm-pullout-items="1,4" data-fm-pullout-title="Marketing campaign" data-fm-disable-spillover="true" data-fm-value-suffix="$">
	<thead>
		<tr>
			<th>Product</th><th>Supplier price</th><th>Sales price</th>
		</tr>
	</thead>
	<tbody>
		<tr>
			<td>Ice cream</td><td>0.4</td><td>2</td>
		</tr>
		<tr>
			<td>Umbrellas</td><td>3.5</td><td>10</td>
		</tr>
		<tr>
			<td>Horse shoes</td><td>0.56</td><td>4.5</td>
		</tr>
		<tr>
			<td>Pencils</td><td>0.2</td><td>0.8</td>
		</tr>
		<tr>
			<td>Mugs</td><td>1.3</td><td>5</td>
		</tr>
		<tr>
			<td>Wizard hats</td><td>6</td><td>20</td>
		</tr>
		<tr>
			<td>Light bulbs</td><td>1</td><td>3</td>
		</tr>
	</tbody>
</table>
<link rel="stylesheet" href="http://factmint.io/column-bar.css">
<script async src="http://factmint.io/column-bar.js"></script>
</div>

## Options

The following data attributes are available for a Column/Bar Chart:

<dl>
 <dt>data-fm-axis-label</dt><dd>Adds a label to the axis used for values (which depends if column or bar chart is being shown)</dd>
 <dt>data-fm-value-prefix</dt><dd>Adds a prefix to the values. For example, you may wish to add  the ‘£’ symbol before each number</dd>
 <dt>data-fm-value-suffix</dt><dd>Adds a suffix to each of your values. For example, you may wish to add  the ‘$’ symbol after each number</dd>
 <dt>data-fm-pullout-items</dt><dd>Comma separated list of bars to draw attention to, can be either the data series number or the data series name (e.g. “Ice cream”)</dd>
 <dt>data-fm-pullout-title</dt><dd>Adds a title to the key explaining the pull-out items</dd>
 <dt>data-fm-height</dt><dd>Enforces an explicit height. Expects a value with CCS syntax, e.g. "250px" (see <a href="chart-layout-and-sizing.html#size">sizing guide</a>)</dd>
 <dt>data-fm-width</dt><dd>Enforces an explicit width. Expects a value with CCS syntax, e.g. "800px" (see <a href="chart-layout-and-sizing.html#size">sizing guide</a>)</dd>
 <dt>data-fm-enable-spillover</dt><dd>If "true", the column/bar chart will draw some transient elements outside of its configured height and width (see <a href="chart-layout-and-sizing.html#spillover">layout guide</a>)</dd>
</dl>
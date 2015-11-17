---
title: Stacked Column/Bar Chart
layout: doc-page
---

<a id="stacked-column-bar-description"></a>

A stacked column/bar chart uses stacks of vertical columns or rows of sequential bars to represent groups of data. This is useful when you have a number of totals with breakdowns. The Stacked Column/Bar Chart will favour drawing a stacked column chart, which is easier to read, but will switch to a stacked bar chart if there is too much data to comfortably fit along the x-axis.

### Interactions

On hover a tooltip shows the total and breakdown of a stacked column or bar.

### Usage

The first data column is the name of the entity or group. All subsequent data columns represent a data series. The chart will draw a coloured column/bar for each series, with the series name shown in the key.

## Example

<pre class="line-numbers" data-src="/code-examples/stacked-column-bar-documentation.html"></pre>
<a href="http://codepen.io/Factmint/pen/gabaQx" class="codepen-button">
	{% include code-pen-icon.svg %}
</a>

<div id="demo" class="documentation-example-container">
<table class="fm-stacked-column-bar" data-fm-axis-label="Sales" data-fm-value-prefix="£">
	<thead>
		<tr>
			<th>Date</th>
			<th>Ice cream</th>
			<th>Umbrellas</th>
			<th>Horse shoes</th>
		</tr>
	</thead>
	<tbody>
		<tr>
			<td>2004</td>
			<td>1500</td>
			<td>6500</td>
			<td>4200</td>
		</tr>
		<tr>
			<td>2005</td>
			<td>1045</td>
			<td>6000</td>
			<td>4567</td>
		</tr>
		<tr>
			<td>2006</td>
			<td>6400</td>
			<td>1500</td>
			<td>4908</td>
		</tr>
		<tr>
			<td>2007</td>
			<td>1400</td>
			<td>3500</td>
			<td>5600</td>
		</tr>
		<tr>
			<td>2008</td>
			<td>1000</td>
			<td>7500</td>
			<td>6007</td>
		</tr>
		<tr>
			<td>2009</td>
			<td>1090</td>
			<td>4500</td>
			<td>5670</td>
		</tr>
		<tr>
			<td>2010</td>
			<td>1010</td>
			<td>5600</td>
			<td>6432</td>
		</tr>
		<tr>
			<td>2011</td>
			<td>5500</td>
			<td>1400</td>
			<td>4032</td>
		</tr>
		<tr>
			<td>2012</td>
			<td>1100</td>
			<td>8000</td>
			<td>3002</td>
		</tr>
		<tr>
			<td>2013</td>
			<td>3400</td>
			<td>2500</td>
			<td>1023</td>
		</tr>
		<tr>
			<td>2014</td>
			<td>6000</td>
			<td>1700</td>
			<td>900</td>
		</tr>
		<tr>
			<td>2015</td>
			<td>6500</td>
			<td>1000</td>
			<td>3583</td>
		</tr>
	</tbody>
</table>
<link rel="stylesheet" href="http://factmint.io/stacked-column-bar.css">
<script async src="http://factmint.io/stacked-column-bar.js"></script>
</div>

<h2 id="stacked-column-bar-options" style="padding-top:100px;">Options</h2>

The following data attributes are available for a Stacked Column/Bar Chart:

<dl>
 <dt>data-fm-axis-label</dt><dd>Adds a label to the axis used for values (which depends if stacked column or bar chart is being shown)</dd>
 <dt>data-fm-value-prefix</dt><dd>Adds a prefix to the values. For example, you may wish to add  the ‘£’ symbol before each number</dd>
 <dt>data-fm-value-suffix</dt><dd>Adds a suffix to each of your values. For example, you may wish to add  the ‘%’ symbol after each number</dd>
 <dt>data-fm-height</dt><dd>Enforces an explicit height. Expects a value with CCS syntax, e.g. "250px" (see <a href="/documentation/chart-layout-and-sizing/#size">sizing guide</a>)</dd>
 <dt>data-fm-width</dt><dd>Enforces an explicit width. Expects a value with CCS syntax, e.g. "800px" (see <a href="/documentation/chart-layout-and-sizing/#size">sizing guide</a>)</dd>
 <dt>data-fm-enable-spillover</dt><dd>If "true", the column/bar chart will draw some transient elements outside of its configured height and width (see <a href="/documentation/chart-layout-and-sizing/#spillover">layout guide</a>)</dd>
</dl>
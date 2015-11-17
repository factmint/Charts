---
title: Bubble Chart
layout: doc-page
---

<a id="bubble-description"></a>

The Bubble Chart is similar to a Scatter Chart but with an extra dimension for the bubble’s radius.

### Interactions

On hover a tooltip shows the details of a particular bubble and the bubble’s radius will be displayed on a scale in the key. On click the tooltip and the radius on the scale are fixed, allowing the user to hover over other bubbles for comparison.

### Usage

The first column is the label for each bubble. The second and third are the X and Y values, respectively. The fourth column is the bubble’s radius. The fifth column, which is optional, can be used to define groups. If a groups column is used the points will be coloured based upon their group and a key will be present below the scatter to show which colours correspond to which groups.
 
<span class="tip">Bubble charts work well for many sets of data with three measures, one use is plotting latitude and longitude as Y and X, then some property of a location/country as the radius.</span>

## Example

<pre class="line-numbers" data-src="code-examples/bubble-documentation.html"></pre>
<a href="http://codepen.io/Factmint/pen/VYMKzm" class="codepen-button">
	{% include code-pen-icon.svg %}
</a>

<div id="demo" class="documentation-example-container">
<table class="fm-bubble" data-fm-x-suffix="$" data-fm-y-suffix="$" data-fm-size-suffix=" days">
	<thead>
		<tr>
			<th>Product</th>
			<th>Supplier price</th>
			<th>Sales price</th>
			<th>Average storage time</th>
			<th>Warehouse</th>
		</tr>
	</thead>
	<tbody>
		<tr>
			<td>Ice cream</td>
			<td>0.4</td>
			<td>2</td>
			<td>0.5</td>
			<td>Warehouse A</td>
		</tr>
		<tr>
			<td>Umbrellas</td>
			<td>3.5</td>
			<td>10</td>
			<td>2</td>
			<td>Warehouse B</td>
		</tr>
		<tr>
			<td>Horse shoes</td>
			<td>0.56</td>
			<td>4.5</td>
			<td>1.4</td>
			<td>Warehouse B</td>
		</tr>
		<tr>
			<td>Pencils</td>
			<td>0.2</td>
			<td>0.8</td>
			<td>0.1</td>
			<td>Warehouse A</td>
		</tr>
		<tr>
			<td>Mugs</td>
			<td>1.3</td>
			<td>5</td>
			<td>0.6</td>
			<td>Warehouse B</td>
		</tr>
		<tr>
			<td>Wizard hats</td>
			<td>6</td>
			<td>20</td>
			<td>0.9</td>
			<td>Warehouse A</td>
		</tr>
		<tr>
			<td>Light bulbs</td>
			<td>1</td>
			<td>3</td>
			<td>0.2</td>
			<td>Warehouse C</td>
		</tr>
		<tr>
			<td>Fire extinguishers</td>
			<td>4</td>
			<td>13</td>
			<td>1.8</td>
			<td>Warehouse B</td>
		</tr>
		<tr>
			<td>Wheelbarrows</td>
			<td>5.5</td>
			<td>7.6</td>
			<td>1</td>
			<td>Warehouse C</td>
		</tr>
		<tr>
			<td>Deck chairs</td>
			<td>2.8</td>
			<td>6.5</td>
			<td>0.7</td>
			<td>Warehouse B</td>
		</tr>
	</tbody>
</table>
<link rel="stylesheet" href="http://factmint.io/bubble.css">
<script async src="http://factmint.io/bubble.js"></script>
</div>

## Options

The following data attributes are available for a Bubble Chart.

<dl>
 <dt>data-fm-x-prefix</dt><dd>Adds a prefix to x values (displayed on hover). For example, you may wish to add  the ‘£’ symbol before each number</dd>
 <dt>data-fm-x-suffix</dt><dd>Adds a suffix to x values (displayed on hover). For example, you may wish to add  the ‘$’ symbol after each number</dd>
 <dt>data-fm-y-prefix</dt><dd>Adds a prefix to y values (displayed on hover). For example, you may wish to add  the ‘£’ symbol before each number</dd>
 <dt>data-fm-y-suffix</dt><dd>Adds a suffix to y values (displayed on hover). For example, you may wish to add  the ‘$’ symbol after each number</dd>
 <dt>data-fm-size-prefix</dt><dd>Adds a prefix to bubble size values (displayed on hover). For example, you may wish to add  the ‘£’ symbol before each number</dd>
 <dt>data-fm-size-suffix</dt><dd>Adds a suffix to bubble size values (displayed on hover). For example, you may wish to add  the ‘$’ symbol after each number</dd>
 <dt>data-fm-height</dt><dd>Enforces an explicit height. Expects a value with CCS syntax, e.g. "250px" (see <a href="chart-layout-and-sizing.html#size">sizing guide</a>)</dd>
 <dt>data-fm-width</dt><dd>Enforces an explicit width. Expects a value with CCS syntax, e.g. "800px" (see <a href="chart-layout-and-sizing.html#size">sizing guide</a>)</dd>
 <dt>data-fm-enable-spillover</dt><dd>If "true", the bubble chart will draw some transient elements outside of its configured height and width (see <a href="chart-layout-and-sizing.html#spillover">layout guide</a>)</dd>
</dl>
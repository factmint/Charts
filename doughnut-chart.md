---
title: Doughnut Chart
layout: doc-page
---

<a id="doughnut-description"></a>

Similar to a Pie Chart except for the hole, which is used to show data on hover. The Doughnut Chart does not use a key, so it makes better use of smaller spaces. The data should usually have a clear story behind it, so that it makes sense without a key.

### Interactions

Hovering on a segment shows the core data in the centre of the doughnut. Clicking on a segment selects it for comparison - the data in the centre is frozen and the segment angle highlighted; the user can then hover on another segment for comparison.

<span class="tip">If your data is quite crowded, the Pie Chart will group the smallest segments into an ‘other’ segment which, on click, will bloom to reveal all of the data.</span>

### Usage

The first column represents the names of the Segments; the second column represents the size of each segment.

## Example

<pre class="line-numbers" data-src="code-examples/doughnut-documentation.html"></pre>
<a href="http://codepen.io/Factmint/pen/pvWEPq" class="codepen-button">
	{% include code-pen-icon.svg %}
</a>

<div id="demo" class="documentation-example-container" style="width:80%;margin-left:auto;margin-right:auto">
<table class="fm-doughnut">
	<thead>
		<tr>
			<th>Product</th><th>Units sold</th>
		</tr>
	</thead>
	<tbody>
		<tr>
			<td>Ice cream</td><td>1500</td>
		</tr>
		<tr>
			<td>Umbrellas</td><td>6500</td>
		</tr>
		<tr>
			<td>Horse shoes</td><td>4200</td>
		</tr>
		<tr>
			<td>Pencils</td><td>2500</td>
		</tr>
		<tr>
			<td>Mugs</td><td>3200</td>
		</tr>
		<tr>
			<td>Wizard hats</td><td>100</td>
		</tr>
		<tr>
			<td>Light bulbs</td><td>300</td>
		</tr>
		<tr>
			<td>Fire extinguishers</td><td>200</td>
		</tr>
		<tr>
			<td>Wheelbarrows</td><td>400</td>
		</tr>
		<tr>
			<td>Deck chairs</td><td>200</td>
		</tr>
	</tbody>
</table>
<link rel="stylesheet" href="http://factmint.io/doughnut.css">
<script async src="http://factmint.io/doughnut.js"></script>
</div>

## Options

The following data attributes are available for a Doughnut Chart.

<dl>
 <dt>data-fm-value-prefix</dt><dd>Adds a prefix to the values. For example, you may wish to add  the ‘£’ symbol before each number</dd>
 <dt>data-fm-value-suffix</dt><dd>Adds a suffix to each of your values. For example, you may wish to add  the ‘$’ symbol after each number</dd>
 <dt>data-fm-height</dt><dd>Enforces an explicit height. Expects a value with CCS syntax, e.g. "250px" (see <a href="chart-layout-and-sizing.html#size">sizing guide</a>)</dd>
 <dt>data-fm-width</dt><dd>Enforces an explicit width. Expects a value with CCS syntax, e.g. "800px" (see <a href="chart-layout-and-sizing.html#size">sizing guide</a>)</dd>
 <dt>data-fm-enable-spillover</dt><dd>If "true", the doughnut chart will draw some transient elements outside of its configured height and width (see <a href="chart-layout-and-sizing.html#spillover">layout guide</a>)</dd>
</dl>

## Customizing colours
You can customize the colours for the sections of your doughnut chart. This is achieved by applying a <code>data-fm-color</code> attribute to the <code>&#60;tr&#62;</code> element that relates to the section you want to colour. The attribute will accept any valid CSS colour:

<pre class="line-numbers" data-src="code-examples/doughnut-hex-code-example.html"></pre>
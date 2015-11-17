---
title: Pie Chart
layout: doc-page
---

&nbsp;

The Pie Chart represents data relatively, as proportional slices of the pie.
### Interactions
Hovering on a segment shows a tooltip with the core data. Clicking on a segment selects it for comparison - all of it’s data is shown where the key would normally be and the user can hover on another segment for comparison.

<span class="tip">If your data is quite crowded, the Pie Chart will group the smallest segments into an ‘other’ segment which, on click, will bloom to reveal all of the data.</span>
### Usage
The first column represents the names of the Segments; the second column represents the size of each segment.

<span class="tip">If you put data in columns 3+ it will show up in the key area when a user clicks on a segment.</span>
## Example
<pre class="line-numbers" data-src="/code-examples/pie-documentation.html"></pre>
<a href="http://codepen.io/Factmint/pen/XJejpL/" class="codepen-button">
	{% include code-pen-icon.svg %}
</a>

<div id="demo" class="documentation-example-container">
<table class="fm-pie">
<thead>
<tr>
<th>Product</th>
<th>Units sold</th>
<th>Channel</th>
</tr>
</thead>
<tbody>
<tr>
<td>Ice cream</td>
<td>1500</td>
<td>Shop</td>
</tr>
<tr>
<td>Umbrellas</td>
<td>6500</td>
<td>Shop</td>
</tr>
<tr>
<td>Horse shoes</td>
<td>4200</td>
<td>Online</td>
</tr>
<tr>
<td>Pencils</td>
<td>2500</td>
<td>Online</td>
</tr>
<tr>
<td>Mugs</td>
<td>3200</td>
<td>Shop</td>
</tr>
<tr>
<td>Wizard hats</td>
<td>100</td>
<td>Shop</td>
</tr>
<tr>
<td>Light bulbs</td>
<td>300</td>
<td>Online</td>
</tr>
<tr>
<td>Fire extinguishers</td>
<td>200</td>
<td>Online</td>
</tr>
<tr>
<td>Wheelbarrows</td>
<td>400</td>
<td>Online</td>
</tr>
<tr>
<td>Deck chairs</td>
<td>200</td>
<td>Shop</td>
</tr>
</tbody>
</table>

[fm-chart type="pie"]
</div>

## Options
The following data attributes are available for a Pie Chart.

<dl><dt>data-fm-value-prefix</dt><dd>Adds a prefix to the values. For example, you may wish to add the ‘£’ symbol before each number</dd><dt>data-fm-value-suffix</dt><dd>Adds a suffix to each of your values. For example, you may wish to add the ‘$’ symbol after each number</dd><dt>data-fm-max-key-entries</dt><dd>Specifies a maximum number of entries to display in the key</dd><dt>data-fm-height</dt><dd>Enforces an explicit height. Expects a value with CCS syntax, e.g. "250px" (see <a href="/documentation/chart-layout-and-sizing/#size">sizing guide</a>)</dd><dt>data-fm-width</dt><dd>Enforces an explicit width. Expects a value with CCS syntax, e.g. "800px" (see <a href="/documentation/chart-layout-and-sizing/#size">sizing guide</a>)</dd> <dt>data-fm-enable-spillover</dt><dd>If "true", the pie chart will draw some transient elements outside of its configured height and width (see <a href="/documentation/chart-layout-and-sizing/#spillover">layout guide</a>)</dd>
</dl>

## Customizing colours
You can customize the colours for the sections of your pie chart. This is achieved by applying a <code>data-fm-color</code> attribute to the <code>&#60;tr&#62;</code> element that relates to the section you want to colour. The attribute will accept hex codes and RGB colour values, <em>but not colour names</em>:

<pre class="line-numbers" data-src="/code-examples/pie-hex-code-example.html"></pre>
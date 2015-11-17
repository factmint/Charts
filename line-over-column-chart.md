---
title: Line Over Column Chart
layout: doc-page
---

<a id="line-over-column-description"></a>

A line over column chart superimposes a line chart over a column chart. The Line Over Column Chart is useful for tracking two sets of time series data: one via the line chart element; a second via corresponding groups of data for the same points in time represented by the columns. This allows the combination of continuous time series data (with the line) and periodic time series data (with the columns).

### Interactions

On hover a tooltip shows the exact value of a point on the line or a column.

### Usage

The first data column is the date, time or other X-axis value. The second column is for the line chart data points. The third column is for column values. Values for the line element are marked on the left-side Y-axis; values for the column elements are marked on the right-side Y-axis.

You can tag points in time for either the line element or the columns element by appending a hash ('#') and some text after a cell value. This will render a tag on the chart showing the date that the tag relates to along with any text you have entered after the hash. Tagging a value in the second column will render the tag on the line element; tagging a value in the third column will render the tag on the column element. See the code example below for more details.
 
<span class="tip">If you use a date format, the Line Chart will distribute your data appropriately, so you can miss entries without distorting the timeline. For example, if you have data for Monday to Friday over a number of weeks, the chart will leave a two day gap between Friday and Monday.</span>

## Example

<pre class="line-numbers" data-src="/code-examples/line-over-column-documentation.html"></pre>
<a href="http://codepen.io/Factmint/pen/vNENqm" class="codepen-button">
	{% include code-pen-icon.svg %}
</a>

<div id="demo" class="documentation-example-container">
<table class="fm-line-over-bar" data-fm-y-label="Share performance" data-fm-secondary-y-label="Revenue" data-fm-date-format="DD/MM/YYYY" data-fm-start-pullout="25/03/2014" data-fm-end-pullout="27/03/2014" data-fm-pullout-title="Restructuring period" data-fm-value-prefix="£">
	<thead>
		<tr>
			<th>Date</th>
			<th>Share performance</th>
			<th>Revenue</th>
		</tr>
	</thead>
	<tbody>
		<tr>
			<td>23/03/2015</td>
			<td>9.6</td>
			<td>70</td>
		</tr>
		<tr>
			<td>24/03/2015</td>
			<td>10</td>
			<td>76#Ads started</td>
		</tr>
		<tr>
			<td>25/03/2015</td>
			<td>10.1</td>
			<td>80</td>
		</tr>
		<tr>
			<td>26/03/2015</td>
			<td>9.9</td>
			<td>90</td>
		</tr>
		<tr>
			<td>27/03/2015</td>
			<td>10.2</td>
			<td>93</td>
		</tr>
		<tr>
			<td>28/03/2015</td>
			<td>9.8#Bank holiday</td>
			<td>100</td>
		</tr>
		<tr>
			<td>29/03/2015</td>
			<td>10.1</td>
			<td>106</td>
		</tr>
		<tr>
			<td>30/03/2015</td>
			<td></td>
			<td>107</td>
		</tr>
		<tr>
			<td>31/03/2015</td>
			<td>10.2#New product</td>
			<td>111</td>
		</tr>
		<tr>
			<td>01/04/2015</td>
			<td>10.2</td>
			<td>111</td>
		</tr>
	</tbody>
</table>
<link rel="stylesheet" href="http://factmint.io/line-over-bar.css">
<script async src="http://factmint.io/line-over-bar.js"></script>
</div>

## Options

The following data attributes are available for a Line Over Column Chart.

<dl>
 <dt>data-fm-y-label</dt><dd>Adds a label to the left-side Y-axis (line values)</dd>
 <dt>data-fm-secondary-y-label</dt><dd>Adds a second label to the right-side Y-axis (column values)</dd>
 <dt>data-fm-value-prefix</dt><dd>Adds a prefix to the values. For example, you may wish to add  the ‘£’ symbol before each number</dd>
 <dt>data-fm-value-suffix</dt><dd>Adds a suffix to each of your values. For example, you may wish to add  the ‘%’ symbol after each number</dd>
 <dt>data-fm-date-format</dt><dd>Used to interpret time-series data, see <a href="http://momentjs.com/docs/#/parsing/string-format/" alt="Parsing documentation for Moment.js">the Moment.js docs</a> for format details</dd>
 <dt>data-fm-height</dt><dd>Enforces an explicit height. Expects a value with CCS syntax, e.g. "250px" (see <a href="/documentation/chart-layout-and-sizing/#size">sizing guide</a>)</dd>
 <dt>data-fm-width</dt><dd>Enforces an explicit width. Expects a value with CCS syntax, e.g. "800px" (see <a href="/documentation/chart-layout-and-sizing/#size">sizing guide</a>)</dd>
<dt>data-fm-start-pullout</dt>
<dd>Defines a start date for a pullout section. Must be in the same format as the data-fm-date-format option</dd>
<dt>data-fm-end-pullout</dt>
<dd>Defines an end date for a pullout section. Must be in the same format as the data-fm-date-format option</dd>
<dt>data-fm-pullout-title</dt>
<dd>Defines a title for your pullout section</dd>
 <dt>data-fm-enable-spillover</dt><dd>If "true", the line chart will draw some transient elements outside of its configured height and width (see <a href="/documentation/chart-layout-and-sizing/#spillover">layout guide</a>)</dd>
</dl>
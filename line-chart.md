---
title: Line Chart
layout: doc-page
---

<a id="line-description"></a>

Plots time-series data.

### Interactions

Users can track the exact values at a given time by hovering over the chart. This will show a tracking line and a tooltip with the details for that point in time.

### Usage

The first column is the date, time or any other X-axis value. All subsequent columns represent series data. If you have multiple series then there will be one coloured line for each series, with the series name shown in the key.
 
<span class="tip">If you use a date format, the Line Chart will distribute your data appropriately, so you can miss entries without distorting the timeline. For example, if you have data for Monday to Friday over a number of weeks, the chart will leave a two day gap between Friday and Monday.</span>

## Example

<pre class="line-numbers" data-src="/code-examples/line-documentation.html"></pre>
<a href="http://codepen.io/Factmint/pen/gbGwGX" class="codepen-button">
	{% include code-pen-icon.svg %}
</a>

<div id="demo" class="documentation-example-container">
<table class="fm-line" data-fm-x-label="Month" data-fm-y-label="Unit sales" data-fm-date-format="DD MMM">
	<thead>
		<tr>
			<th>Month</th><th>Ice cream sales</th><th>Umbrella sales</th>
		</tr>
	</thead>
	<tbody>
		<tr>
			<td>12 Apr</td><td>1000</td><td>7500</td>
		</tr><tr>
			<td>13 Apr</td><td>1045</td><td>6000</td>
		</tr><tr>
			<td>19 Apr</td><td>1100</td><td>8000</td>
		</tr><tr>
			<td>20 Apr</td><td>1500</td><td>6500</td>
		</tr><tr>
			<td>26 Apr</td><td>3400</td><td>2500</td>
		</tr><tr>
			<td>27 Apr</td><td>6000</td><td>1700</td>
		</tr><tr>
			<td>03 May</td><td>5500</td><td>1400</td>
		</tr><tr>
			<td>04 May</td><td>6500</td><td>1000</td>
		</tr><tr>
			<td>10 May</td><td>6400</td><td>1500</td>
		</tr><tr>
			<td>11 May</td><td>1400</td><td>3500</td>
		</tr><tr>
			<td>17 May</td><td>1090</td><td>4500</td>
		</tr><tr>
			<td>18 May</td><td>1010</td><td>5600</td>
		</tr>
	</tbody>
</table>
<br>
[fm-chart type="line"]
</div>

## Options

The following data attributes are available for a Line Chart.

<dl>
 <dt>data-fm-y-label</dt><dd>Adds a label to the Y-axis</dd>
 <dt>data-fm-value-prefix</dt><dd>Adds a prefix to the values. For example, you may wish to add  the ‘£’ symbol before each number</dd>
 <dt>data-fm-value-suffix</dt><dd>Adds a suffix to each of your values. For example, you may wish to add  the ‘$’ symbol after each number</dd>
 <dt>data-fm-date-format</dt><dd>Used to interpret time-series data, see <a href="http://momentjs.com/docs/#/parsing/string-format/" alt="Parsing documentation for Moment.js">the Moment.js docs</a> for format details</dd>
 <dt>data-fm-include-zero</dt><dd>Forces the Y-axis to include 0</dd>
 <dt>data-fm-rebase</dt><dd>Tracks the percentage change of each series. This mode is useful for comparing how two series fared relatively, for example Company A’s stock price may have doubled while Company B’s stock price only rose by 20%</dd>
 <dt>data-fm-smooth-curve</dt><dd>Connect points with a smooth line</dd>
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
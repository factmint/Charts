---
title: Stacked Area Chart
layout: doc-page
---

<a id="stacked-area-description"></a>

Stacks time-series data so that the cumulative and component values are clearly shown.

### Interactions

Users can track the exact values at a given time by hovering over the chart. This will show a tracking line and a tooltip with the details for that point in time.

### Usage

The first column is the date, time or any other X-axis value. All subsequent columns represent series data. If you have multiple series then there will be one coloured area for each series, with the series name shown in the key.
 
<span class="tip">If you use a date format, the Stacked Area Chart will distribute your data appropriately, so you can miss entries without distorting the timeline. For example, if you have data for Monday to Friday over a number of weeks, the chart will leave a two day gap between Friday and Monday.</span>

## Example

<pre class="line-numbers" data-src="/code-examples/stacked-area-documentation.html"></pre>
<a href="http://codepen.io/Factmint/pen/VYMKrP" class="codepen-button">
	{% include code-pen-icon.svg %}
</a>

<div id="demo" class="documentation-example-container" style="min-height: 500px; width: 100%;">
<table class="fm-stacked-area" data-fm-y-label="Sales" data-fm-date-format="DD/MM/YYYY" data-fm-value-prefix="£">
	<thead>
		<tr>
			<th>Date</th><th>Ice cream</th><th>Umbrellas</th><th>Horse shoes</th><th>Pencils</th><th>Mugs</th><th>Wizard hats</th><th>Light bulbs</th><th>Fire extinguishers</th><th>Wheelbarrows</th>
		</tr>
	</thead>
	<tbody>
		<tr>
			<td>01/01/2014</td><td>1500</td><td>6500</td><td>4200</td><td>2500</td><td>3200</td><td>100</td><td>300</td><td>200</td><td>400</td>
		</tr><tr>
			<td>01/02/2014</td><td>1045</td><td>6000</td><td>4567</td><td>2537</td><td>3937</td><td>103</td><td>347</td><td>240</td><td>200</td>
		</tr><tr>
			<td>01/03/2014</td><td>6400</td><td>1500</td><td>4908</td><td>2505</td><td>3577</td><td>101</td><td>328</td><td>301</td><td>670</td>
		</tr><tr>
			<td>01/04/2014</td><td>1400</td><td>3500</td><td>5600</td><td>2526</td><td>3403</td><td>103</td><td>327</td><td>340</td><td>700</td>
		</tr><tr>
			<td>01/05/2014</td><td>1000</td><td>7500</td><td>6007</td><td>2572</td><td>3810</td><td>108</td><td>335</td><td>1040</td><td>780</td>
		</tr><tr>
			<td>01/06/2014</td><td>1090</td><td>4500</td><td>5670</td><td>2585</td><td>3425</td><td>100</td><td>361</td><td>2708</td><td>900</td>
		</tr><tr>
			<td>01/07/2014</td><td>1010</td><td>5600</td><td>6432</td><td>2595</td><td>3989</td><td>104</td><td>384</td><td>3500</td><td>1400</td>
		</tr><tr>
			<td>01/08/2014</td><td>5500</td><td>1400</td><td>4032</td><td>2549</td><td>3914</td><td>109</td><td>386</td><td>3100</td><td>1300</td>
		</tr><tr>
			<td>01/09/2014</td><td>1100</td><td>8000</td><td>3002</td><td>2521</td><td>3270</td><td>108</td><td>396</td><td>2503</td><td>1215</td>
		</tr><tr>
			<td>01/10/2014</td><td>3400</td><td>2500</td><td>1023</td><td>2521</td><td>3390</td><td>108</td><td>322</td><td>2190</td><td>900</td>
		</tr><tr>
			<td>01/11/2014</td><td>6000</td><td>1700</td><td>900</td><td>2596</td><td>3858</td><td>105</td><td>355</td><td>760</td><td>403</td>
		</tr><tr>
			<td>01/12/2014</td><td>6500</td><td>1000</td><td>3583</td><td>2508</td><td>3478</td><td>110</td><td>323</td><td>300</td><td>340</td>
		</tr>
	</tbody>
</table>
<link rel="stylesheet" href="http://factmint.io/stacked-area.css">
<script async src="http://factmint.io/stacked-area.js"></script>
</div>

## Options

The following data attributes are available for a Stacked Area Chart.

<dl>
 <dt>data-fm-y-label</dt><dd>Adds a label to the Y-axis</dd>
 <dt>data-fm-value-prefix</dt><dd>Adds a prefix to the values. For example, you may wish to add  the ‘£’ symbol before each number</dd>
 <dt>data-fm-value-suffix</dt><dd>Adds a suffix to each of your values. For example, you may wish to add  the ‘$’ symbol after each number</dd>
 <dt>data-fm-include-zero</dt><dd>Forces the Y-axis to include 0</dd>
 <dt>data-fm-date-format</dt><dd>Used to interpret time-series data, see <a href="http://momentjs.com/docs/#/parsing/string-format/" alt="Parsing documentation for Moment.js">the Moment.js docs</a> for format details</dd>
 <dt>data-fm-percent</dt><dd>Renders the visualization as a 100% stacked area chart</dd>
 <dt>data-fm-height</dt><dd>Enforces an explicit height. Expects a value with CCS syntax, e.g. "250px" (see <a href="/documentation/chart-layout-and-sizing/#size">sizing guide</a>)</dd>
 <dt>data-fm-width</dt><dd>Enforces an explicit width. Expects a value with CCS syntax, e.g. "800px" (see <a href="/documentation/chart-layout-and-sizing/#size">sizing guide</a>)</dd>
 <dt>data-fm-enable-spillover</dt><dd>If "true", the stacked area chart will draw some transient elements outside of its configured height and width (see <a href="/documentation/chart-layout-and-sizing/#spillover">layout guide</a>)</dd>
</dl>
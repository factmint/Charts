---
title: Candlestick Chart
layout: doc-page
---

<a id="candlestick-description"></a>

A Candlestick Chart plots high, low, opening and closing values - such as stock prices. The chart colours the candlesticks to indicate a loss or a gain.

### Interactions

On hover a tooltip shows the Date, High, Low, Open and Close values for each candlestick.

### Usage

The first column is the date, time or any other X-axis value. The second column is the Open value. The third column is the High value. The fourth column is the Low value. The fifth column is the Close value.

## Example

<pre class="line-numbers" data-src="/code-examples/candlestick-documentation.html"></pre>
<a href="http://codepen.io/Factmint/pen/MYEjrd" class="codepen-button">
	{% include code-pen-icon.svg %}
</a>

<div id="demo" class="documentation-example-container" style="width: 100%; height: 350px; margin-bottom: 120px;">
<table  class="fm-candlestick" data-fm-y-label="Price" data-fm-value-suffix="$">
	<thead>
		<tr>
			<th>Date</th>
			<th>Open</th>
			<th>High</th>
			<th>Low</th>
			<th>Close</th>
		</tr>
	</thead>
	<tbody>
		<tr>
			<td>20/03/2014</td>
			<td>110</td>
			<td>145</td>
			<td>75</td>
			<td>80</td>
		</tr>
		<tr>
			<td>21/03/2014</td>
			<td>190</td>
			<td>190</td>
			<td>135</td>
			<td>145</td>
		</tr>
		<tr>
			<td>23/03/2014</td>
			<td>205</td>
			<td>220</td>
			<td>160</td>
			<td>192</td>
		</tr>
		<tr>
			<td>24/03/2014</td>
			<td>155</td>
			<td>193</td>
			<td>140</td>
			<td>190</td>
		</tr>
		<tr>
			<td>25/03/2014</td>
			<td>151</td>
			<td>160</td>
			<td>120</td>
			<td>158</td>
		</tr>
		<tr>
			<td>26/03/2014</td>
			<td>190</td>
			<td>190</td>
			<td>118</td>
			<td>150</td>
		</tr>
		<tr>
			<td>27/03/2014</td>
			<td>201</td>
			<td>225</td>
			<td>170</td>
			<td>175</td>
		</tr>
		<tr>
			<td>28/03/2014</td>
			<td>225</td>
			<td>249</td>
			<td>198</td>
			<td>245</td>
		</tr>
		<tr>
			<td>29/03/2014</td>
			<td>280</td>
			<td>280</td>
			<td>225</td>
			<td>275</td>
		</tr>
		<tr>
			<td>22/03/2014</td>
			<td>330</td>
			<td>348</td>
			<td>277</td>
			<td>280</td>
		</tr>
		<tr>
			<td>30/03/2014</td>
			<td>290</td>
			<td>340</td>
			<td>240</td>
			<td>260</td>
		</tr>
		<tr>
			<td>31/03/2014</td>
			<td>225</td>
			<td>252</td>
			<td>198</td>
			<td>245</td>
		</tr>
		<tr>
			<td>01/04/2014</td>
			<td>240</td>
			<td>240</td>
			<td>175</td>
			<td>197</td>
		</tr>
		<tr>
			<td>02/04/2014</td>
			<td>145</td>
			<td>160</td>
			<td>140</td>
			<td>158</td>
		</tr>
		<tr>
			<td>03/04/2014</td>
			<td>130</td>
			<td>149</td>
			<td>123</td>
			<td>125</td>
		</tr>
		<tr>
			<td>04/04/2014</td>
			<td>125</td>
			<td>149</td>
			<td>88</td>
			<td>90</td>
		</tr>
		<tr>
			<td>05/04/2014</td>
			<td>110</td>
			<td>170</td>
			<td>108</td>
			<td>140</td>
		</tr>
		<tr>
			<td>06/04/2014</td>
			<td>194</td>
			<td>205</td>
			<td>148</td>
			<td>169</td>
		</tr>
		<tr>
			<td>07/04/2014</td>
			<td>205</td>
			<td>230</td>
			<td>174</td>
			<td>190</td>
		</tr>
		<tr>
			<td>08/04/2014</td>
			<td>148</td>
			<td>190</td>
			<td>140</td>
			<td>165</td>
		</tr>
		<tr>
			<td>09/04/2014</td>
			<td>185</td>
			<td>185</td>
			<td>130</td>
			<td>154</td>
		</tr>
		<tr>
			<td>10/04/2014</td>
			<td>149</td>
			<td>158</td>
			<td>101</td>
			<td>151</td>
		</tr>
		<tr>
			<td>11/04/2014</td>
			<td>229</td>
			<td>232</td>
			<td>162</td>
			<td>170</td>
		</tr>
		<tr>
			<td>12/04/2014</td>
			<td>149</td>
			<td>208</td>
			<td>125</td>
			<td>208</td>
		</tr>
		<tr>
			<td>13/04/2014</td>
			<td>148</td>
			<td>177</td>
			<td>120</td>
			<td>175</td>
		</tr>
		<tr>
			<td>14/04/2014</td>
			<td>90</td>
			<td>141</td>
			<td>86</td>
			<td>135</td>
		</tr>
		<tr>
			<td>15/04/2014</td>
			<td>98</td>
			<td>115</td>
			<td>52</td>
			<td>60</td>
		</tr>
		<tr>
			<td>16/04/2014</td>
			<td>48</td>
			<td>100</td>
			<td>44</td>
			<td>60</td>
		</tr>
		<tr>
			<td>17/04/2014</td>
			<td>8</td>
			<td>75</td>
			<td>8</td>
			<td>40</td>
		</tr>
		<tr>
			<td>18/04/2014</td>
			<td>90</td>
			<td>100</td>
			<td>44</td>
			<td>50</td>
		</tr>
		<tr>
			<td>19/04/2014</td>
			<td>101</td>
			<td>140</td>
			<td>78</td>
			<td>90</td>
		</tr>
	</tbody>
</table>
<link rel="stylesheet" href="http://factmint.io/candlestick.css">
<script async src="http://factmint.io/candlestick.js"></script>
</div>

## Options

The following data attributes are available for a Candlestick Chart:

<dl>
 <dt>data-fm-y-label</dt><dd>Adds a label to the Y axis</dd>
 <dt>data-fm-value-prefix</dt><dd>Adds a prefix to the values. For example, you may wish to add  the ‘£’ symbol before each number</dd>
 <dt>data-fm-value-suffix</dt><dd>Adds a suffix to each of your values. For example, you may wish to add  the ‘$’ symbol after each number</dd>
 <dt>data-fm-include-zero</dt><dd>Force the y-scale to include zero</dd>
 <dt>data-fm-date-format</dt><dd>Used to interpret time-series data, see <a href="http://momentjs.com/docs/#/parsing/string-format/" alt="Parsing documentation for Moment.js">the Moment.js docs</a> for format details</dd>
 <dt>data-fm-greyscale</dt><dd>Renders chart in greyscale</dd>
 <dt>data-fm-height</dt><dd>Enforces an explicit height. Expects a value with CCS syntax, e.g. "250px" (see <a href="/documentation/chart-layout-and-sizing/#size">sizing guide</a>)</dd>
 <dt>data-fm-width</dt><dd>Enforces an explicit width. Expects a value with CCS syntax, e.g. "800px" (see <a href="/documentation/chart-layout-and-sizing/#size">sizing guide</a>)</dd>
 <dt>data-fm-enable-spillover</dt><dd>If "true", the candlestick chart will draw some transient elements outside of its configured height and width (see <a href="/documentation/chart-layout-and-sizing/#spillover">layout guide</a>)</dd>
</dl>
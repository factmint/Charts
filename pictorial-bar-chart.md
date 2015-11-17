---
title: Pictorial Bar Chart
layout: doc-page
---

<a id="pictorial-bar-description"></a>

The Pictorial Bar Chart is similar in layout to a conventional 100% stacked <a href="column-bar-chart.html">bar chart</a> but uses a row of symbols, with different symbols for each series.

### Interactions

On hover a tooltip shows a series' details on hover.

### Usage

The first column is the label for each bar. All subsequent columns are data series.
 
<span class="tip">By default, colours and glyphs are chosen automatically, however in all cases the glyphs - at least - should be overridden by configuration (see <a href="#customizing-glyphs">below</a>).</span>

## Example

<pre class="line-numbers" data-src="code-examples/pictorial-bar-documentation.html"></pre>
<a href="http://codepen.io/Factmint/pen/ogGzpz" class="codepen-button">
	{% include code-pen-icon.svg %}
</a>

<div id="demo" class="documentation-example-container">
<style>.fontawesome-icon { font-family: FontAwesome;}</style>
<table class="fm-pictorial-bar">
	<thead>
		<tr>
			<th>Industry</th>
			<th data-fm-glyph="&#61827;" data-fm-glyph-class="fontawesome-icon">Male executives</th>
			<th data-fm-glyph="&#61826;" data-fm-glyph-class="fontawesome-icon">Female executives</th>
		</tr>
	</thead>
	<tbody>
		<tr>
			<td>IT</td>
			<td>1203</td>
			<td>201</td>
		</tr>
		<tr>
			<td>Healthcare</td>
			<td>1534</td>
			<td>890</td>
		</tr>
		<tr>
			<td>Retail</td>
			<td>4223</td>
			<td>3039</td>
		</tr>
		<tr>
			<td>Real estate</td>
			<td>929</td>
			<td>835</td>
		</tr>
	</tbody>
</table>
<link rel="stylesheet" href="http://factmint.io/pictorial-bar.css">
<script async src="http://factmint.io/pictorial-bar.js"></script>
</div>

## Options

The following data attributes are available for a Pictorial Bar Chart.

<dl>
 <dt>data-fm-height</dt><dd>Enforces an explicit height. Expects a value with CCS syntax, e.g. "250px" (see <a href="chart-layout-and-sizing.html#size">sizing guide</a>)</dd>
 <dt>data-fm-width</dt><dd>Enforces an explicit width. Expects a value with CCS syntax, e.g. "800px" (see <a href="chart-layout-and-sizing.html#size">sizing guide</a>)</dd>
 <dt>data-fm-enable-spillover</dt><dd>If "true", the pictorial bar chart will draw some transient elements outside of its configured height and width (see <a href="chart-layout-and-sizing.html#spillover">layout guide</a>)</dd>

</dl>


## Customizing glyphs

### Using custom glyphs

By default, the Pictorial Bar Chart will use the first letter of the series title (columns header) as the symbol to represent the series - for example, "Male executives" would be represented by an "m". In most cases this is not suitable and should be avoided. You can choose a different glyph for the series by adding the "data-fm-glyph" attribute to the <code>th</code>, like so:

<pre class="line-numbers" data-src="code-examples/pictorial-bar-glyph-example.html"></pre>

Any character can be used. In the example above, the charcter is a standard UTF-8 character, which can be used as an HTML entity code or (if the HTML document has the correct character set) the character itself.

### Customizing glyph classes

As well as changing the glyph, you can apply a CSS class using the "data-fm-glyph-class" annotation on a <code>th</code>. For example, 'data-fm-glyph-class="male"' would apply a class of "male" to all symbols for Males:

<pre class="line-numbers" data-src="code-examples/pictorial-bar-glyph-class-example.html"></pre>

<span class="tip">Remember that the glyphs are rendered as SVG text elements, so the CSS rules are different from those for HTML. For example, SVG supports "stroke" and "fill".</span>

### Using icon fonts

By providing a custom glyph class, setting the "font-family", and using HTML character entities as glyphs you can utilize icon fonts. For example:

<pre class="line-numbers" data-src="code-examples/pictorial-bar-glyph-icon-font-example.html"></pre>

There are a number of tools online which can help you find the HTML entity value, including <a href="http://unicode.online-toolz.com/tools/unicode-html-entities-convertor.php" alt="Online entity converter">this one from Toolz</a>.


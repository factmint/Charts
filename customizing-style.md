---
title: Customizing Style
layout: doc-page
---

<h2>Editing SASS</h2>

<p>Factmint Charts visualizations have been developed using <a href="http://sass-lang.com/">SASS</a>, with the SCSS syntax. In order to modify the appearance of a visualization, you can edit the supplied stylesheets, or you can override any classes with your own stylesheet (which can, of course, be plain CSS).</p>

<h3>theme.scss (<a href="http://factmint.github.io/Charts/assets/scss/charts/theme.scss">Download</a>)</h3>
<b>Generic styles that are applicable to all types of chart.</b>
<p>This includes basic properties such as background/foreground colours, typography settings, and the main colour wheel. The wheel consists of twelve colours, which have been selected to work well in various sequences used on the visualizations. Additionally, there is an overflow colour that is used on visual elements that indicate data that could not fit on the visualization in its basic form (an example being the black "overflow" segment on pie charts that can be clicked to reveal data that was hidden).</p>

<h3>classes.scss (<a href="http://factmint.github.io/Charts/assets/scss/charts/classes.scss">Download</a>)</h3>
<b>Generic classes that can be applied to elements on any type of chart.</b>
<p>This stylesheet generates colour classes based on the colour definitions in <code>variables.scss</code>. There is a class for each colour in the colour wheel, with the added option of using it to stroke an element (e.g. <code>.fm-color-wheel-a .with-stroke</code>) or to avoid filling the element (e.g. <code>.fm-color-wheel-c .no-fill</code>).

<h3>chart-name.scss (See below for download)</h3>
<b>Styles that are specific to a given type of chart.</b>
<p>If you modify this stylesheet, ensure that the two <code>@import</code> calls at the top to variables.scss and classes.scss remain in place, otherwise you will lose the generic styles (which will likely break your visualizations). This is the main SCSS file that can be compiled using Sass to create a new <code>chart-name.css</code>.</p>


<ul id="chart=styles">
   <li><a href="http://factmint.github.io/Charts/assets/scss/charts/bubble.scss">bubble.scss</a> (Bubble Chart)</li>
   <li><a href="http://factmint.github.io/Charts/assets/scss/charts/candlestick.scss">candlestick.scss</a> (Candlestick Chart)</li>
   <li><a href="http://factmint.github.io/Charts/assets/scss/charts/choropleth-uk-constituencies.scss">choropleth-uk-constituencies.scss</a> (Choropleth UK Constituencies)</li>
   <li><a href="http://factmint.github.io/Charts/assets/scss/charts/choropleth-world-countries.scss">choropleth-world-countries.scss</a> (Choropleth World Countries)</li>
   <li><a href="http://factmint.github.io/Charts/assets/scss/charts/column-bar.scss">column-bar.scss</a> (Column/Bar Chart)</li>
   <li><a href="http://factmint.github.io/Charts/assets/scss/charts/doughnut.scss">doughnut.scss</a> (Doughnut)</li>
   <li><a href="http://factmint.github.io/Charts/assets/scss/charts/line-over-bar.scss">line-over-bar.scss</a> (Line Over Bar Chart)</li>
   <li><a href="http://factmint.github.io/Charts/assets/scss/charts/line.scss">line.scss</a> (Line Chart)</li>
   <li><a href="http://factmint.github.io/Charts/assets/scss/charts/pictorial-bar.scss">pictorial-bar.scss</a> (Pictorial Bar Chart)</li>
   <li><a href="http://factmint.github.io/Charts/assets/scss/charts/pie.scss">pie.scss</a> (Pie Chart)</li>
   <li><a href="http://factmint.github.io/Charts/assets/scss/charts/scatter.scss">scatter.scss</a> (Scatter Graph)</li>
   <li><a href="http://factmint.github.io/Charts/assets/scss/charts/stacked-area.scss">stacked-area.scss</a> (Stacked Area Chart)</li>
   <li><a href="http://factmint.github.io/Charts/assets/scss/charts/stacked-column-bar.scss">stacked-column-bar.scss</a> (Stacked Column/Bar Chart)</li>
</ul>

---
title: Customizing Style
layout: doc-page
---

<h2>Editing SASS</h2>

<p>Factmint Charts visualizations have been developed using <a href="http://sass-lang.com/">SASS</a>, with the SCSS syntax. In order to modify the appearance of a visualization, you can edit the supplied stylesheets, or you can override any classes with your own stylesheet (which can, of course, be plain CSS).</p>

<h3>variables.scss (<a href="http://s.factmint.com/charts/assets/style/scss/variables.scss">Download</a>)</h3>
<b>Generic styles that are applicable to all types of chart.</b>
<p>This includes basic properties such as background/foreground colours, typography settings, and the main colour wheel. The wheel consists of twelve colours, which have been selected to work well in various sequences used on the visualizations. Additionally, there is an overflow colour that is used on visual elements that indicate data that could not fit on the visualization in its basic form (an example being the black "overflow" segment on pie charts that can be clicked to reveal data that was hidden).</p>

<h3>classes.scss (<a href="http://s.factmint.com/charts/assets/style/scss/classes.scss">Download</a>)</h3>
<b>Generic classes that can be applied to elements on any type of chart.</b>
<p>This stylesheet generates colour classes based on the colour definitions in <code>variables.scss</code>. There is a class for each colour in the colour wheel, with the added option of using it to stroke an element (e.g. <code>.fm-color-wheel-a .with-stroke</code>) or to avoid filling the element (e.g. <code>.fm-color-wheel-c .no-fill</code>).

<h3>chart-name.scss (See below for download)</h3>
<b>Styles that are specific to a given type of chart.</b>
<p>If you modify this stylesheet, ensure that the two <code>@import</code> calls at the top to variables.scss and classes.scss remain in place, otherwise you will lose the generic styles (which will likely break your visualizations). This is the main SCSS file that can be compiled using Sass to create a new <code>chart-name.css</code>.</p>


<ul id="chart=styles">
   <li><a href="http://s.factmint.com/charts/assets/style/scss/column-bar.scss">column-bar.scss</a> (Column/bar chart)</li>
   <li><a href="http://s.factmint.com/charts/assets/style/scss/pie.scss">pie.scss</a> (Pie chart)</li>
   <li><a href="http://s.factmint.com/charts/assets/style/scss/doughnut.scss">doughnut.scss</a> (Doughnut chart)</li>
   <li><a href="http://s.factmint.com/charts/assets/style/scss/line.scss">line.scss</a> (Line chart)</li>
   <li><a href="http://s.factmint.com/charts/assets/style/scss/stacked-area.scss">stacked-area.scss</a> (Stacked area chart)</li>
   <li><a href="http://s.factmint.com/charts/assets/style/scss/candlestick.scss">candlestick.scss</a> (Candlestick chart)</li>
   <li><a href="http://s.factmint.com/charts/assets/style/scss/scatter.scss">scatter.scss</a> (Scatter graph)</li>
   <li><a href="http://s.factmint.com/charts/assets/style/scss/bubble.scss">bubble.scss</a> (Bubble chart)</li>
   <li><a href="http://s.factmint.com/charts/assets/style/scss/pictorial-bar.scss">pictorial-bar.scss</a> (Pictorial bar chart)</li>
   <li><a href="http://s.factmint.com/charts/assets/style/scss/stacked-area.scss">stacked-area.scss</a> (Stacked area)</li>
</ul>

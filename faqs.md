---
title: FAQs
layout: doc-page
---

<dl class="faq">

<dt><blockquote>Why is my chart covering other content on the page?</blockquote></dt>
<dd><p>This may happen if you configure a chart to use an extra <i>spillover</i> area to draw transient elements like tooltips. You can turn that feature off by removing the option: <b>data-fm-enable-spillover="true"</b>. See <a href="chart-layout-and-sizing.html" alt="Documentation on chart layout">Chart layout and sizing</a>.</p></dd>

<dt><blockquote>Why is "You need to register your domain at http://charts.factmint.com in order to use this Chart." reported in the console?</blockquote></dt>
<dd><p>Our system checks the "Referer" header in the request for our JavaScript; if you have not registered the domain then we will not serve the JavaScript.</p></dd>

<dt><blockquote>I have registered my domain but I still get "You need to register your domain at http://charts.factmint.com in order to use this Chart."</blockquote></dt>
<dd><p>Have you registered the subdomain that you at hosting the chart from? For example, blog.factmint.com and factmint.com would both need to be registered seperately.</p></dd>

<dt><blockquote>Why does my chart <i>flash</i> black?</blockquote></dt>
<dd><p>If you include the script tag before the style link, it is possible that the chart renders before its styling has loaded. Make sure you include the CSS first, or in the document's head.</p></dd>

<dt><blockquote>How can I use Factmint Charts with WordPress? It strips out <code>script</code> tags.</blockquote></dt>
<dd><p>You can use a shortcode to embed the script and link tags. Something like this:</p>
<pre class="line-numbers language-javascript" data-src="code-examples/wp-shortcode.php"></pre>
<p>Then you would add this to the a table in an article:</p>
<pre class="line-numbers" data-src="code-examples/wp-post.html"></pre>
</dd>

<dt><blockquote>I'm a commercial licence customer, what happens if I exceed the number of chart impressions I have paid for?</blockquote></dt>
<dd><p>We'll contact you. Your service will continue to run and you <em>will not be charged any more</em>; we will ask you to upgrade your licence to cover your usage for subsequent months.</p></dd>

<dt><blockquote>I don't like the table styling for older browsers / disabled JavaScript.</blockquote></dt>
<dd><p>If a Factmint chart cannot render, it should leave the original HTML table in place. The chart itself does not provide any styling for the table as that might be obtrusive on the host site and may not have consistent style with the rest of the site. However, we do provide a simple stylesheet to improve the look of basic tables: you can use it like this:</p>
<pre class="line-numbers" data-src="code-examples/fallback-table.html"></pre>
<p>The stylesheet will not set the <code>font-family</code>, the <code>color</code> of the <code>tbody</code> text, etc; these things should cascade from the documents styling.</p>
</dd>

<dt><blockquote>What does the "async" attribute on my <code>&lt;script&gt;</code> tag do, and do I need it?</blockquote></dt>
<dd><p>This attribute means the code will start executing as soon as the script is downloaded. This behaviour is desirable in most cases because it means the loading of your page won't hang until the script is ready. However, if you notice any issues with how charts are displaying (particularly in the case of larger websites with complicated CSS), you should try removing the "async" attribute.</p></dd>


<dt><blockquote>Labels are not appearing correctly on my chart: the background is too small for the text. What is causing this?</blockquote></dt>
<dd><p>By default, Factmint Charts embed codes include an "async" attribute (see question above). Sometimes, particularly in the case of larger websites with complicated CSS, this can cause the chart to be rendered before the CSS has finished being applied. This can cause display problems such as the label backgrounds being drawn with an incorrect size. To resolve the issue, remove the "async" attribute from the <code>&lt;script&gt;</code> tag.</p></dd>


<dt><blockquote>Which browsers do your charts support?</blockquote></dt>
<dd><p>In short, we support the latest and latest -1 releases for Chrome and Firefox, Safari 7 & 8 and Internet Explorer 10 & 11. Please see our <a href="/supported-browsers.html">supported browsers</a> page for more detailed information.</p></dd>
</dl>


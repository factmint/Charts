---
title: Getting Started
layout: doc-page
---

Follow these steps to set a domain up for Factmint Charts:

1. Go to charts.factmint.com
2. Authenticate with a Google account
3. Register your domain(s)

## Basic usage

Factmint Charts work by reading HTML tables with certain classes and replacing them with an interactive SVG data visualization.

### Example

<pre data-src="code-examples/basic-example.html" class="line-numbers"></pre>

<span class="hint">It's a good idea to add the "async" attribute to the script tag, so it doesn't interfere with page load times as much.</span>

## Configuration

Each plugin has a number of options, used to control how the chart renders and behaves. For example, setting titles on axes. The specific options are described in the documentation page for each chart type. In all cases, the options can be set in two ways:

### HTML tag attributes

<pre data-src="code-examples/attribute-config.html" class="line-numbers"></pre>

Any data attributes, applied to the table, that start with “data-fm-” will be treated as options. You must use hyphen separated attribute names.

### JavaScript objects

<pre data-src="code-examples/js-config.html" class="line-numbers"></pre>

Giving a table the attribute 'data-fm-config="myConfig"' will cause the Chart to look for an object name "myConfig" in the global scope; it will use the values from that object to configure the Chart. The object's keys must be camel-case. For example, the attribute "data-fm-smooth-curve" would, as an object key, be "smoothCurve".

Attribute-based configuration will override object-based configuration but it is, otherwise, fine to combine the two techniques.
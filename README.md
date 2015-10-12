# Factmint Charts

Factmint Charts allows you to create interactive data visualizations, which can be rendered from an HTML table or directly from JSON. For more information and live examples, see [http://factmint.com/charts-overview/](http://factmint.com/charts-overview/). This repo includes the visualization plugins as well as the API that you can use to create your own (see the `/api` directory).

It should be noted that some visualizations are built using the new API (version 2.x, as found in the `/api` directory) while others are built using a legacy framework. Please see below for details. 

## Getting started

First, clone this repository with `git clone https://github.com/factmint/Charts.git`. Then navigate to `/api` and run `npm install`.

To see running examples, navigate to the directory of a given plugin in the terminal and run `grunt install` (if you haven't already), then ` grunt serve` e.g.

```
cd choropleth-uk-constituencies
grunt install
grunt serve
```

If the plugin was not built using API 2.x then You will also need to run `bower install` before running `grunt serve`.

This will start a web server. You should see a message telling you which port it is running on (e.g. "Started connect web server on http://0.0.0.0:15009"). You can now navigate to http://locahost:15009 (the port number will be different if 15009 was not open when you ran `grunt serve`, so be sure to check), where you will see the directory listing for the charts repository (or the root directory for the plugin, if it was not built using API 2.x). If you look in the directory for the given plugin you will find an `examples/unbuilt/` directory, containing example use cases.

## Building a plugin

Once you have tested a plugin and decided you would like to use it in a live scenario, you will probably want to build a standalone minified script. To achieve this, run `grunt build` from the plugin's root directory. This will create a `dist/` directory containing four files: a standalone script, a minified standalone script, a minified CSS file, and a text file containing all of the available options for the given plugin. Having generated these files, you can see an example using a built script by running `grunt serve` from the plugin's root directory, and navigating to the `examples/built/` directory in your browser.

## Tests

To see unit tests for the API, run `grunt serve` from the `/api` directory and navigate to http://localhost:1500X/test in your browser.

## Charts

* Bubble Chart
  * See [http://factmint.com/documentation/bubble-chart/](http://factmint.com/documentation/bubble-chart/)

* Candlestick Chart
  * See [http://factmint.com/documentation/candlestick-chart/](http://factmint.com/documentation/candlestick-chart/)
 
* Choropleth (UK constituencies)
  * Built using API v2. See [http://factmint.com/documentation/choropleth/](http://factmint.com/documentation/choropleth/) 

* Choropleth (world continents)
  * Built using API v2. See [http://factmint.com/documentation/world-countries-choropleth/](http://factmint.com/documentation/world-countries-choropleth/) 

* Column/Bar Chart
  * See [http://factmint.com/documentation/column-bar-chart/](http://factmint.com/documentation/column-bar-chart)

* Doughnut Chart
  * See [http://factmint.com/documentation/doughnut-chart/](http://factmint.com/documentation/doughnut-chart/) 

* Line Chart
  * See [http://factmint.com/documentation/line-chart/](http://factmint.com/documentation/line-chart/)

* Line Over Bar Chart
  * Built using API v2. See [http://factmint.com/documentation/line-over-column-chart/](http://factmint.com/documentation/line-over-column-chart/)
 
* Pictorial Bar Chart
  * See [http://factmint.com/documentation/pictorial-bar-chart/](http://factmint.com/documentation/pictorial-bar-chart/)

* Pie Chart
  * Built using API v2. See [http://factmint.com/documentation/pie-chart/](http://factmint.com/documentation/pie-chart/) 

* Scatter Graph
  * See [http://factmint.com/documentation/scatter-graph/](http://factmint.com/documentation/scatter-graph/) 

* Stacked Area Chart
  * See [http://factmint.com/documentation/stacked-area-chart/](http://factmint.com/documentation/stacked-area-chart/) 

* Stacked Column Bar Chart
  * Built using API v2. See [http://factmint.com/documentation/stacked-column-bar-chart/](http://factmint.com/documentation/stacked-column-bar-chart/) 

### API
The `/api` directory contains the API, which can be used to build your own visualization plugins. See [https://github.com/factmint/Charts/blob/master/api/README.md](https://github.com/factmint/Charts/blob/master/api/README.md) for more information.

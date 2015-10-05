# Factmint Charts

Factmint Charts allows you to create interactive data visualizations, which can be rendered from an HTML table or directly from JSON. For more information and live examples, see [http://factmint.com/charts-overview/](http://factmint.com/charts-overview/). This repo includes the visualization plugins as well as the API that you can use to create your own (see the `/factmint-charts` directory).

It should be noted that some visualizations are built using the new API (version 2.x, as found in the `/factmint-charts` directory) while others are built using a legacy framework. Please see below for details. 

## Getting started

First, clone this repository with `git clone https://github.com/factmint/Charts.git`. Then navigate to `/factmint-charts` and run `npm install`.

To see running examples, navigate to the directory of a given plugin in the terminal and run `npm install && grunt serve` e.g.

```
cd choropleth-uk-constituencies
npm install && grunt serve
```

If the plugin was not built using API 2.x then You will also need to run `bower install` before running `grunt serve`.

This will start a web server. You should see a message telling you which port it is running on (e.g. "Started connect web server on http://0.0.0.0:15009"). You can now navigate to http://locahost:15009 (the port number will be different if 15009 was not open when you ran `grunt serve`, so be sure to check), where you will see the directory listing for the charts repository. If you look in the directory for the given plugin you will find an examples directory, containing HTML examples.

To see unit tests for the API, run `grunt serve` from the `/factmint-charts` directory and navigate to the `/test` directory.

### /bubble-chart
See [http://factmint.com/documentation/bubble-chart/](http://factmint.com/documentation/bubble-chart/)

### /candlestick-chart
See [http://factmint.com/documentation/candlestick-chart/](http://factmint.com/documentation/candlestick-chart/)
 
### /choropleth-uk-constituencies
Built using API v2. See [http://factmint.com/documentation/choropleth/](http://factmint.com/documentation/choropleth/) 

### /choropleth-world-continents
Built using API v2. See [http://factmint.com/documentation/world-countries-choropleth/](http://factmint.com/documentation/world-countries-choropleth/) 

### /column-bar-chart
See [http://factmint.com/documentation/column-bar-chart/](http://factmint.com/documentation/column-bar-chart)

### /doughnut-chart
See [http://factmint.com/documentation/doughnut-chart/](http://factmint.com/documentation/doughnut-chart/) 

### /factmint-charts
This directory contains the API, which can be used to build your own visualization plugins.

## /line-chart
See [http://factmint.com/documentation/line-chart/](http://factmint.com/documentation/line-chart/)

## /line-over-bar-chart
Built using API v2. See [http://factmint.com/documentation/line-over-column-chart/](http://factmint.com/documentation/line-over-column-chart/)
 
## /pictorial-bar-chart
See [http://factmint.com/documentation/pictorial-bar-chart/](http://factmint.com/documentation/pictorial-bar-chart/)

## /pie-chart
Built using API v2. See [http://factmint.com/documentation/pie-chart/](http://factmint.com/documentation/pie-chart/) 

## /scatter-graph
See [http://factmint.com/documentation/scatter-graph/](http://factmint.com/documentation/scatter-graph/) 

## /stacked-area-chart
See [http://factmint.com/documentation/stacked-area-chart/](http://factmint.com/documentation/stacked-area-chart/) 

## /stacked-column-bar-chart
Built using API v2. See [http://factmint.com/documentation/stacked-column-bar-chart/](http://factmint.com/documentation/stacked-column-bar-chart/) 


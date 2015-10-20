# Factmint Charts

Factmint Charts allows you to create interactive data visualizations, which can be rendered from an HTML table or directly from JSON. For more information and live examples, see [http://factmint.com/charts-overview/](http://factmint.com/charts-overview/). This repo includes the charts as well as the API that you can use to create your own (see the `/api` directory).

## Getting started

First, clone this repository with `git clone https://github.com/factmint/Charts.git`. Then run `npm install` from the project root.

To see running examples, navigate to the directory of a given chart in the terminal and (if it's the first time) `npm install` and `grunt install`. Finally, run `grunt serve` from the project root (not the chart directory).

e.g.

```
cd choropleth-uk-constituencies
npm install && grunt install
cd ../../
grunt serve
```

This will start a web server. You should see a message telling you which port it is running on (e.g. "Started connect web server on http://0.0.0.0:15002"). You can now navigate to http://locahost:15002 (the port number will be different if 15002 was not open when you ran `grunt serve`, so be sure to check), where you will see a directory listing. If you look in the `examples/unbuilt/` directory, you will find example use cases.

## Building a chart

Once you have tested a chart and decided you would like to use it in a live scenario, you will probably want to build a standalone minified script. To achieve this, run `grunt build` from the chart's root directory. This will create three files in the `/dist/` directory: a minified standalone script, a minified CSS file, and a text file containing all of the available options for the given chart. You can see examples using the built script under `examples/built/` in the chart's directory.

## Tests

To see unit tests for the API, navigate to `api/test` in your browser.

## Charts

#### Bubble Chart

![Bubble chart](http://factmint.com/wp-content/themes/factmint-graphs.theme/assets/img/demo/examples/bubble.png)

(See [http://factmint.com/documentation/bubble-chart/](http://factmint.com/documentation/bubble-chart/))

#### Candlestick Chart

![Candlestick chart](http://factmint.com/wp-content/themes/factmint-graphs.theme/assets/img/demo/examples/candlestick.png)

(See [http://factmint.com/documentation/candlestick-chart/](http://factmint.com/documentation/candlestick-chart/))
 
#### Choropleth (UK constituencies)

![Choropleth UK constituencies](http://factmint.com/wp-content/themes/factmint-graphs.theme/assets/img/demo/examples/choropleth.png)

(See [http://factmint.com/documentation/choropleth/](http://factmint.com/documentation/choropleth/))

#### Choropleth (world continents)

(See [http://factmint.com/documentation/world-countries-choropleth/](http://factmint.com/documentation/world-countries-choropleth/))

#### Column/Bar Chart

![Column/bar chart](http://factmint.com/wp-content/themes/factmint-graphs.theme/assets/img/demo/examples/column.png)

(See [http://factmint.com/documentation/column-bar-chart/](http://factmint.com/documentation/column-bar-chart))

#### Doughnut Chart

![Doughnut chart](http://factmint.com/wp-content/themes/factmint-graphs.theme/assets/img/demo/examples/doughnut.png)

(See [http://factmint.com/documentation/doughnut-chart/](http://factmint.com/documentation/doughnut-chart/))

#### Line Chart

![Line chart](http://factmint.com/wp-content/themes/factmint-graphs.theme/assets/img/demo/examples/line.png)

(See [http://factmint.com/documentation/line-chart/](http://factmint.com/documentation/line-chart/))

#### Line Over Bar Chart

![]()

(See [http://factmint.com/documentation/line-over-column-chart/](http://factmint.com/documentation/line-over-column-chart/))
 
#### Pictorial Bar Chart

![Pictorial bar chart](http://factmint.com/wp-content/themes/factmint-graphs.theme/assets/img/demo/examples/pictorial.png)

(See [http://factmint.com/documentation/pictorial-bar-chart/](http://factmint.com/documentation/pictorial-bar-chart/))

#### Pie Chart

![Pie chart](http://factmint.com/wp-content/themes/factmint-graphs.theme/assets/img/demo/examples/pie.png)

(See [http://factmint.com/documentation/pie-chart/](http://factmint.com/documentation/pie-chart/))

#### Scatter Graph

![Scatter graph](http://factmint.com/wp-content/themes/factmint-graphs.theme/assets/img/demo/examples/scatter.png)

(See [http://factmint.com/documentation/scatter-graph/](http://factmint.com/documentation/scatter-graph/))

#### Stacked Area Chart

![Stacked area chart](http://factmint.com/wp-content/themes/factmint-graphs.theme/assets/img/demo/examples/stacked-area.png)

(See [http://factmint.com/documentation/stacked-area-chart/](http://factmint.com/documentation/stacked-area-chart/))

#### Stacked Column Bar Chart

(See [http://factmint.com/documentation/stacked-column-bar-chart/](http://factmint.com/documentation/stacked-column-bar-chart/))

## API
The `/api` directory contains the API, which can be used to build your own chart. See [https://github.com/factmint/Charts/blob/master/api/README.md](https://github.com/factmint/Charts/blob/master/api/README.md) for more information.

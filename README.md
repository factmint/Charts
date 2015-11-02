# Factmint Charts

Factmint Charts allows you to create interactive data visualizations, which can be rendered from an HTML table or directly from JSON. For more information and live examples, see [http://factmint.com/charts-overview/](http://factmint.com/charts-overview/). This repo includes the charts as well as the API that you can use to create your own (see the `/api` directory).

## Getting started

1. Download: `bower install factmint-charts` or manually download raw CSS and JS from [the dist folder](https://github.com/factmint/Charts/tree/master/dist)

2. Create a table with a classname of `fm-[visualisation name]` and include the CSS and JS in your document.

e.g.

```
<table class="fm-pie">
	<thead>
		<tr>
			<th>Product</th>
			<th>Units sold</th>
		</tr>
	</thead>
	<tbody>
		<tr>
			<td>Ice cream</td>
			<td>1500</td>
		</tr>
		<tr>
			<td>Umbrellas</td>
			<td>6500</td>
		</tr>
		<tr>
			<td>Horse shoes</td>
			<td>4200</td>
		</tr>
	</tbody>
</table>
<link rel="stylesheet" href="pie.min.css">
<script async src="pie.min.js"></script>
```

For the two choropleths and the pie chart, you also have the option of using a Javascript object/JSON rather than an HTML table:

index.html
```
<html>
    <head>
        <title>Pie chart</title>
        
		<link rel="stylesheet" href="../../../../dist/choropleth-uk-constituencies.min.css">
		
		<script defer src="../../../../dist/choropleth-uk-constituencies.min.js"></script>
		<script defer src="main.js"></script>
	</head>
```

main.js
```
var data = [
  {
    "title": "Rowing",
    "value": 27
  },
  {
    "title": "Kayaking",
    "value": 18
  },
  {
    "title": "Cycling",
    "details": "Lorem ipsum",
    "value": 50
  }
];

window.factmint.pie(data);
```


## Building a chart

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

If you run `grunt build` from the chart's root directory, it will create or update three files in the `/dist/` directory: a minified standalone script, a minified CSS file, and a text file containing all of the available options for the given chart. You can see examples using the built script under `examples/built/` in the chart's directory.

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

![Line over bar chart](http://factmint.com/wp-content/themes/factmint-graphs.theme/assets/img/demo/examples/line-over-bar.png)

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

![Stacked column bar chart](http://factmint.com/wp-content/themes/factmint-graphs.theme/assets/img/demo/examples/stacked-column-bar.png)

(See [http://factmint.com/documentation/stacked-column-bar-chart/](http://factmint.com/documentation/stacked-column-bar-chart/))

## API
The `/api` directory contains the API, which can be used to build your own chart. See [https://github.com/factmint/Charts/blob/master/api/README.md](https://github.com/factmint/Charts/blob/master/api/README.md) for more information.

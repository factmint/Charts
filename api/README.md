# Factmint Charts

A library for building beautiful SVG data visualizations rendered from HTML tables, using a programmatic paradigm rather than a data binding approach. [SVG.js](https://github.com/wout/svg.js) is used for manipulating and animating SVG, while [Paths.js](https://github.com/andreaferretti/paths-js) is used for generating SVG paths. To learn how to begin using our API, see [Getting started](https://bitbucket.org/factmint/factmint-charts/wiki/Getting%20started).

## Components

Components are functional parts of a chart that may have multiple elements to them.

*   [Color scale key](https://bitbucket.org/factmint/factmint-charts/wiki/Components/Colour%20scale%20key) (components/color-scale-key.js)
*   [Key](https://bitbucket.org/factmint/factmint-charts/wiki/Components/Key) (components/key.js)
*   [Multi-measure tooltip](https://bitbucket.org/factmint/factmint-charts/wiki/Components/Multi-measure%20tooltip) (components/multi-measure-tooltip.js)
*   [Text area](https://bitbucket.org/factmint/factmint-charts/wiki/Components/Text%20area) (components/text-area.js)
*   [Tooltip](https://bitbucket.org/factmint/factmint-charts/wiki/Components/Tooltip) (components/tooltip.js)
*   [Two-section tooltip](https://bitbucket.org/factmint/factmint-charts/wiki/Components/Two-section%20tooltip) (components/two-section-tooltip.js)

## Extensions

Extensions use the SVG.js SVG.extend() to add extra methods that do not come with the library.

*   [Unshift](https://bitbucket.org/factmint/factmint-charts/wiki/Extensions/Group%20unshift) (extensions/G.unshift.js)

## Inventions

Inventions use the SVG.js SVG.invent() syntax to create a custom SVG element. These differ from components in that they generally consist of just a single element, such as a path or a group.

*   [Circle segment](https://bitbucket.org/factmint/factmint-charts/wiki/Inventions/Circle%20segment) (inventions/circle-segment.js)
*   [Dashed bracket](https://bitbucket.org/factmint/factmint-charts/wiki/Inventions/Dashed%20bracket) (inventions/dashed-bracket.js)
*   [Doughnut segment](https://bitbucket.org/factmint/factmint-charts/wiki/Inventions/Doughnut%20segment) (inventions/doughnut-segment.js)
*   [Flow](https://bitbucket.org/factmint/factmint-charts/wiki/Inventions/Flow) (inventions/flow.js)
*   [Tooltip background](https://bitbucket.org/factmint/factmint-charts/wiki/Inventions/Tooltip%20background) (inventions/tooltip-background.js)

## Utilities

Utilities are used for non-SVG specific functions that will help when building a visualization.

*   [Colour](https://bitbucket.org/factmint/factmint-charts/wiki/Utilities/Colour) (utilities/color.js)
*   [Configuration builder](https://bitbucket.org/factmint/factmint-charts/wiki/Utilities/Configuration%20builder) (utilities/configuration-builder.js)
*   [Geometry](https://bitbucket.org/factmint/factmint-charts/wiki/Utilities/Geometry) (utilities/geometry.js)
*   [Mapper](https://bitbucket.org/factmint/factmint-charts/wiki/Utilities/Mapper) (utilities/mapper.js)
*   [Number](https://bitbucket.org/factmint/factmint-charts/wiki/Utilities/Number) (utilities/number.js)
*   [Scale](https://bitbucket.org/factmint/factmint-charts/wiki/Utilities/Scale) (utilities/scale.js)
*   [State](https://bitbucket.org/factmint/factmint-charts/wiki/Utilities/State) (utilities/state.js)
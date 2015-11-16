/**
 * Shortcode for embedding Factmint chart
 */
add_shortcode( 'fm-chart', 'fm_chart_script' );
function fm_chart_script( $atts ) {
	$fm_text = "<link rel=\"stylesheet\" href=\"http://factmint.io/{$atts['type']}.css\"></script>" .
		"<script async src=\"http://factmint.io/{$atts['type']}.js\"></script>";
	return $fm_text;
}

require.config({
    paths: {
		// Factmint Charts API
		"scale": "../../../utilities/scale"
    }
});

require(["scale"], function(Scale) {
	var scale = Scale()
		.withIncrements(5)
		.project(new Scale().domains.RealNumbers(0, 100))
		.onto(new Scale().ranges.Linear(0, 10));
		
	console.log(scale);
	console.log(scale.map(120));
});
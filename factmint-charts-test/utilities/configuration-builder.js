define(function() {
	return function(configurations) {
		var combinedConfiguration = {};
		
		configurations.forEach(function(configuration) {
			for (var key in configuration) {
				if (configuration.hasOwnProperty(key)) combinedConfiguration[key] = configuration[key];
			}
		});
		
		return combinedConfiguration;
	};
});
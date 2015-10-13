QUnit.test( "hello test", function( assert ) {
	stop();

	assert.ok( 1 == "1", "Passed!" );

	start();
});
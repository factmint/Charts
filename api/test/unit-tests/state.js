"use strict";
require.config({
	paths: {
		"QUnit": "/node_modules/qunitjs/qunit/qunit",
		"svg-js": "/node_modules/svg.js/dist/svg",
		"State": "/api/utilities/state"
	},
	shim: {
		"QUnit": {
			exports: "QUnit",
			init: function() {
				QUnit.config.autoload = false;
				QUnit.config.autostart = false;
			}
		}
	}
});

require(["QUnit", "svg-js", "State"], function(QUnit, SVG, StateUtilities) {
	
	var stateOne = new StateUtilities.State("StateOne");
	stateOne.enter = function() {
		console.log("Entering state one");
	};
	stateOne.leave = function() {
		console.log("Leaving state one");
	};

	var stateTwo = new StateUtilities.State("StateTwo");
	stateTwo.enter = function() {
		console.log("Entering state two");
	};
	stateTwo.leave = function() {
		console.log("Leaving state two");
	};
	
	var stateMachine = new StateUtilities.StateMachine(
		stateOne,
		stateTwo
	);
	stateMachine.start();

	var stateMachineTwo = new StateUtilities.StateMachine(
		stateOne,
		stateTwo
	);
	stateMachineTwo.start("StateTwo");

	var stateMachineThree = new StateUtilities.StateMachine(
		stateOne,
		stateTwo
	);

	var stateMachineFour = new StateUtilities.StateMachine(
		stateOne,
		stateTwo
	);
	stateMachineFour.start();
	stateMachineFour.transition("StateTwo");

	var stateMachineFive = new StateUtilities.StateMachine(
		stateOne,
		stateTwo
	);
	stateMachineFive.start();

	QUnit.test("A state machine should be initialized correctly.", function() {
		QUnit.deepEqual(
			stateMachine.states,
			[
				stateOne,
				stateTwo
			],
			"A new state machine will contain an array of state objects containing each state passed through as an argument."
		);
		QUnit.equal(stateMachine.currentState, stateOne, "If no state name is provided when calling start(), it should be in the first state.");
		QUnit.equal(stateMachineTwo.currentState, stateTwo, "If a state name is provided when calling start(), it should be in the provided state.");
		QUnit.throws(function() {
				stateMachineThree.start("DoesntExist");
			},
			"An error should be thrown if start() is called with a state name that doesn't exist."
		);
	});

	QUnit.test("A state machine should transition correctly from one state to another.", function() {
		QUnit.equal(stateMachineFour.currentState, stateTwo, "After transition() has been called, the machine should be in the new state.");
		QUnit.throws(function() {
				stateMachineFour.transition("DoesntExist");
			},
			"An error should be thrown if transition() is called with a state name that doesn't exist."
		);
	});

	QUnit.test("A state machine should run enter() and leave() respectively when entering and leaving a state.", function() {
		
		var foo = null;

		var stateThree = new StateUtilities.State("StateThree");
		stateThree.leave = function() {
			foo = "bar";
		};

		var stateMachineSix = new StateUtilities.StateMachine(
			stateThree,
			stateTwo
		);
		stateMachineSix.start();

		QUnit.equal(stateMachineSix.currentState, stateThree, "After transition() has been called, the machine should be in the new state.");
		QUnit.equal(foo, null, "Our test variable is null (the test transtion hasn't been left yet).");

		stateMachineSix.transition("StateThree");

		QUnit.equal(foo, "bar", "After leaving state three, our test variable is set to 'bar'.");

	});

	QUnit.test("A state machine should correctly report its current state.", function() {
		QUnit.equal(stateMachineFive.isInState("StateOne"), true, "isInState() should return true is the machine is in a state with the provided name.");
	});

	QUnit.load();
	QUnit.start();
});
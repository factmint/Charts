/**
 * @license almond 0.3.1 Copyright (c) 2011-2014, The Dojo Foundation All Rights Reserved.
 * Available via the MIT or new BSD license.
 * see: http://github.com/jrburke/almond for details
 */
//Going sloppy to avoid 'use strict' string cost, but strict practices should
//be followed.
/*jslint sloppy: true */
/*global setTimeout: false */

var requirejs, require, define;
(function (undef) {
    var main, req, makeMap, handlers,
        defined = {},
        waiting = {},
        config = {},
        defining = {},
        hasOwn = Object.prototype.hasOwnProperty,
        aps = [].slice,
        jsSuffixRegExp = /\.js$/;

    function hasProp(obj, prop) {
        return hasOwn.call(obj, prop);
    }

    /**
     * Given a relative module name, like ./something, normalize it to
     * a real name that can be mapped to a path.
     * @param {String} name the relative name
     * @param {String} baseName a real name that the name arg is relative
     * to.
     * @returns {String} normalized name
     */
    function normalize(name, baseName) {
        var nameParts, nameSegment, mapValue, foundMap, lastIndex,
            foundI, foundStarMap, starI, i, j, part,
            baseParts = baseName && baseName.split("/"),
            map = config.map,
            starMap = (map && map['*']) || {};

        //Adjust any relative paths.
        if (name && name.charAt(0) === ".") {
            //If have a base name, try to normalize against it,
            //otherwise, assume it is a top-level require that will
            //be relative to baseUrl in the end.
            if (baseName) {
                name = name.split('/');
                lastIndex = name.length - 1;

                // Node .js allowance:
                if (config.nodeIdCompat && jsSuffixRegExp.test(name[lastIndex])) {
                    name[lastIndex] = name[lastIndex].replace(jsSuffixRegExp, '');
                }

                //Lop off the last part of baseParts, so that . matches the
                //"directory" and not name of the baseName's module. For instance,
                //baseName of "one/two/three", maps to "one/two/three.js", but we
                //want the directory, "one/two" for this normalization.
                name = baseParts.slice(0, baseParts.length - 1).concat(name);

                //start trimDots
                for (i = 0; i < name.length; i += 1) {
                    part = name[i];
                    if (part === ".") {
                        name.splice(i, 1);
                        i -= 1;
                    } else if (part === "..") {
                        if (i === 1 && (name[2] === '..' || name[0] === '..')) {
                            //End of the line. Keep at least one non-dot
                            //path segment at the front so it can be mapped
                            //correctly to disk. Otherwise, there is likely
                            //no path mapping for a path starting with '..'.
                            //This can still fail, but catches the most reasonable
                            //uses of ..
                            break;
                        } else if (i > 0) {
                            name.splice(i - 1, 2);
                            i -= 2;
                        }
                    }
                }
                //end trimDots

                name = name.join("/");
            } else if (name.indexOf('./') === 0) {
                // No baseName, so this is ID is resolved relative
                // to baseUrl, pull off the leading dot.
                name = name.substring(2);
            }
        }

        //Apply map config if available.
        if ((baseParts || starMap) && map) {
            nameParts = name.split('/');

            for (i = nameParts.length; i > 0; i -= 1) {
                nameSegment = nameParts.slice(0, i).join("/");

                if (baseParts) {
                    //Find the longest baseName segment match in the config.
                    //So, do joins on the biggest to smallest lengths of baseParts.
                    for (j = baseParts.length; j > 0; j -= 1) {
                        mapValue = map[baseParts.slice(0, j).join('/')];

                        //baseName segment has  config, find if it has one for
                        //this name.
                        if (mapValue) {
                            mapValue = mapValue[nameSegment];
                            if (mapValue) {
                                //Match, update name to the new value.
                                foundMap = mapValue;
                                foundI = i;
                                break;
                            }
                        }
                    }
                }

                if (foundMap) {
                    break;
                }

                //Check for a star map match, but just hold on to it,
                //if there is a shorter segment match later in a matching
                //config, then favor over this star map.
                if (!foundStarMap && starMap && starMap[nameSegment]) {
                    foundStarMap = starMap[nameSegment];
                    starI = i;
                }
            }

            if (!foundMap && foundStarMap) {
                foundMap = foundStarMap;
                foundI = starI;
            }

            if (foundMap) {
                nameParts.splice(0, foundI, foundMap);
                name = nameParts.join('/');
            }
        }

        return name;
    }

    function makeRequire(relName, forceSync) {
        return function () {
            //A version of a require function that passes a moduleName
            //value for items that may need to
            //look up paths relative to the moduleName
            var args = aps.call(arguments, 0);

            //If first arg is not require('string'), and there is only
            //one arg, it is the array form without a callback. Insert
            //a null so that the following concat is correct.
            if (typeof args[0] !== 'string' && args.length === 1) {
                args.push(null);
            }
            return req.apply(undef, args.concat([relName, forceSync]));
        };
    }

    function makeNormalize(relName) {
        return function (name) {
            return normalize(name, relName);
        };
    }

    function makeLoad(depName) {
        return function (value) {
            defined[depName] = value;
        };
    }

    function callDep(name) {
        if (hasProp(waiting, name)) {
            var args = waiting[name];
            delete waiting[name];
            defining[name] = true;
            main.apply(undef, args);
        }

        if (!hasProp(defined, name) && !hasProp(defining, name)) {
            throw new Error('No ' + name);
        }
        return defined[name];
    }

    //Turns a plugin!resource to [plugin, resource]
    //with the plugin being undefined if the name
    //did not have a plugin prefix.
    function splitPrefix(name) {
        var prefix,
            index = name ? name.indexOf('!') : -1;
        if (index > -1) {
            prefix = name.substring(0, index);
            name = name.substring(index + 1, name.length);
        }
        return [prefix, name];
    }

    /**
     * Makes a name map, normalizing the name, and using a plugin
     * for normalization if necessary. Grabs a ref to plugin
     * too, as an optimization.
     */
    makeMap = function (name, relName) {
        var plugin,
            parts = splitPrefix(name),
            prefix = parts[0];

        name = parts[1];

        if (prefix) {
            prefix = normalize(prefix, relName);
            plugin = callDep(prefix);
        }

        //Normalize according
        if (prefix) {
            if (plugin && plugin.normalize) {
                name = plugin.normalize(name, makeNormalize(relName));
            } else {
                name = normalize(name, relName);
            }
        } else {
            name = normalize(name, relName);
            parts = splitPrefix(name);
            prefix = parts[0];
            name = parts[1];
            if (prefix) {
                plugin = callDep(prefix);
            }
        }

        //Using ridiculous property names for space reasons
        return {
            f: prefix ? prefix + '!' + name : name, //fullName
            n: name,
            pr: prefix,
            p: plugin
        };
    };

    function makeConfig(name) {
        return function () {
            return (config && config.config && config.config[name]) || {};
        };
    }

    handlers = {
        require: function (name) {
            return makeRequire(name);
        },
        exports: function (name) {
            var e = defined[name];
            if (typeof e !== 'undefined') {
                return e;
            } else {
                return (defined[name] = {});
            }
        },
        module: function (name) {
            return {
                id: name,
                uri: '',
                exports: defined[name],
                config: makeConfig(name)
            };
        }
    };

    main = function (name, deps, callback, relName) {
        var cjsModule, depName, ret, map, i,
            args = [],
            callbackType = typeof callback,
            usingExports;

        //Use name if no relName
        relName = relName || name;

        //Call the callback to define the module, if necessary.
        if (callbackType === 'undefined' || callbackType === 'function') {
            //Pull out the defined dependencies and pass the ordered
            //values to the callback.
            //Default to [require, exports, module] if no deps
            deps = !deps.length && callback.length ? ['require', 'exports', 'module'] : deps;
            for (i = 0; i < deps.length; i += 1) {
                map = makeMap(deps[i], relName);
                depName = map.f;

                //Fast path CommonJS standard dependencies.
                if (depName === "require") {
                    args[i] = handlers.require(name);
                } else if (depName === "exports") {
                    //CommonJS module spec 1.1
                    args[i] = handlers.exports(name);
                    usingExports = true;
                } else if (depName === "module") {
                    //CommonJS module spec 1.1
                    cjsModule = args[i] = handlers.module(name);
                } else if (hasProp(defined, depName) ||
                           hasProp(waiting, depName) ||
                           hasProp(defining, depName)) {
                    args[i] = callDep(depName);
                } else if (map.p) {
                    map.p.load(map.n, makeRequire(relName, true), makeLoad(depName), {});
                    args[i] = defined[depName];
                } else {
                    throw new Error(name + ' missing ' + depName);
                }
            }

            ret = callback ? callback.apply(defined[name], args) : undefined;

            if (name) {
                //If setting exports via "module" is in play,
                //favor that over return value and exports. After that,
                //favor a non-undefined return value over exports use.
                if (cjsModule && cjsModule.exports !== undef &&
                        cjsModule.exports !== defined[name]) {
                    defined[name] = cjsModule.exports;
                } else if (ret !== undef || !usingExports) {
                    //Use the return value from the function.
                    defined[name] = ret;
                }
            }
        } else if (name) {
            //May just be an object definition for the module. Only
            //worry about defining if have a module name.
            defined[name] = callback;
        }
    };

    requirejs = require = req = function (deps, callback, relName, forceSync, alt) {
        if (typeof deps === "string") {
            if (handlers[deps]) {
                //callback in this case is really relName
                return handlers[deps](callback);
            }
            //Just return the module wanted. In this scenario, the
            //deps arg is the module name, and second arg (if passed)
            //is just the relName.
            //Normalize module name, if it contains . or ..
            return callDep(makeMap(deps, callback).f);
        } else if (!deps.splice) {
            //deps is a config object, not an array.
            config = deps;
            if (config.deps) {
                req(config.deps, config.callback);
            }
            if (!callback) {
                return;
            }

            if (callback.splice) {
                //callback is an array, which means it is a dependency list.
                //Adjust args if there are dependencies
                deps = callback;
                callback = relName;
                relName = null;
            } else {
                deps = undef;
            }
        }

        //Support require(['a'])
        callback = callback || function () {};

        //If relName is a function, it is an errback handler,
        //so remove it.
        if (typeof relName === 'function') {
            relName = forceSync;
            forceSync = alt;
        }

        //Simulate async callback;
        if (forceSync) {
            main(undef, deps, callback, relName);
        } else {
            //Using a non-zero value because of concern for what old browsers
            //do, and latest browsers "upgrade" to 4 if lower value is used:
            //http://www.whatwg.org/specs/web-apps/current-work/multipage/timers.html#dom-windowtimers-settimeout:
            //If want a value immediately, use require('id') instead -- something
            //that works in almond on the global level, but not guaranteed and
            //unlikely to work in other AMD implementations.
            setTimeout(function () {
                main(undef, deps, callback, relName);
            }, 4);
        }

        return req;
    };

    /**
     * Just drops the config on the floor, but returns req in case
     * the config return value is used.
     */
    req.config = function (cfg) {
        return req(cfg);
    };

    /**
     * Expose module registry for debugging and tooling
     */
    requirejs._defined = defined;

    define = function (name, deps, callback) {
        if (typeof name !== 'string') {
            throw new Error('See almond README: incorrect module build, no module name');
        }

        //This module may not have dependencies
        if (!deps.splice) {
            //deps is not an array, so probably means
            //an object literal or factory function for
            //the value. Adjust args.
            callback = deps;
            deps = [];
        }

        if (!hasProp(defined, name) && !hasProp(waiting, name)) {
            waiting[name] = [name, deps, callback];
        }
    };

    define.amd = {
        jQuery: true
    };
}());

define("almond", function(){});

define('color',[],function() {
	return {
		colorWheelClasses: [
			'fm-datum-color-wheel-a',
			'fm-datum-color-wheel-b',
			'fm-datum-color-wheel-c',
			'fm-datum-color-wheel-d',
			'fm-datum-color-wheel-e',
			'fm-datum-color-wheel-f',
			'fm-datum-color-wheel-g',
			'fm-datum-color-wheel-h',
			'fm-datum-color-wheel-i',
			'fm-datum-color-wheel-j',
			'fm-datum-color-wheel-k',
			'fm-datum-color-wheel-l'
		],
		overflowClass: 'fm-datum-color-overflow',
		pad: function(number) {
			if (number.length < 2) {
				return "0" + number;
			} else {
				return number;
			}
		},
		contrasting: function(colors) {
			throw "Not yet implemented";
		},
		registerTint1Filter: function() {
			throw "Not yet implemented";
		},
		registerTint2Filter: function() {
			throw "Not yet implemented";
		},
		lowContrast: function (outputSize, offset) {
			offset = (typeof offset === 'undefined') ? 0 : offset;
			if (outputSize + offset > this.colorWheelClasses.length) {
				var result = [];
				for (var colorClassIndex = 0; colorClassIndex < outputSize; colorClassIndex++) {
					if (colorClassIndex < this.colorWheelClasses.length) {
						result.push(this.colorWheelClasses[colorClassIndex]);
					} else {
						result.push(this.colorWheelClasses[this.colorWheelClasses.length - colorClassIndex]);
					}
				}
				return result;
			} else {
				return this.colorWheelClasses.splice(offset, outputSize);
			}
		},
		monochromatic: function (color, outputSize, darken) {
			throw "Not yet implemented";
		},
		harmonious: function (numberberOfColors) {
		
			var size = Math.min(numberberOfColors, this.colorWheelClasses.length);

			var colorIndices = [];
			
			var halfWheel = Math.floor(this.colorWheelClasses.length / 2);

			var doesWheelIncludeNorthAndSouth = function() {
				return (this.colorWheelClasses.length % 4 == 0);
			}.bind(this);

			function wheelFitsTetrad(seperationBetweenTetradCorners) {
				return (seperationBetweenTetradCorners <= halfWheel - 2);
			}
				
			var addTetrad = function(start, seperationBetweenTetradCorners) {
				start = (start + this.colorWheelClasses.length) % this.colorWheelClasses.length;
				
				var colorIndexOffset = Math.floor(colorIndices.length / 4) + 1;
					
				if (colorIndices.length < size) {
					var corner1 = start;
					colorIndices.splice(1 * colorIndexOffset - 1, 0, corner1);
				}

				if (colorIndices.length < size) {
					var corner2 = (start + seperationBetweenTetradCorners + 1) % this.colorWheelClasses.length;
					colorIndices.splice(2 * colorIndexOffset - 1, 0, corner2);
				}

				if (colorIndices.length < size) {
					var corner3 = (start + halfWheel) % this.colorWheelClasses.length;
					colorIndices.splice(3 * colorIndexOffset - 1, 0, corner3);
				}

				if (colorIndices.length < size) {
					var corner4 = (start + seperationBetweenTetradCorners + 1 + halfWheel) % this.colorWheelClasses.length;
					colorIndices.splice(4 * colorIndexOffset - 1, 0, corner4);
				}
			}.bind(this);
				
			var addPoint = function(point, position) {
				point = (point + this.colorWheelClasses.length) % this.colorWheelClasses.length;
				colorIndices.splice(position, 0, point);
			}.bind(this);
			
			// This loops through neighbouring tetrads
			for (
				var seperationBetweenTetradCorners = 1, firstTetradCorner = 0;
				wheelFitsTetrad(seperationBetweenTetradCorners);
				seperationBetweenTetradCorners += 2, firstTetradCorner--
			) {
				addTetrad(firstTetradCorner, seperationBetweenTetradCorners);
			}
			
			var colorIndexOffset = colorIndices.length / 4;
			// 9 o'clock
			if (colorIndices.length < size) {
				addPoint(1, colorIndexOffset);
			}
			// 3 o'clock
			if (colorIndices.length < size) {
				addPoint(1 + halfWheel, colorIndexOffset * 3 + 1);
			}
			
			if (doesWheelIncludeNorthAndSouth()) {
				// 12 o'clock
				if (colorIndices.length < size) {
					addPoint(1 + halfWheel / 2, colorIndexOffset * 2 + 1);
				}
				// 6 o'clock
				if (colorIndices.length < size) {
					addPoint(1 + halfWheel * 3/2, colorIndexOffset * 4 + 3);
				}
			}
			
			var colors = [];
			for (var x = 0; x < numberberOfColors; x++) {
				colors.push(this.colorWheelClasses[colorIndices[x % size]]);
			}
				
			return colors;
		}
	}
});
/* svg.js 1.0.1-3-g6b0c1d2 - svg selector inventor polyfill regex default color array pointarray patharray number viewbox bbox rbox element parent container fx relative event defs group arrange mask clip gradient pattern doc shape symbol use rect ellipse line poly path image text textpath nested hyperlink marker sugar set data memory loader helpers - svgjs.com/license */
;(function(root, factory) {
  if (typeof define === 'function' && define.amd) {
    define('svg-js',factory);
  } else if (typeof exports === 'object') {
    module.exports = factory();
  } else {
    root.SVG = factory();
  }
}(this, function() {

  var SVG = this.SVG = function(element) {
    if (SVG.supported) {
      element = new SVG.Doc(element)

      if (!SVG.parser)
        SVG.prepare(element)

      return element
    }
  }

  // Default namespaces
  SVG.ns    = 'http://www.w3.org/2000/svg'
  SVG.xmlns = 'http://www.w3.org/2000/xmlns/'
  SVG.xlink = 'http://www.w3.org/1999/xlink'

  // Element id sequence
  SVG.did  = 1000

  // Get next named element id
  SVG.eid = function(name) {
    return 'Svgjs' + name.charAt(0).toUpperCase() + name.slice(1) + (SVG.did++)
  }

  // Method for element creation
  SVG.create = function(name) {
    /* create element */
    var element = document.createElementNS(this.ns, name)

    /* apply unique id */
    element.setAttribute('id', this.eid(name))

    return element
  }

  // Method for extending objects
  SVG.extend = function() {
    var modules, methods, key, i

    /* get list of modules */
    modules = [].slice.call(arguments)

    /* get object with extensions */
    methods = modules.pop()

    for (i = modules.length - 1; i >= 0; i--)
      if (modules[i])
        for (key in methods)
          modules[i].prototype[key] = methods[key]

    /* make sure SVG.Set inherits any newly added methods */
    if (SVG.Set && SVG.Set.inherit)
      SVG.Set.inherit()
  }

  // Initialize parsing element
  SVG.prepare = function(element) {
    /* select document body and create invisible svg element */
    var body = document.getElementsByTagName('body')[0]
      , draw = (body ? new SVG.Doc(body) : element.nested()).size(2, 0)
      , path = SVG.create('path')

    /* insert parsers */
    draw.node.appendChild(path)

    /* create parser object */
    SVG.parser = {
      body: body || element.parent
    , draw: draw.style('opacity:0;position:fixed;left:100%;top:100%;overflow:hidden')
    , poly: draw.polyline().node
    , path: path
    }
  }

  // svg support test
  SVG.supported = (function() {
    return !! document.createElementNS &&
           !! document.createElementNS(SVG.ns,'svg').createSVGRect
  })()

  if (!SVG.supported) return false


  SVG.get = function(id) {
    var node = document.getElementById(idFromReference(id) || id)
    if (node) return node.instance
  }

  SVG.invent = function(config) {
  	/* create element initializer */
  	var initializer = typeof config.create == 'function' ?
  		config.create :
  		function() {
  			this.constructor.call(this, SVG.create(config.create))
  		}

  	/* inherit prototype */
  	if (config.inherit)
  		initializer.prototype = new config.inherit

  	/* extend with methods */
  	if (config.extend)
  		SVG.extend(initializer, config.extend)

  	/* attach construct method to parent */
  	if (config.construct)
  		SVG.extend(config.parent || SVG.Container, config.construct)

  	return initializer
  }

  if (typeof CustomEvent !== 'function') {
    // Code from: https://developer.mozilla.org/en-US/docs/Web/API/CustomEvent
    function CustomEvent (event, options) {
      options = options || { bubbles: false, cancelable: false, detail: undefined }
      var e = document.createEvent('CustomEvent')
      e.initCustomEvent(event, options.bubbles, options.cancelable, options.detail)
      return e
    }

    CustomEvent.prototype = window.Event.prototype

    window.CustomEvent = CustomEvent
  }

  SVG.regex = {
    /* parse unit value */
    unit:         /^(-?[\d\.]+)([a-z%]{0,2})$/

    /* parse hex value */
  , hex:          /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i

    /* parse rgb value */
  , rgb:          /rgb\((\d+),(\d+),(\d+)\)/

    /* parse reference id */
  , reference:    /#([a-z0-9\-_]+)/i

    /* test hex value */
  , isHex:        /^#[a-f0-9]{3,6}$/i

    /* test rgb value */
  , isRgb:        /^rgb\(/

    /* test css declaration */
  , isCss:        /[^:]+:[^;]+;?/

    /* test for blank string */
  , isBlank:      /^(\s+)?$/

    /* test for numeric string */
  , isNumber:     /^-?[\d\.]+$/

    /* test for percent value */
  , isPercent:    /^-?[\d\.]+%$/

    /* test for image url */
  , isImage:      /\.(jpg|jpeg|png|gif)(\?[^=]+.*)?/i

    /* test for namespaced event */
  , isEvent:      /^[\w]+:[\w]+$/

  }

  SVG.defaults = {
    // Default matrix
    matrix:       '1 0 0 1 0 0'

    // Default attribute values
  , attrs: {
      /* fill and stroke */
      'fill-opacity':     1
    , 'stroke-opacity':   1
    , 'stroke-width':     0
    , 'stroke-linejoin':  'miter'
    , 'stroke-linecap':   'butt'
    , fill:               '#000000'
    , stroke:             '#000000'
    , opacity:            1
      /* position */
    , x:                  0
    , y:                  0
    , cx:                 0
    , cy:                 0
      /* size */
    , width:              0
    , height:             0
      /* radius */
    , r:                  0
    , rx:                 0
    , ry:                 0
      /* gradient */
    , offset:             0
    , 'stop-opacity':     1
    , 'stop-color':       '#000000'
      /* text */
    , 'font-size':        16
    , 'font-family':      'Helvetica, Arial, sans-serif'
    , 'text-anchor':      'start'
    }

    // Default transformation values
  , trans: function() {
      return {
        /* translate */
        x:        0
      , y:        0
        /* scale */
      , scaleX:   1
      , scaleY:   1
        /* rotate */
      , rotation: 0
        /* skew */
      , skewX:    0
      , skewY:    0
        /* matrix */
      , matrix:   this.matrix
      , a:        1
      , b:        0
      , c:        0
      , d:        1
      , e:        0
      , f:        0
      }
    }

  }

  SVG.Color = function(color) {
    var match

    /* initialize defaults */
    this.r = 0
    this.g = 0
    this.b = 0

    /* parse color */
    if (typeof color === 'string') {
      if (SVG.regex.isRgb.test(color)) {
        /* get rgb values */
        match = SVG.regex.rgb.exec(color.replace(/\s/g,''))

        /* parse numeric values */
        this.r = parseInt(match[1])
        this.g = parseInt(match[2])
        this.b = parseInt(match[3])

      } else if (SVG.regex.isHex.test(color)) {
        /* get hex values */
        match = SVG.regex.hex.exec(fullHex(color))

        /* parse numeric values */
        this.r = parseInt(match[1], 16)
        this.g = parseInt(match[2], 16)
        this.b = parseInt(match[3], 16)

      }

    } else if (typeof color === 'object') {
      this.r = color.r
      this.g = color.g
      this.b = color.b

    }

  }

  SVG.extend(SVG.Color, {
    // Default to hex conversion
    toString: function() {
      return this.toHex()
    }
    // Build hex value
  , toHex: function() {
      return '#'
        + compToHex(this.r)
        + compToHex(this.g)
        + compToHex(this.b)
    }
    // Build rgb value
  , toRgb: function() {
      return 'rgb(' + [this.r, this.g, this.b].join() + ')'
    }
    // Calculate true brightness
  , brightness: function() {
      return (this.r / 255 * 0.30)
           + (this.g / 255 * 0.59)
           + (this.b / 255 * 0.11)
    }
    // Make color morphable
  , morph: function(color) {
      this.destination = new SVG.Color(color)

      return this
    }
    // Get morphed color at given position
  , at: function(pos) {
      /* make sure a destination is defined */
      if (!this.destination) return this

      /* normalise pos */
      pos = pos < 0 ? 0 : pos > 1 ? 1 : pos

      /* generate morphed color */
      return new SVG.Color({
        r: ~~(this.r + (this.destination.r - this.r) * pos)
      , g: ~~(this.g + (this.destination.g - this.g) * pos)
      , b: ~~(this.b + (this.destination.b - this.b) * pos)
      })
    }

  })

  // Testers

  // Test if given value is a color string
  SVG.Color.test = function(color) {
    color += ''
    return SVG.regex.isHex.test(color)
        || SVG.regex.isRgb.test(color)
  }

  // Test if given value is a rgb object
  SVG.Color.isRgb = function(color) {
    return color && typeof color.r == 'number'
                 && typeof color.g == 'number'
                 && typeof color.b == 'number'
  }

  // Test if given value is a color
  SVG.Color.isColor = function(color) {
    return SVG.Color.isRgb(color) || SVG.Color.test(color)
  }

  SVG.Array = function(array, fallback) {
    array = (array || []).valueOf()

    /* if array is empty and fallback is provided, use fallback */
    if (array.length == 0 && fallback)
      array = fallback.valueOf()

    /* parse array */
    this.value = this.parse(array)
  }

  SVG.extend(SVG.Array, {
    // Make array morphable
    morph: function(array) {
      this.destination = this.parse(array)

      /* normalize length of arrays */
      if (this.value.length != this.destination.length) {
        var lastValue       = this.value[this.value.length - 1]
          , lastDestination = this.destination[this.destination.length - 1]

        while(this.value.length > this.destination.length)
          this.destination.push(lastDestination)
        while(this.value.length < this.destination.length)
          this.value.push(lastValue)
      }

      return this
    }
    // Clean up any duplicate points
  , settle: function() {
      /* find all unique values */
      for (var i = 0, il = this.value.length, seen = []; i < il; i++)
        if (seen.indexOf(this.value[i]) == -1)
          seen.push(this.value[i])

      /* set new value */
      return this.value = seen
    }
    // Get morphed array at given position
  , at: function(pos) {
      /* make sure a destination is defined */
      if (!this.destination) return this

      /* generate morphed array */
      for (var i = 0, il = this.value.length, array = []; i < il; i++)
        array.push(this.value[i] + (this.destination[i] - this.value[i]) * pos)

      return new SVG.Array(array)
    }
    // Convert array to string
  , toString: function() {
      return this.value.join(' ')
    }
    // Real value
  , valueOf: function() {
      return this.value
    }
    // Parse whitespace separated string
  , parse: function(array) {
      array = array.valueOf()

      /* if already is an array, no need to parse it */
      if (Array.isArray(array)) return array

      return this.split(array)
    }
    // Strip unnecessary whitespace
  , split: function(string) {
      return string.replace(/\s+/g, ' ').replace(/^\s+|\s+$/g,'').split(' ')
    }
    // Reverse array
  , reverse: function() {
      this.value.reverse()

      return this
    }

  })



  SVG.PointArray = function() {
    this.constructor.apply(this, arguments)
  }

  // Inherit from SVG.Array
  SVG.PointArray.prototype = new SVG.Array

  SVG.extend(SVG.PointArray, {
    // Convert array to string
    toString: function() {
      /* convert to a poly point string */
      for (var i = 0, il = this.value.length, array = []; i < il; i++)
        array.push(this.value[i].join(','))

      return array.join(' ')
    }
    // Get morphed array at given position
  , at: function(pos) {
      /* make sure a destination is defined */
      if (!this.destination) return this

      /* generate morphed point string */
      for (var i = 0, il = this.value.length, array = []; i < il; i++)
        array.push([
          this.value[i][0] + (this.destination[i][0] - this.value[i][0]) * pos
        , this.value[i][1] + (this.destination[i][1] - this.value[i][1]) * pos
        ])

      return new SVG.PointArray(array)
    }
    // Parse point string
  , parse: function(array) {
      array = array.valueOf()

      /* if already is an array, no need to parse it */
      if (Array.isArray(array)) return array

      /* split points */
      array = this.split(array)

      /* parse points */
      for (var i = 0, il = array.length, p, points = []; i < il; i++) {
        p = array[i].split(',')
        points.push([parseFloat(p[0]), parseFloat(p[1])])
      }

      return points
    }
    // Move point string
  , move: function(x, y) {
      var box = this.bbox()

      /* get relative offset */
      x -= box.x
      y -= box.y

      /* move every point */
      if (!isNaN(x) && !isNaN(y))
        for (var i = this.value.length - 1; i >= 0; i--)
          this.value[i] = [this.value[i][0] + x, this.value[i][1] + y]

      return this
    }
    // Resize poly string
  , size: function(width, height) {
      var i, box = this.bbox()

      /* recalculate position of all points according to new size */
      for (i = this.value.length - 1; i >= 0; i--) {
        this.value[i][0] = ((this.value[i][0] - box.x) * width)  / box.width  + box.x
        this.value[i][1] = ((this.value[i][1] - box.y) * height) / box.height + box.y
      }

      return this
    }
    // Get bounding box of points
  , bbox: function() {
      SVG.parser.poly.setAttribute('points', this.toString())

      return SVG.parser.poly.getBBox()
    }

  })

  SVG.PathArray = function(array, fallback) {
    this.constructor.call(this, array, fallback)
  }

  // Inherit from SVG.Array
  SVG.PathArray.prototype = new SVG.Array

  SVG.extend(SVG.PathArray, {
    // Convert array to string
    toString: function() {
      return arrayToString(this.value)
    }
    // Move path string
  , move: function(x, y) {
  		/* get bounding box of current situation */
  		var box = this.bbox()

      /* get relative offset */
      x -= box.x
      y -= box.y

      if (!isNaN(x) && !isNaN(y)) {
        /* move every point */
        for (var l, i = this.value.length - 1; i >= 0; i--) {
          l = this.value[i][0]

          if (l == 'M' || l == 'L' || l == 'T')  {
            this.value[i][1] += x
            this.value[i][2] += y

          } else if (l == 'H')  {
            this.value[i][1] += x

          } else if (l == 'V')  {
            this.value[i][1] += y

          } else if (l == 'C' || l == 'S' || l == 'Q')  {
            this.value[i][1] += x
            this.value[i][2] += y
            this.value[i][3] += x
            this.value[i][4] += y

            if (l == 'C')  {
              this.value[i][5] += x
              this.value[i][6] += y
            }

          } else if (l == 'A')  {
            this.value[i][6] += x
            this.value[i][7] += y
          }

        }
      }

      return this
    }
    // Resize path string
  , size: function(width, height) {
  		/* get bounding box of current situation */
  		var i, l, box = this.bbox()

      /* recalculate position of all points according to new size */
      for (i = this.value.length - 1; i >= 0; i--) {
        l = this.value[i][0]

        if (l == 'M' || l == 'L' || l == 'T')  {
          this.value[i][1] = ((this.value[i][1] - box.x) * width)  / box.width  + box.x
          this.value[i][2] = ((this.value[i][2] - box.y) * height) / box.height + box.y

        } else if (l == 'H')  {
          this.value[i][1] = ((this.value[i][1] - box.x) * width)  / box.width  + box.x

        } else if (l == 'V')  {
          this.value[i][1] = ((this.value[i][1] - box.y) * height) / box.height + box.y

        } else if (l == 'C' || l == 'S' || l == 'Q')  {
          this.value[i][1] = ((this.value[i][1] - box.x) * width)  / box.width  + box.x
          this.value[i][2] = ((this.value[i][2] - box.y) * height) / box.height + box.y
          this.value[i][3] = ((this.value[i][3] - box.x) * width)  / box.width  + box.x
          this.value[i][4] = ((this.value[i][4] - box.y) * height) / box.height + box.y

          if (l == 'C')  {
            this.value[i][5] = ((this.value[i][5] - box.x) * width)  / box.width  + box.x
            this.value[i][6] = ((this.value[i][6] - box.y) * height) / box.height + box.y
          }

        } else if (l == 'A')  {
          /* resize radii */
          this.value[i][1] = (this.value[i][1] * width)  / box.width
          this.value[i][2] = (this.value[i][2] * height) / box.height

          /* move position values */
          this.value[i][6] = ((this.value[i][6] - box.x) * width)  / box.width  + box.x
          this.value[i][7] = ((this.value[i][7] - box.y) * height) / box.height + box.y
        }

      }

      return this
    }
    // Absolutize and parse path to array
  , parse: function(array) {
      /* if it's already is a patharray, no need to parse it */
      if (array instanceof SVG.PathArray) return array.valueOf()

      /* prepare for parsing */
      var i, il, x0, y0, x1, y1, x2, y2, s, seg, segs
        , x = 0
        , y = 0

      /* populate working path */
      SVG.parser.path.setAttribute('d', typeof array === 'string' ? array : arrayToString(array))

      /* get segments */
      segs = SVG.parser.path.pathSegList

      for (i = 0, il = segs.numberOfItems; i < il; ++i) {
        seg = segs.getItem(i)
        s = seg.pathSegTypeAsLetter

        /* yes, this IS quite verbose but also about 30 times faster than .test() with a precompiled regex */
        if (s == 'M' || s == 'L' || s == 'H' || s == 'V' || s == 'C' || s == 'S' || s == 'Q' || s == 'T' || s == 'A') {
          if ('x' in seg) x = seg.x
          if ('y' in seg) y = seg.y

        } else {
          if ('x1' in seg) x1 = x + seg.x1
          if ('x2' in seg) x2 = x + seg.x2
          if ('y1' in seg) y1 = y + seg.y1
          if ('y2' in seg) y2 = y + seg.y2
          if ('x'  in seg) x += seg.x
          if ('y'  in seg) y += seg.y

          if (s == 'm')
            segs.replaceItem(SVG.parser.path.createSVGPathSegMovetoAbs(x, y), i)
          else if (s == 'l')
            segs.replaceItem(SVG.parser.path.createSVGPathSegLinetoAbs(x, y), i)
          else if (s == 'h')
            segs.replaceItem(SVG.parser.path.createSVGPathSegLinetoHorizontalAbs(x), i)
          else if (s == 'v')
            segs.replaceItem(SVG.parser.path.createSVGPathSegLinetoVerticalAbs(y), i)
          else if (s == 'c')
            segs.replaceItem(SVG.parser.path.createSVGPathSegCurvetoCubicAbs(x, y, x1, y1, x2, y2), i)
          else if (s == 's')
            segs.replaceItem(SVG.parser.path.createSVGPathSegCurvetoCubicSmoothAbs(x, y, x2, y2), i)
          else if (s == 'q')
            segs.replaceItem(SVG.parser.path.createSVGPathSegCurvetoQuadraticAbs(x, y, x1, y1), i)
          else if (s == 't')
            segs.replaceItem(SVG.parser.path.createSVGPathSegCurvetoQuadraticSmoothAbs(x, y), i)
          else if (s == 'a')
            segs.replaceItem(SVG.parser.path.createSVGPathSegArcAbs(x, y, seg.r1, seg.r2, seg.angle, seg.largeArcFlag, seg.sweepFlag), i)
          else if (s == 'z' || s == 'Z') {
            x = x0
            y = y0
          }
        }

        /* record the start of a subpath */
        if (s == 'M' || s == 'm') {
          x0 = x
          y0 = y
        }
      }

      /* build internal representation */
      array = []
      segs  = SVG.parser.path.pathSegList

      for (i = 0, il = segs.numberOfItems; i < il; ++i) {
        seg = segs.getItem(i)
        s = seg.pathSegTypeAsLetter
        x = [s]

        if (s == 'M' || s == 'L' || s == 'T')
          x.push(seg.x, seg.y)
        else if (s == 'H')
          x.push(seg.x)
        else if (s == 'V')
          x.push(seg.y)
        else if (s == 'C')
          x.push(seg.x1, seg.y1, seg.x2, seg.y2, seg.x, seg.y)
        else if (s == 'S')
          x.push(seg.x2, seg.y2, seg.x, seg.y)
        else if (s == 'Q')
          x.push(seg.x1, seg.y1, seg.x, seg.y)
        else if (s == 'A')
          x.push(seg.r1, seg.r2, seg.angle, seg.largeArcFlag|0, seg.sweepFlag|0, seg.x, seg.y)

        /* store segment */
        array.push(x)
      }

      return array
    }
    // Get bounding box of path
  , bbox: function() {
      SVG.parser.path.setAttribute('d', this.toString())

      return SVG.parser.path.getBBox()
    }

  })

  SVG.Number = function(value) {

    /* initialize defaults */
    this.value = 0
    this.unit = ''

    /* parse value */
    if (typeof value === 'number') {
      /* ensure a valid numeric value */
      this.value = isNaN(value) ? 0 : !isFinite(value) ? (value < 0 ? -3.4e+38 : +3.4e+38) : value

    } else if (typeof value === 'string') {
      var match = value.match(SVG.regex.unit)

      if (match) {
        /* make value numeric */
        this.value = parseFloat(match[1])

        /* normalize percent value */
        if (match[2] == '%')
          this.value /= 100
        else if (match[2] == 's')
          this.value *= 1000

        /* store unit */
        this.unit = match[2]
      }

    } else {
      if (value instanceof SVG.Number) {
        this.value = value.value
        this.unit  = value.unit
      }
    }

  }

  SVG.extend(SVG.Number, {
    // Stringalize
    toString: function() {
      return (
        this.unit == '%' ?
          ~~(this.value * 1e8) / 1e6:
        this.unit == 's' ?
          this.value / 1e3 :
          this.value
      ) + this.unit
    }
  , // Convert to primitive
    valueOf: function() {
      return this.value
    }
    // Add number
  , plus: function(number) {
      this.value = this + new SVG.Number(number)

      return this
    }
    // Subtract number
  , minus: function(number) {
      return this.plus(-new SVG.Number(number))
    }
    // Multiply number
  , times: function(number) {
      this.value = this * new SVG.Number(number)

      return this
    }
    // Divide number
  , divide: function(number) {
      this.value = this / new SVG.Number(number)

      return this
    }
    // Convert to different unit
  , to: function(unit) {
      if (typeof unit === 'string')
        this.unit = unit

      return this
    }
    // Make number morphable
  , morph: function(number) {
      this.destination = new SVG.Number(number)

      return this
    }
    // Get morphed number at given position
  , at: function(pos) {
      /* make sure a destination is defined */
      if (!this.destination) return this

      /* generate new morphed number */
      return new SVG.Number(this.destination)
          .minus(this)
          .times(pos)
          .plus(this)
    }

  })

  SVG.ViewBox = function(element) {
    var x, y, width, height
      , wm   = 1 /* width multiplier */
      , hm   = 1 /* height multiplier */
      , box  = element.bbox()
      , view = (element.attr('viewBox') || '').match(/-?[\d\.]+/g)
      , we   = element
      , he   = element

    /* get dimensions of current node */
    width  = new SVG.Number(element.width())
    height = new SVG.Number(element.height())

    /* find nearest non-percentual dimensions */
    while (width.unit == '%') {
      wm *= width.value
      width = new SVG.Number(we instanceof SVG.Doc ? we.parent.offsetWidth : we.parent.width())
      we = we.parent
    }
    while (height.unit == '%') {
      hm *= height.value
      height = new SVG.Number(he instanceof SVG.Doc ? he.parent.offsetHeight : he.parent.height())
      he = he.parent
    }

    /* ensure defaults */
    this.x      = box.x
    this.y      = box.y
    this.width  = width  * wm
    this.height = height * hm
    this.zoom   = 1

    if (view) {
      /* get width and height from viewbox */
      x      = parseFloat(view[0])
      y      = parseFloat(view[1])
      width  = parseFloat(view[2])
      height = parseFloat(view[3])

      /* calculate zoom accoring to viewbox */
      this.zoom = ((this.width / this.height) > (width / height)) ?
        this.height / height :
        this.width  / width

      /* calculate real pixel dimensions on parent SVG.Doc element */
      this.x      = x
      this.y      = y
      this.width  = width
      this.height = height

    }

  }

  //
  SVG.extend(SVG.ViewBox, {
    // Parse viewbox to string
    toString: function() {
      return this.x + ' ' + this.y + ' ' + this.width + ' ' + this.height
    }

  })

  SVG.BBox = function(element) {
    var box

    /* initialize zero box */
    this.x      = 0
    this.y      = 0
    this.width  = 0
    this.height = 0

    /* get values if element is given */
    if (element) {
      try {
        /* actual, native bounding box */
        box = element.node.getBBox()
      } catch(e) {
        /* fallback for some browsers */
        box = {
          x:      element.node.clientLeft
        , y:      element.node.clientTop
        , width:  element.node.clientWidth
        , height: element.node.clientHeight
        }
      }

      /* include translations on x an y */
      this.x = box.x + element.trans.x
      this.y = box.y + element.trans.y

      /* plain width and height */
      this.width  = box.width  * element.trans.scaleX
      this.height = box.height * element.trans.scaleY
    }

    /* add center, right and bottom */
    boxProperties(this)

  }

  //
  SVG.extend(SVG.BBox, {
    // merge bounding box with another, return a new instance
    merge: function(box) {
      var b = new SVG.BBox()

      /* merge box */
      b.x      = Math.min(this.x, box.x)
      b.y      = Math.min(this.y, box.y)
      b.width  = Math.max(this.x + this.width,  box.x + box.width)  - b.x
      b.height = Math.max(this.y + this.height, box.y + box.height) - b.y

      /* add center, right and bottom */
      boxProperties(b)

      return b
    }

  })

  SVG.RBox = function(element) {
    var e, zoom
      , box = {}

    /* initialize zero box */
    this.x      = 0
    this.y      = 0
    this.width  = 0
    this.height = 0

    if (element) {
      e = element.doc().parent
      zoom = element.doc().viewbox().zoom

      /* actual, native bounding box */
      box = element.node.getBoundingClientRect()

      /* get screen offset */
      this.x = box.left
      this.y = box.top

      /* subtract parent offset */
      this.x -= e.offsetLeft
      this.y -= e.offsetTop

      while (e = e.offsetParent) {
        this.x -= e.offsetLeft
        this.y -= e.offsetTop
      }

      /* calculate cumulative zoom from svg documents */
      e = element
      while (e = e.parent) {
        if (e.type == 'svg' && e.viewbox) {
          zoom *= e.viewbox().zoom
          this.x -= e.x() || 0
          this.y -= e.y() || 0
        }
      }
    }

    /* recalculate viewbox distortion */
    this.x /= zoom
    this.y /= zoom
    this.width  = box.width  /= zoom
    this.height = box.height /= zoom

    /* offset by window scroll position, because getBoundingClientRect changes when window is scrolled */
    this.x += typeof window.scrollX === 'number' ? window.scrollX : window.pageXOffset
    this.y += typeof window.scrollY === 'number' ? window.scrollY : window.pageYOffset

    /* add center, right and bottom */
    boxProperties(this)

  }

  //
  SVG.extend(SVG.RBox, {
    // merge rect box with another, return a new instance
    merge: function(box) {
      var b = new SVG.RBox()

      /* merge box */
      b.x      = Math.min(this.x, box.x)
      b.y      = Math.min(this.y, box.y)
      b.width  = Math.max(this.x + this.width,  box.x + box.width)  - b.x
      b.height = Math.max(this.y + this.height, box.y + box.height) - b.y

      /* add center, right and bottom */
      boxProperties(b)

      return b
    }

  })


  SVG.Element = SVG.invent({
    // Initialize node
    create: function(node) {
      /* make stroke value accessible dynamically */
      this._stroke = SVG.defaults.attrs.stroke

      /* initialize transformation store with defaults */
      this.trans = SVG.defaults.trans()

      /* create circular reference */
      if (this.node = node) {
        this.type = node.nodeName
        this.node.instance = this
      }
    }

    // Add class methods
  , extend: {
      // Move over x-axis
      x: function(x) {
        if (x != null) {
          x = new SVG.Number(x)
          x.value /= this.trans.scaleX
        }
        return this.attr('x', x)
      }
      // Move over y-axis
    , y: function(y) {
        if (y != null) {
          y = new SVG.Number(y)
          y.value /= this.trans.scaleY
        }
        return this.attr('y', y)
      }
      // Move by center over x-axis
    , cx: function(x) {
        return x == null ? this.x() + this.width() / 2 : this.x(x - this.width() / 2)
      }
      // Move by center over y-axis
    , cy: function(y) {
        return y == null ? this.y() + this.height() / 2 : this.y(y - this.height() / 2)
      }
      // Move element to given x and y values
    , move: function(x, y) {
        return this.x(x).y(y)
      }
      // Move element by its center
    , center: function(x, y) {
        return this.cx(x).cy(y)
      }
      // Set width of element
    , width: function(width) {
        return this.attr('width', width)
      }
      // Set height of element
    , height: function(height) {
        return this.attr('height', height)
      }
      // Set element size to given width and height
    , size: function(width, height) {
        var p = proportionalSize(this.bbox(), width, height)

        return this
          .width(new SVG.Number(p.width))
          .height(new SVG.Number(p.height))
      }
      // Clone element
    , clone: function() {
        var clone , attr
          , type = this.type

        /* invoke shape method with shape-specific arguments */
        clone = type == 'rect' || type == 'ellipse' ?
          this.parent[type](0,0) :
        type == 'line' ?
          this.parent[type](0,0,0,0) :
        type == 'image' ?
          this.parent[type](this.src) :
        type == 'text' ?
          this.parent[type](this.content) :
        type == 'path' ?
          this.parent[type](this.attr('d')) :
        type == 'polyline' || type == 'polygon' ?
          this.parent[type](this.attr('points')) :
        type == 'g' ?
          this.parent.group() :
          this.parent[type]()

        /* apply attributes attributes */
        attr = this.attr()
        delete attr.id
        clone.attr(attr)

        /* copy transformations */
        clone.trans = this.trans

        /* apply attributes and translations */
        return clone.transform({})
      }
      // Remove element
    , remove: function() {
        if (this.parent)
          this.parent.removeElement(this)

        return this
      }
      // Replace element
    , replace: function(element) {
        this.after(element).remove()

        return element
      }
      // Add element to given container and return self
    , addTo: function(parent) {
        return parent.put(this)
      }
      // Add element to given container and return container
    , putIn: function(parent) {
        return parent.add(this)
      }
      // Get parent document
    , doc: function(type) {
        return this._parent(type || SVG.Doc)
      }
      // Set svg element attribute
    , attr: function(a, v, n) {
        if (a == null) {
          /* get an object of attributes */
          a = {}
          v = this.node.attributes
          for (n = v.length - 1; n >= 0; n--)
            a[v[n].nodeName] = SVG.regex.isNumber.test(v[n].nodeValue) ? parseFloat(v[n].nodeValue) : v[n].nodeValue

          return a

        } else if (typeof a == 'object') {
          /* apply every attribute individually if an object is passed */
          for (v in a) this.attr(v, a[v])

        } else if (v === null) {
            /* remove value */
            this.node.removeAttribute(a)

        } else if (v == null) {
          /* act as a getter if the first and only argument is not an object */
          v = this.node.attributes[a]
          return v == null ?
            SVG.defaults.attrs[a] :
          SVG.regex.isNumber.test(v.nodeValue) ?
            parseFloat(v.nodeValue) : v.nodeValue

        } else if (a == 'style') {
          /* redirect to the style method */
          return this.style(v)

        } else {
          /* BUG FIX: some browsers will render a stroke if a color is given even though stroke width is 0 */
          if (a == 'stroke-width')
            this.attr('stroke', parseFloat(v) > 0 ? this._stroke : null)
          else if (a == 'stroke')
            this._stroke = v

          /* convert image fill and stroke to patterns */
          if (a == 'fill' || a == 'stroke') {
            if (SVG.regex.isImage.test(v))
              v = this.doc().defs().image(v, 0, 0)

            if (v instanceof SVG.Image)
              v = this.doc().defs().pattern(0, 0, function() {
                this.add(v)
              })
          }

          /* ensure correct numeric values (also accepts NaN and Infinity) */
          if (typeof v === 'number')
            v = new SVG.Number(v)

          /* ensure full hex color */
          else if (SVG.Color.isColor(v))
            v = new SVG.Color(v)

          /* parse array values */
          else if (Array.isArray(v))
            v = new SVG.Array(v)

          /* if the passed attribute is leading... */
          if (a == 'leading') {
            /* ... call the leading method instead */
            if (this.leading)
              this.leading(v)
          } else {
            /* set given attribute on node */
            typeof n === 'string' ?
              this.node.setAttributeNS(n, a, v.toString()) :
              this.node.setAttribute(a, v.toString())
          }

          /* rebuild if required */
          if (this.rebuild && (a == 'font-size' || a == 'x'))
            this.rebuild(a, v)
        }

        return this
      }
      // Manage transformations
    , transform: function(o, v) {

        if (arguments.length == 0) {
          /* act as a getter if no argument is given */
          return this.trans

        } else if (typeof o === 'string') {
          /* act as a getter if only one string argument is given */
          if (arguments.length < 2)
            return this.trans[o]

          /* apply transformations as object if key value arguments are given*/
          var transform = {}
          transform[o] = v

          return this.transform(transform)
        }

        /* ... otherwise continue as a setter */
        var transform = []

        /* parse matrix */
        o = parseMatrix(o)

        /* merge values */
        for (v in o)
          if (o[v] != null)
            this.trans[v] = o[v]

        /* compile matrix */
        this.trans.matrix = this.trans.a
                    + ' ' + this.trans.b
                    + ' ' + this.trans.c
                    + ' ' + this.trans.d
                    + ' ' + this.trans.e
                    + ' ' + this.trans.f

        /* alias current transformations */
        o = this.trans

        /* add matrix */
        if (o.matrix != SVG.defaults.matrix)
          transform.push('matrix(' + o.matrix + ')')

        /* add rotation */
        if (o.rotation != 0)
          transform.push('rotate(' + o.rotation + ' ' + (o.cx == null ? this.bbox().cx : o.cx) + ' ' + (o.cy == null ? this.bbox().cy : o.cy) + ')')

        /* add scale */
        if (o.scaleX != 1 || o.scaleY != 1)
          transform.push('scale(' + o.scaleX + ' ' + o.scaleY + ')')

        /* add skew on x axis */
        if (o.skewX != 0)
          transform.push('skewX(' + o.skewX + ')')

        /* add skew on y axis */
        if (o.skewY != 0)
          transform.push('skewY(' + o.skewY + ')')

        /* add translation */
        if (o.x != 0 || o.y != 0)
          transform.push('translate(' + new SVG.Number(o.x / o.scaleX) + ' ' + new SVG.Number(o.y / o.scaleY) + ')')

        /* update transformations, even if there are none */
        if (transform.length == 0)
          this.node.removeAttribute('transform')
        else
          this.node.setAttribute('transform', transform.join(' '))

        return this
      }
      // Dynamic style generator
    , style: function(s, v) {
        if (arguments.length == 0) {
          /* get full style */
          return this.node.style.cssText || ''

        } else if (arguments.length < 2) {
          /* apply every style individually if an object is passed */
          if (typeof s == 'object') {
            for (v in s) this.style(v, s[v])

          } else if (SVG.regex.isCss.test(s)) {
            /* parse css string */
            s = s.split(';')

            /* apply every definition individually */
            for (var i = 0; i < s.length; i++) {
              v = s[i].split(':')
              this.style(v[0].replace(/\s+/g, ''), v[1])
            }
          } else {
            /* act as a getter if the first and only argument is not an object */
            return this.node.style[camelCase(s)]
          }

        } else {
          this.node.style[camelCase(s)] = v === null || SVG.regex.isBlank.test(v) ? '' : v
        }

        return this
      }
      // Get / set id
    , id: function(id) {
        return this.attr('id', id)
      }
      // Get bounding box
    , bbox: function() {
        return new SVG.BBox(this)
      }
      // Get rect box
    , rbox: function() {
        return new SVG.RBox(this)
      }
      // Checks whether the given point inside the bounding box of the element
    , inside: function(x, y) {
        var box = this.bbox()

        return x > box.x
            && y > box.y
            && x < box.x + box.width
            && y < box.y + box.height
      }
      // Show element
    , show: function() {
        return this.style('display', '')
      }
      // Hide element
    , hide: function() {
        return this.style('display', 'none')
      }
      // Is element visible?
    , visible: function() {
        return this.style('display') != 'none'
      }
      // Return id on string conversion
    , toString: function() {
        return this.attr('id')
      }
      // Return array of classes on the node
    , classes: function() {
        var classAttr = this.node.getAttribute('class')
        if (classAttr === null) {
          return []
        } else {
          return classAttr.trim().split(/\s+/)
        }
      }
      // Return true if class exists on the node, false otherwise
    , hasClass: function(className) {
        return this.classes().indexOf(className) != -1
      }
      // Add class to the node
    , addClass: function(className) {
        var classArray
        if (!(this.hasClass(className))) {
          classArray = this.classes()
          classArray.push(className)
          this.node.setAttribute('class', classArray.join(' '))
        }
        return this
      }
      // Remove class from the node
    , removeClass: function(className) {
        var classArray
        if (this.hasClass(className)) {
          classArray = this.classes().filter(function(c) {
            return c != className
          })
          this.node.setAttribute('class', classArray.join(' '))
        }
        return this
      }
      // Toggle the presence of a class on the node
    , toggleClass: function(className) {
        if (this.hasClass(className)) {
          this.removeClass(className)
        } else {
          this.addClass(className)
        }
        return this
      }
      // Get referenced element form attribute value
    , reference: function(attr) {
        return SVG.get(this.attr()[attr])
      }
      // Private: find svg parent by instance
    , _parent: function(parent) {
        var element = this

        while (element != null && !(element instanceof parent))
          element = element.parent

        return element
      }
    }
  })


  SVG.Parent = SVG.invent({
    // Initialize node
    create: function(element) {
      this.constructor.call(this, element)
    }

    // Inherit from
  , inherit: SVG.Element

    // Add class methods
  , extend: {
      // Returns all child elements
      children: function() {
        return this._children || (this._children = [])
      }
      // Add given element at a position
    , add: function(element, i) {
        if (!this.has(element)) {
          /* define insertion index if none given */
          i = i == null ? this.children().length : i

          /* remove references from previous parent */
          if (element.parent)
            element.parent.children().splice(element.parent.index(element), 1)

          /* add element references */
          this.children().splice(i, 0, element)
          this.node.insertBefore(element.node, this.node.childNodes[i] || null)
          element.parent = this
        }

        /* reposition defs */
        if (this._defs) {
          this.node.removeChild(this._defs.node)
          this.node.appendChild(this._defs.node)
        }

        return this
      }
      // Basically does the same as `add()` but returns the added element instead
    , put: function(element, i) {
        this.add(element, i)
        return element
      }
      // Checks if the given element is a child
    , has: function(element) {
        return this.index(element) >= 0
      }
      // Gets index of given element
    , index: function(element) {
        return this.children().indexOf(element)
      }
      // Get a element at the given index
    , get: function(i) {
        return this.children()[i]
      }
      // Get first child, skipping the defs node
    , first: function() {
        return this.children()[0]
      }
      // Get the last child
    , last: function() {
        return this.children()[this.children().length - 1]
      }
      // Iterates over all children and invokes a given block
    , each: function(block, deep) {
        var i, il
          , children = this.children()

        for (i = 0, il = children.length; i < il; i++) {
          if (children[i] instanceof SVG.Element)
            block.apply(children[i], [i, children])

          if (deep && (children[i] instanceof SVG.Container))
            children[i].each(block, deep)
        }

        return this
      }
      // Remove a child element at a position
    , removeElement: function(element) {
        this.children().splice(this.index(element), 1)
        this.node.removeChild(element.node)
        element.parent = null

        return this
      }
      // Remove all elements in this container
    , clear: function() {
        /* remove children */
        for (var i = this.children().length - 1; i >= 0; i--)
          this.removeElement(this.children()[i])

        /* remove defs node */
        if (this._defs)
          this._defs.clear()

        return this
      }
     , // Get defs
      defs: function() {
        return this.doc().defs()
      }
    }

  })


  SVG.Container = SVG.invent({
    // Initialize node
    create: function(element) {
      this.constructor.call(this, element)
    }

    // Inherit from
  , inherit: SVG.Parent

    // Add class methods
  , extend: {
      // Get the viewBox and calculate the zoom value
      viewbox: function(v) {
        if (arguments.length == 0)
          /* act as a getter if there are no arguments */
          return new SVG.ViewBox(this)

        /* otherwise act as a setter */
        v = arguments.length == 1 ?
          [v.x, v.y, v.width, v.height] :
          [].slice.call(arguments)

        return this.attr('viewBox', v)
      }
    }

  })

  SVG.FX = SVG.invent({
    // Initialize FX object
    create: function(element) {
      /* store target element */
      this.target = element
    }

    // Add class methods
  , extend: {
      // Add animation parameters and start animation
      animate: function(d, ease, delay) {
        var akeys, tkeys, skeys, key
          , element = this.target
          , fx = this

        /* dissect object if one is passed */
        if (typeof d == 'object') {
          delay = d.delay
          ease = d.ease
          d = d.duration
        }

        /* ensure default duration and easing */
        d = d == '=' ? d : d == null ? 1000 : new SVG.Number(d).valueOf()
        ease = ease || '<>'

        /* process values */
        fx.to = function(pos) {
          var i

          /* normalise pos */
          pos = pos < 0 ? 0 : pos > 1 ? 1 : pos

          /* collect attribute keys */
          if (akeys == null) {
            akeys = []
            for (key in fx.attrs)
              akeys.push(key)

            /* make sure morphable elements are scaled, translated and morphed all together */
            if (element.morphArray && (fx._plot || akeys.indexOf('points') > -1)) {
              /* get destination */
              var box
                , p = new element.morphArray(fx._plot || fx.attrs.points || element.array)

              /* add size */
              if (fx._size) p.size(fx._size.width.to, fx._size.height.to)

              /* add movement */
              box = p.bbox()
              if (fx._x) p.move(fx._x.to, box.y)
              else if (fx._cx) p.move(fx._cx.to - box.width / 2, box.y)

              box = p.bbox()
              if (fx._y) p.move(box.x, fx._y.to)
              else if (fx._cy) p.move(box.x, fx._cy.to - box.height / 2)

              /* delete element oriented changes */
              delete fx._x
              delete fx._y
              delete fx._cx
              delete fx._cy
              delete fx._size

              fx._plot = element.array.morph(p)
            }
          }

          /* collect transformation keys */
          if (tkeys == null) {
            tkeys = []
            for (key in fx.trans)
              tkeys.push(key)
          }

          /* collect style keys */
          if (skeys == null) {
            skeys = []
            for (key in fx.styles)
              skeys.push(key)
          }

          /* apply easing */
          pos = ease == '<>' ?
            (-Math.cos(pos * Math.PI) / 2) + 0.5 :
          ease == '>' ?
            Math.sin(pos * Math.PI / 2) :
          ease == '<' ?
            -Math.cos(pos * Math.PI / 2) + 1 :
          ease == '-' ?
            pos :
          typeof ease == 'function' ?
            ease(pos) :
            pos

          /* run plot function */
          if (fx._plot) {
            element.plot(fx._plot.at(pos))

          } else {
            /* run all x-position properties */
            if (fx._x)
              element.x(fx._x.at(pos))
            else if (fx._cx)
              element.cx(fx._cx.at(pos))

            /* run all y-position properties */
            if (fx._y)
              element.y(fx._y.at(pos))
            else if (fx._cy)
              element.cy(fx._cy.at(pos))

            /* run all size properties */
            if (fx._size)
              element.size(fx._size.width.at(pos), fx._size.height.at(pos))
          }

          /* run all viewbox properties */
          if (fx._viewbox)
            element.viewbox(
              fx._viewbox.x.at(pos)
            , fx._viewbox.y.at(pos)
            , fx._viewbox.width.at(pos)
            , fx._viewbox.height.at(pos)
            )

          /* run leading property */
          if (fx._leading)
            element.leading(fx._leading.at(pos))

          /* animate attributes */
          for (i = akeys.length - 1; i >= 0; i--)
            element.attr(akeys[i], at(fx.attrs[akeys[i]], pos))

          /* animate transformations */
          for (i = tkeys.length - 1; i >= 0; i--)
            element.transform(tkeys[i], at(fx.trans[tkeys[i]], pos))

          /* animate styles */
          for (i = skeys.length - 1; i >= 0; i--)
            element.style(skeys[i], at(fx.styles[skeys[i]], pos))

          /* callback for each keyframe */
          if (fx._during)
            fx._during.call(element, pos, function(from, to) {
              return at({ from: from, to: to }, pos)
            })
        }

        if (typeof d === 'number') {
          /* delay animation */
          this.timeout = setTimeout(function() {
            var start = new Date().getTime()

            /* initialize situation object */
            fx.situation = {
              interval: 1000 / 60
            , start:    start
            , play:     true
            , finish:   start + d
            , duration: d
            }

            /* render function */
            fx.render = function() {

              if (fx.situation.play === true) {
                // This code was borrowed from the emile.js micro framework by Thomas Fuchs, aka MadRobby.
                var time = new Date().getTime()
                  , pos = time > fx.situation.finish ? 1 : (time - fx.situation.start) / d

                /* process values */
                fx.to(pos)

                /* finish off animation */
                if (time > fx.situation.finish) {
                  if (fx._plot)
                    element.plot(new SVG.PointArray(fx._plot.destination).settle())

                  if (fx._loop === true || (typeof fx._loop == 'number' && fx._loop > 1)) {
                    if (typeof fx._loop == 'number')
                      --fx._loop
                    fx.animate(d, ease, delay)
                  } else {
                    fx._after ? fx._after.apply(element, [fx]) : fx.stop()
                  }

                } else {
                  requestAnimFrame(fx.render)
                }
              } else {
                requestAnimFrame(fx.render)
              }

            }

            /* start animation */
            fx.render()

          }, new SVG.Number(delay).valueOf())
        }

        return this
      }
      // Get bounding box of target element
    , bbox: function() {
        return this.target.bbox()
      }
      // Add animatable attributes
    , attr: function(a, v) {
        if (typeof a == 'object') {
          for (var key in a)
            this.attr(key, a[key])

        } else {
          var from = this.target.attr(a)

          this.attrs[a] = SVG.Color.isColor(from) ?
            new SVG.Color(from).morph(v) :
          SVG.regex.unit.test(from) ?
            new SVG.Number(from).morph(v) :
            { from: from, to: v }
        }

        return this
      }
      // Add animatable transformations
    , transform: function(o, v) {
        if (arguments.length == 1) {
          /* parse matrix string */
          o = parseMatrix(o)

          /* dlete matrixstring from object */
          delete o.matrix

          /* store matrix values */
          for (v in o)
            this.trans[v] = { from: this.target.trans[v], to: o[v] }

        } else {
          /* apply transformations as object if key value arguments are given*/
          var transform = {}
          transform[o] = v

          this.transform(transform)
        }

        return this
      }
      // Add animatable styles
    , style: function(s, v) {
        if (typeof s == 'object')
          for (var key in s)
            this.style(key, s[key])

        else
          this.styles[s] = { from: this.target.style(s), to: v }

        return this
      }
      // Animatable x-axis
    , x: function(x) {
        this._x = new SVG.Number(this.target.x()).morph(x)

        return this
      }
      // Animatable y-axis
    , y: function(y) {
        this._y = new SVG.Number(this.target.y()).morph(y)

        return this
      }
      // Animatable center x-axis
    , cx: function(x) {
        this._cx = new SVG.Number(this.target.cx()).morph(x)

        return this
      }
      // Animatable center y-axis
    , cy: function(y) {
        this._cy = new SVG.Number(this.target.cy()).morph(y)

        return this
      }
      // Add animatable move
    , move: function(x, y) {
        return this.x(x).y(y)
      }
      // Add animatable center
    , center: function(x, y) {
        return this.cx(x).cy(y)
      }
      // Add animatable size
    , size: function(width, height) {
        if (this.target instanceof SVG.Text) {
          /* animate font size for Text elements */
          this.attr('font-size', width)

        } else {
          /* animate bbox based size for all other elements */
          var box = this.target.bbox()

          this._size = {
            width:  new SVG.Number(box.width).morph(width)
          , height: new SVG.Number(box.height).morph(height)
          }
        }

        return this
      }
      // Add animatable plot
    , plot: function(p) {
        this._plot = p

        return this
      }
      // Add leading method
    , leading: function(value) {
        if (this.target._leading)
          this._leading = new SVG.Number(this.target._leading).morph(value)

        return this
      }
      // Add animatable viewbox
    , viewbox: function(x, y, width, height) {
        if (this.target instanceof SVG.Container) {
          var box = this.target.viewbox()

          this._viewbox = {
            x:      new SVG.Number(box.x).morph(x)
          , y:      new SVG.Number(box.y).morph(y)
          , width:  new SVG.Number(box.width).morph(width)
          , height: new SVG.Number(box.height).morph(height)
          }
        }

        return this
      }
      // Add animateable gradient update
    , update: function(o) {
        if (this.target instanceof SVG.Stop) {
          if (o.opacity != null) this.attr('stop-opacity', o.opacity)
          if (o.color   != null) this.attr('stop-color', o.color)
          if (o.offset  != null) this.attr('offset', new SVG.Number(o.offset))
        }

        return this
      }
      // Add callback for each keyframe
    , during: function(during) {
        this._during = during

        return this
      }
      // Callback after animation
    , after: function(after) {
        this._after = after

        return this
      }
      // Make loopable
    , loop: function(times) {
        this._loop = times || true

        return this
      }
      // Stop running animation
    , stop: function(fulfill) {
        /* fulfill animation */
        if (fulfill === true) {

          this.animate(0)

          if (this._after)
            this._after.apply(this.target, [this])

        } else {
          /* stop current animation */
          clearTimeout(this.timeout)

          /* reset storage for properties that need animation */
          this.attrs     = {}
          this.trans     = {}
          this.styles    = {}
          this.situation = {}

          /* delete destinations */
          delete this._x
          delete this._y
          delete this._cx
          delete this._cy
          delete this._size
          delete this._plot
          delete this._loop
          delete this._after
          delete this._during
          delete this._leading
          delete this._viewbox
        }

        return this
      }
      // Pause running animation
    , pause: function() {
        if (this.situation.play === true) {
          this.situation.play  = false
          this.situation.pause = new Date().getTime()
        }

        return this
      }
      // Play running animation
    , play: function() {
        if (this.situation.play === false) {
          var pause = new Date().getTime() - this.situation.pause

          this.situation.finish += pause
          this.situation.start  += pause
          this.situation.play    = true
        }

        return this
      }

    }

    // Define parent class
  , parent: SVG.Element

    // Add method to parent elements
  , construct: {
      // Get fx module or create a new one, then animate with given duration and ease
      animate: function(d, ease, delay) {
        return (this.fx || (this.fx = new SVG.FX(this))).stop().animate(d, ease, delay)
      }
      // Stop current animation; this is an alias to the fx instance
    , stop: function(fulfill) {
        if (this.fx)
          this.fx.stop(fulfill)

        return this
      }
      // Pause current animation
    , pause: function() {
        if (this.fx)
          this.fx.pause()

        return this
      }
      // Play paused current animation
    , play: function() {
        if (this.fx)
          this.fx.play()

        return this
      }

    }
  })


  SVG.extend(SVG.Element, SVG.FX, {
    // Relative move over x axis
    dx: function(x) {
      return this.x((this.target || this).x() + x)
    }
    // Relative move over y axis
  , dy: function(y) {
      return this.y((this.target || this).y() + y)
    }
    // Relative move over x and y axes
  , dmove: function(x, y) {
      return this.dx(x).dy(y)
    }

  })

  ;[  'click'
    , 'dblclick'
    , 'mousedown'
    , 'mouseup'
    , 'mouseover'
    , 'mouseout'
    , 'mousemove'
    // , 'mouseenter' -> not supported by IE
    // , 'mouseleave' -> not supported by IE
    , 'touchstart'
    , 'touchmove'
    , 'touchleave'
    , 'touchend'
    , 'touchcancel' ].forEach(function(event) {

    /* add event to SVG.Element */
    SVG.Element.prototype[event] = function(f) {
      var self = this

      /* bind event to element rather than element node */
      this.node['on' + event] = typeof f == 'function' ?
        function() { return f.apply(self, arguments) } : null

      return this
    }

  })

  // Initialize events and listeners stack
  SVG.events = {}
  SVG.listeners = {}

  // Event constructor
  SVG.registerEvent = function(event) {
    if (!SVG.events[event])
      SVG.events[event] = new CustomEvent(event)
  }

  // Add event binder in the SVG namespace
  SVG.on = function(node, event, listener) {
    // create listener
    var l = listener.bind(node.instance || node)

    // ensure reference objects
    SVG.listeners[node]        = SVG.listeners[node]        || {}
    SVG.listeners[node][event] = SVG.listeners[node][event] || {}

    // reference listener
    SVG.listeners[node][event][listener] = l

    // add listener
    node.addEventListener(event, l, false)
  }

  // Add event unbinder in the SVG namespace
  SVG.off = function(node, event, listener) {
    if (listener) {
      // remove listener reference
      if (SVG.listeners[node] && SVG.listeners[node][event]) {
        // remove listener
        node.removeEventListener(event, SVG.listeners[node][event][listener], false)

        delete SVG.listeners[node][event][listener]
      }

    } else if (event) {
      // remove all listeners for the event
      if (SVG.listeners[node][event]) {
        for (listener in SVG.listeners[node][event])
          SVG.off(node, event, listener)

        delete SVG.listeners[node][event]
      }

    } else {
      // remove all listeners on a given node
      if (SVG.listeners[node]) {
        for (event in SVG.listeners[node])
          SVG.off(node, event)

        delete SVG.listeners[node]
      }
    }
  }

  //
  SVG.extend(SVG.Element, {
    // Bind given event to listener
    on: function(event, listener) {
      SVG.on(this.node, event, listener)

      return this
    }
    // Unbind event from listener
  , off: function(event, listener) {
      SVG.off(this.node, event, listener)

      return this
    }
    // Fire given event
  , fire: function(event, data) {
      // Add detail data to event
      SVG.events[event].detail = data

      // Dispatch event
      this.node.dispatchEvent(SVG.events[event])

      // Remove detail
      delete SVG.events[event].detail

      return this
    }
  })

  SVG.Defs = SVG.invent({
    // Initialize node
    create: 'defs'

    // Inherit from
  , inherit: SVG.Container

  })

  SVG.G = SVG.invent({
    // Initialize node
    create: 'g'

    // Inherit from
  , inherit: SVG.Container

    // Add class methods
  , extend: {
      // Move over x-axis
      x: function(x) {
        return x == null ? this.trans.x : this.transform('x', x)
      }
      // Move over y-axis
    , y: function(y) {
        return y == null ? this.trans.y : this.transform('y', y)
      }
      // Move by center over x-axis
    , cx: function(x) {
        return x == null ? this.bbox().cx : this.x(x - this.bbox().width / 2)
      }
      // Move by center over y-axis
    , cy: function(y) {
        return y == null ? this.bbox().cy : this.y(y - this.bbox().height / 2)
      }
    }

    // Add parent method
  , construct: {
      // Create a group element
      group: function() {
        return this.put(new SVG.G)
      }
    }
  })

  SVG.extend(SVG.Element, {
    // Get all siblings, including myself
    siblings: function() {
      return this.parent.children()
    }
    // Get the curent position siblings
  , position: function() {
      return this.parent.index(this)
    }
    // Get the next element (will return null if there is none)
  , next: function() {
      return this.siblings()[this.position() + 1]
    }
    // Get the next element (will return null if there is none)
  , previous: function() {
      return this.siblings()[this.position() - 1]
    }
    // Send given element one step forward
  , forward: function() {
      var i = this.position()
      return this.parent.removeElement(this).put(this, i + 1)
    }
    // Send given element one step backward
  , backward: function() {
      var i = this.position()

      if (i > 0)
        this.parent.removeElement(this).add(this, i - 1)

      return this
    }
    // Send given element all the way to the front
  , front: function() {
      return this.parent.removeElement(this).put(this)
    }
    // Send given element all the way to the back
  , back: function() {
      if (this.position() > 0)
        this.parent.removeElement(this).add(this, 0)

      return this
    }
    // Inserts a given element before the targeted element
  , before: function(element) {
      element.remove()

      var i = this.position()

      this.parent.add(element, i)

      return this
    }
    // Insters a given element after the targeted element
  , after: function(element) {
      element.remove()

      var i = this.position()

      this.parent.add(element, i + 1)

      return this
    }

  })

  SVG.Mask = SVG.invent({
    // Initialize node
    create: function() {
      this.constructor.call(this, SVG.create('mask'))

      /* keep references to masked elements */
      this.targets = []
    }

    // Inherit from
  , inherit: SVG.Container

    // Add class methods
  , extend: {
      // Unmask all masked elements and remove itself
      remove: function() {
        /* unmask all targets */
        for (var i = this.targets.length - 1; i >= 0; i--)
          if (this.targets[i])
            this.targets[i].unmask()
        delete this.targets

        /* remove mask from parent */
        this.parent.removeElement(this)

        return this
      }
    }

    // Add parent method
  , construct: {
      // Create masking element
      mask: function() {
        return this.defs().put(new SVG.Mask)
      }
    }
  })


  SVG.extend(SVG.Element, {
    // Distribute mask to svg element
    maskWith: function(element) {
      /* use given mask or create a new one */
      this.masker = element instanceof SVG.Mask ? element : this.parent.mask().add(element)

      /* store reverence on self in mask */
      this.masker.targets.push(this)

      /* apply mask */
      return this.attr('mask', 'url("#' + this.masker.attr('id') + '")')
    }
    // Unmask element
  , unmask: function() {
      delete this.masker
      return this.attr('mask', null)
    }

  })


  SVG.Clip = SVG.invent({
    // Initialize node
    create: function() {
      this.constructor.call(this, SVG.create('clipPath'))

      /* keep references to clipped elements */
      this.targets = []
    }

    // Inherit from
  , inherit: SVG.Container

    // Add class methods
  , extend: {
      // Unclip all clipped elements and remove itself
      remove: function() {
        /* unclip all targets */
        for (var i = this.targets.length - 1; i >= 0; i--)
          if (this.targets[i])
            this.targets[i].unclip()
        delete this.targets

        /* remove clipPath from parent */
        this.parent.removeElement(this)

        return this
      }
    }

    // Add parent method
  , construct: {
      // Create clipping element
      clip: function() {
        return this.defs().put(new SVG.Clip)
      }
    }
  })

  //
  SVG.extend(SVG.Element, {
    // Distribute clipPath to svg element
    clipWith: function(element) {
      /* use given clip or create a new one */
      this.clipper = element instanceof SVG.Clip ? element : this.parent.clip().add(element)

      /* store reverence on self in mask */
      this.clipper.targets.push(this)

      /* apply mask */
      return this.attr('clip-path', 'url("#' + this.clipper.attr('id') + '")')
    }
    // Unclip element
  , unclip: function() {
      delete this.clipper
      return this.attr('clip-path', null)
    }

  })

  SVG.Gradient = SVG.invent({
    // Initialize node
    create: function(type) {
      this.constructor.call(this, SVG.create(type + 'Gradient'))

      /* store type */
      this.type = type
    }

    // Inherit from
  , inherit: SVG.Container

    // Add class methods
  , extend: {
      // From position
      from: function(x, y) {
        return this.type == 'radial' ?
          this.attr({ fx: new SVG.Number(x), fy: new SVG.Number(y) }) :
          this.attr({ x1: new SVG.Number(x), y1: new SVG.Number(y) })
      }
      // To position
    , to: function(x, y) {
        return this.type == 'radial' ?
          this.attr({ cx: new SVG.Number(x), cy: new SVG.Number(y) }) :
          this.attr({ x2: new SVG.Number(x), y2: new SVG.Number(y) })
      }
      // Radius for radial gradient
    , radius: function(r) {
        return this.type == 'radial' ?
          this.attr({ r: new SVG.Number(r) }) :
          this
      }
      // Add a color stop
    , at: function(offset, color, opacity) {
        return this.put(new SVG.Stop).update(offset, color, opacity)
      }
      // Update gradient
    , update: function(block) {
        /* remove all stops */
        this.clear()

        /* invoke passed block */
        if (typeof block == 'function')
          block.call(this, this)

        return this
      }
      // Return the fill id
    , fill: function() {
        return 'url(#' + this.id() + ')'
      }
      // Alias string convertion to fill
    , toString: function() {
        return this.fill()
      }
    }

    // Add parent method
  , construct: {
      // Create gradient element in defs
      gradient: function(type, block) {
        return this.defs().gradient(type, block)
      }
    }
  })

  SVG.extend(SVG.Defs, {
    // define gradient
    gradient: function(type, block) {
      return this.put(new SVG.Gradient(type)).update(block)
    }

  })

  SVG.Stop = SVG.invent({
    // Initialize node
    create: 'stop'

    // Inherit from
  , inherit: SVG.Element

    // Add class methods
  , extend: {
      // add color stops
      update: function(o) {
        if (typeof o == 'number' || o instanceof SVG.Number) {
          o = {
            offset:  arguments[0]
          , color:   arguments[1]
          , opacity: arguments[2]
          }
        }

        /* set attributes */
        if (o.opacity != null) this.attr('stop-opacity', o.opacity)
        if (o.color   != null) this.attr('stop-color', o.color)
        if (o.offset  != null) this.attr('offset', new SVG.Number(o.offset))

        return this
      }
    }

  })


  SVG.Pattern = SVG.invent({
    // Initialize node
    create: 'pattern'

    // Inherit from
  , inherit: SVG.Container

    // Add class methods
  , extend: {
      // Return the fill id
  	  fill: function() {
  	    return 'url(#' + this.id() + ')'
  	  }
  	  // Update pattern by rebuilding
  	, update: function(block) {
  			/* remove content */
        this.clear()

        /* invoke passed block */
        if (typeof block == 'function')
        	block.call(this, this)

        return this
  		}
  	  // Alias string convertion to fill
  	, toString: function() {
  	    return this.fill()
  	  }
    }

    // Add parent method
  , construct: {
      // Create pattern element in defs
  	  pattern: function(width, height, block) {
  	    return this.defs().pattern(width, height, block)
  	  }
    }
  })

  SVG.extend(SVG.Defs, {
    // Define gradient
    pattern: function(width, height, block) {
      return this.put(new SVG.Pattern).update(block).attr({
        x:            0
      , y:            0
      , width:        width
      , height:       height
      , patternUnits: 'userSpaceOnUse'
      })
    }

  })

  SVG.Doc = SVG.invent({
    // Initialize node
    create: function(element) {
      /* ensure the presence of a html element */
      this.parent = typeof element == 'string' ?
        document.getElementById(element) :
        element

      /* If the target is an svg element, use that element as the main wrapper.
         This allows svg.js to work with svg documents as well. */
      this.constructor
        .call(this, this.parent.nodeName == 'svg' ? this.parent : SVG.create('svg'))

      /* set svg element attributes */
      this
        .attr({ xmlns: SVG.ns, version: '1.1', width: '100%', height: '100%' })
        .attr('xmlns:xlink', SVG.xlink, SVG.xmlns)

      /* create the <defs> node */
      this._defs = new SVG.Defs
      this._defs.parent = this
      this.node.appendChild(this._defs.node)

      /* turn off sub pixel offset by default */
      this.doSpof = false

      /* ensure correct rendering */
      if (this.parent != this.node)
        this.stage()
    }

    // Inherit from
  , inherit: SVG.Container

    // Add class methods
  , extend: {
      /* enable drawing */
      stage: function() {
        var element = this

        /* insert element */
        this.parent.appendChild(this.node)

        /* fix sub-pixel offset */
        element.spof()

        /* make sure sub-pixel offset is fixed every time the window is resized */
        SVG.on(window, 'resize', function() {
          element.spof()
        })

        return this
      }

      // Creates and returns defs element
    , defs: function() {
        return this._defs
      }

      // Fix for possible sub-pixel offset. See:
      // https://bugzilla.mozilla.org/show_bug.cgi?id=608812
    , spof: function() {
        if (this.doSpof) {
          var pos = this.node.getScreenCTM()

          if (pos)
            this
              .style('left', (-pos.e % 1) + 'px')
              .style('top',  (-pos.f % 1) + 'px')
        }

        return this
      }

      // Enable sub-pixel offset
    , fixSubPixelOffset: function() {
        this.doSpof = true

        return this
      }
    }

  })


  SVG.Shape = SVG.invent({
    // Initialize node
    create: function(element) {
  	  this.constructor.call(this, element)
  	}

    // Inherit from
  , inherit: SVG.Element

  })

  SVG.Symbol = SVG.invent({
    // Initialize node
    create: 'symbol'

    // Inherit from
  , inherit: SVG.Container

    // Add parent method
  , construct: {
      // Create a new symbol
      symbol: function() {
        return this.defs().put(new SVG.Symbol)
      }
    }

  })

  SVG.Use = SVG.invent({
    // Initialize node
    create: 'use'

    // Inherit from
  , inherit: SVG.Shape

    // Add class methods
  , extend: {
      // Use element as a reference
      element: function(element) {
        /* store target element */
        this.target = element

        /* set lined element */
        return this.attr('href', '#' + element, SVG.xlink)
      }
    }

    // Add parent method
  , construct: {
      // Create a use element
      use: function(element) {
        return this.put(new SVG.Use).element(element)
      }
    }
  })

  SVG.Rect = SVG.invent({
  	// Initialize node
    create: 'rect'

  	// Inherit from
  , inherit: SVG.Shape

  	// Add parent method
  , construct: {
    	// Create a rect element
    	rect: function(width, height) {
    	  return this.put(new SVG.Rect().size(width, height))
    	}

  	}

  })

  SVG.Ellipse = SVG.invent({
    // Initialize node
    create: 'ellipse'

    // Inherit from
  , inherit: SVG.Shape

    // Add class methods
  , extend: {
      // Move over x-axis
      x: function(x) {
        return x == null ? this.cx() - this.attr('rx') : this.cx(x + this.attr('rx'))
      }
      // Move over y-axis
    , y: function(y) {
        return y == null ? this.cy() - this.attr('ry') : this.cy(y + this.attr('ry'))
      }
      // Move by center over x-axis
    , cx: function(x) {
        return x == null ? this.attr('cx') : this.attr('cx', new SVG.Number(x).divide(this.trans.scaleX))
      }
      // Move by center over y-axis
    , cy: function(y) {
        return y == null ? this.attr('cy') : this.attr('cy', new SVG.Number(y).divide(this.trans.scaleY))
      }
      // Set width of element
    , width: function(width) {
        return width == null ? this.attr('rx') * 2 : this.attr('rx', new SVG.Number(width).divide(2))
      }
      // Set height of element
    , height: function(height) {
        return height == null ? this.attr('ry') * 2 : this.attr('ry', new SVG.Number(height).divide(2))
      }
      // Custom size function
    , size: function(width, height) {
        var p = proportionalSize(this.bbox(), width, height)

        return this.attr({
          rx: new SVG.Number(p.width).divide(2)
        , ry: new SVG.Number(p.height).divide(2)
        })
      }

    }

    // Add parent method
  , construct: {
      // Create circle element, based on ellipse
      circle: function(size) {
        return this.ellipse(size, size)
      }
      // Create an ellipse
    , ellipse: function(width, height) {
        return this.put(new SVG.Ellipse).size(width, height).move(0, 0)
      }

    }

  })

  SVG.Line = SVG.invent({
    // Initialize node
    create: 'line'

    // Inherit from
  , inherit: SVG.Shape

    // Add class methods
  , extend: {
      // Move over x-axis
      x: function(x) {
        var b = this.bbox()

        return x == null ? b.x : this.attr({
          x1: this.attr('x1') - b.x + x
        , x2: this.attr('x2') - b.x + x
        })
      }
      // Move over y-axis
    , y: function(y) {
        var b = this.bbox()

        return y == null ? b.y : this.attr({
          y1: this.attr('y1') - b.y + y
        , y2: this.attr('y2') - b.y + y
        })
      }
      // Move by center over x-axis
    , cx: function(x) {
        var half = this.bbox().width / 2
        return x == null ? this.x() + half : this.x(x - half)
      }
      // Move by center over y-axis
    , cy: function(y) {
        var half = this.bbox().height / 2
        return y == null ? this.y() + half : this.y(y - half)
      }
      // Set width of element
    , width: function(width) {
        var b = this.bbox()

        return width == null ? b.width : this.attr(this.attr('x1') < this.attr('x2') ? 'x2' : 'x1', b.x + width)
      }
      // Set height of element
    , height: function(height) {
        var b = this.bbox()

        return height == null ? b.height : this.attr(this.attr('y1') < this.attr('y2') ? 'y2' : 'y1', b.y + height)
      }
      // Set line size by width and height
    , size: function(width, height) {
        var p = proportionalSize(this.bbox(), width, height)

        return this.width(p.width).height(p.height)
      }
      // Set path data
    , plot: function(x1, y1, x2, y2) {
        return this.attr({
          x1: x1
        , y1: y1
        , x2: x2
        , y2: y2
        })
      }
    }

    // Add parent method
  , construct: {
      // Create a line element
      line: function(x1, y1, x2, y2) {
        return this.put(new SVG.Line().plot(x1, y1, x2, y2))
      }
    }
  })


  SVG.Polyline = SVG.invent({
    // Initialize node
    create: 'polyline'

    // Inherit from
  , inherit: SVG.Shape

    // Add parent method
  , construct: {
      // Create a wrapped polyline element
      polyline: function(p) {
        return this.put(new SVG.Polyline).plot(p)
      }
    }
  })

  SVG.Polygon = SVG.invent({
    // Initialize node
    create: 'polygon'

    // Inherit from
  , inherit: SVG.Shape

    // Add parent method
  , construct: {
      // Create a wrapped polygon element
      polygon: function(p) {
        return this.put(new SVG.Polygon).plot(p)
      }
    }
  })

  // Add polygon-specific functions
  SVG.extend(SVG.Polyline, SVG.Polygon, {
    // Define morphable array
    morphArray:  SVG.PointArray
    // Plot new path
  , plot: function(p) {
      return this.attr('points', (this.array = new SVG.PointArray(p, [[0,0]])))
    }
    // Move by left top corner
  , move: function(x, y) {
      return this.attr('points', this.array.move(x, y))
    }
    // Move by left top corner over x-axis
  , x: function(x) {
      return x == null ? this.bbox().x : this.move(x, this.bbox().y)
    }
    // Move by left top corner over y-axis
  , y: function(y) {
      return y == null ? this.bbox().y : this.move(this.bbox().x, y)
    }
    // Set width of element
  , width: function(width) {
      var b = this.bbox()

      return width == null ? b.width : this.size(width, b.height)
    }
    // Set height of element
  , height: function(height) {
      var b = this.bbox()

      return height == null ? b.height : this.size(b.width, height)
    }
    // Set element size to given width and height
  , size: function(width, height) {
      var p = proportionalSize(this.bbox(), width, height)

      return this.attr('points', this.array.size(p.width, p.height))
    }

  })

  SVG.Path = SVG.invent({
    // Initialize node
    create: 'path'

    // Inherit from
  , inherit: SVG.Shape

    // Add class methods
  , extend: {
      // Plot new poly points
      plot: function(p) {
        return this.attr('d', (this.array = new SVG.PathArray(p, [['M', 0, 0]])))
      }
      // Move by left top corner
    , move: function(x, y) {
        return this.attr('d', this.array.move(x, y))
      }
      // Move by left top corner over x-axis
    , x: function(x) {
        return x == null ? this.bbox().x : this.move(x, this.bbox().y)
      }
      // Move by left top corner over y-axis
    , y: function(y) {
        return y == null ? this.bbox().y : this.move(this.bbox().x, y)
      }
      // Set element size to given width and height
    , size: function(width, height) {
        var p = proportionalSize(this.bbox(), width, height)

        return this.attr('d', this.array.size(p.width, p.height))
      }
      // Set width of element
    , width: function(width) {
        return width == null ? this.bbox().width : this.size(width, this.bbox().height)
      }
      // Set height of element
    , height: function(height) {
        return height == null ? this.bbox().height : this.size(this.bbox().width, height)
      }

    }

    // Add parent method
  , construct: {
      // Create a wrapped path element
      path: function(d) {
        return this.put(new SVG.Path).plot(d)
      }
    }
  })

  SVG.Image = SVG.invent({
    // Initialize node
    create: 'image'

    // Inherit from
  , inherit: SVG.Shape

    // Add class methods
  , extend: {
      // (re)load image
      load: function(url) {
        if (!url) return this

        var self = this
          , img  = document.createElement('img')

        /* preload image */
        img.onload = function() {
          var p = self.doc(SVG.Pattern)

          /* ensure image size */
          if (self.width() == 0 && self.height() == 0)
            self.size(img.width, img.height)

          /* ensure pattern size if not set */
          if (p && p.width() == 0 && p.height() == 0)
            p.size(self.width(), self.height())

          /* callback */
          if (typeof self._loaded === 'function')
            self._loaded.call(self, {
              width:  img.width
            , height: img.height
            , ratio:  img.width / img.height
            , url:    url
            })
        }

        return this.attr('href', (img.src = this.src = url), SVG.xlink)
      }
      // Add loade callback
    , loaded: function(loaded) {
        this._loaded = loaded
        return this
      }
    }

    // Add parent method
  , construct: {
      // Create image element, load image and set its size
      image: function(source, width, height) {
        return this.put(new SVG.Image).load(source).size(width || 0, height || width || 0)
      }
    }

  })

  SVG.Text = SVG.invent({
    // Initialize node
    create: function() {
      this.constructor.call(this, SVG.create('text'))

      this._leading = new SVG.Number(1.3)    /* store leading value for rebuilding */
      this._rebuild = true                   /* enable automatic updating of dy values */
      this._build   = false                  /* disable build mode for adding multiple lines */

      /* set default font */
      this.attr('font-family', SVG.defaults.attrs['font-family'])
    }

    // Inherit from
  , inherit: SVG.Shape

    // Add class methods
  , extend: {
      // Move over x-axis
      x: function(x) {
        /* act as getter */
        if (x == null)
          return this.attr('x')

        /* move lines as well if no textPath is present */
        if (!this.textPath)
          this.lines.each(function() { if (this.newLined) this.x(x) })

        return this.attr('x', x)
      }
      // Move over y-axis
    , y: function(y) {
        var oy = this.attr('y')
          , o  = typeof oy === 'number' ? oy - this.bbox().y : 0

        /* act as getter */
        if (y == null)
          return typeof oy === 'number' ? oy - o : oy

        return this.attr('y', typeof y === 'number' ? y + o : y)
      }
      // Move center over x-axis
    , cx: function(x) {
        return x == null ? this.bbox().cx : this.x(x - this.bbox().width / 2)
      }
      // Move center over y-axis
    , cy: function(y) {
        return y == null ? this.bbox().cy : this.y(y - this.bbox().height / 2)
      }
      // Set the text content
    , text: function(text) {
        /* act as getter */
        if (typeof text === 'undefined') return this.content

        /* remove existing content */
        this.clear().build(true)

        if (typeof text === 'function') {
          /* call block */
          text.call(this, this)

        } else {
          /* store text and make sure text is not blank */
          text = (this.content = text).split('\n')

          /* build new lines */
          for (var i = 0, il = text.length; i < il; i++)
            this.tspan(text[i]).newLine()
        }

        /* disable build mode and rebuild lines */
        return this.build(false).rebuild()
      }
      // Set font size
    , size: function(size) {
        return this.attr('font-size', size).rebuild()
      }
      // Set / get leading
    , leading: function(value) {
        /* act as getter */
        if (value == null)
          return this._leading

        /* act as setter */
        this._leading = new SVG.Number(value)

        return this.rebuild()
      }
      // Rebuild appearance type
    , rebuild: function(rebuild) {
        /* store new rebuild flag if given */
        if (typeof rebuild == 'boolean')
          this._rebuild = rebuild

        /* define position of all lines */
        if (this._rebuild) {
          var self = this

          this.lines.each(function() {
            if (this.newLined) {
              if (!this.textPath)
                this.attr('x', self.attr('x'))
              this.attr('dy', self._leading * new SVG.Number(self.attr('font-size')))
            }
          })

          this.fire('rebuild')
        }

        return this
      }
      // Enable / disable build mode
    , build: function(build) {
        this._build = !!build
        return this
      }
    }

    // Add parent method
  , construct: {
      // Create text element
      text: function(text) {
        return this.put(new SVG.Text).text(text)
      }
      // Create plain text element
    , plain: function(text) {
        return this.put(new SVG.Text).plain(text)
      }
    }

  })

  SVG.TSpan = SVG.invent({
    // Initialize node
    create: 'tspan'

    // Inherit from
  , inherit: SVG.Shape

    // Add class methods
  , extend: {
      // Set text content
      text: function(text) {
        typeof text === 'function' ? text.call(this, this) : this.plain(text)

        return this
      }
      // Shortcut dx
    , dx: function(dx) {
        return this.attr('dx', dx)
      }
      // Shortcut dy
    , dy: function(dy) {
        return this.attr('dy', dy)
      }
      // Create new line
    , newLine: function() {
        /* fetch text parent */
        var t = this.doc(SVG.Text)

        /* mark new line */
        this.newLined = true

        /* apply new hy¡n */
        return this.dy(t._leading * t.attr('font-size')).attr('x', t.x())
      }
    }

  })

  SVG.extend(SVG.Text, SVG.TSpan, {
    // Create plain text node
    plain: function(text) {
      /* clear if build mode is disabled */
      if (this._build === false)
        this.clear()

      /* create text node */
      this.node.appendChild(document.createTextNode((this.content = text)))

      return this
    }
    // Create a tspan
  , tspan: function(text) {
      var node  = (this.textPath || this).node
        , tspan = new SVG.TSpan

      /* clear if build mode is disabled */
      if (this._build === false)
        this.clear()

      /* add new tspan and reference */
      node.appendChild(tspan.node)
      tspan.parent = this

      /* only first level tspans are considered to be "lines" */
      if (this instanceof SVG.Text)
        this.lines.add(tspan)

      return tspan.text(text)
    }
    // Clear all lines
  , clear: function() {
      var node = (this.textPath || this).node

      /* remove existing child nodes */
      while (node.hasChildNodes())
        node.removeChild(node.lastChild)

      /* reset content references  */
      if (this instanceof SVG.Text) {
        delete this.lines
        this.lines = new SVG.Set
        this.content = ''
      }

      return this
    }
    // Get length of text element
  , length: function() {
      return this.node.getComputedTextLength()
    }
  })

  // Register rebuild event
  SVG.registerEvent('rebuild')


  SVG.TextPath = SVG.invent({
    // Initialize node
    create: 'textPath'

    // Inherit from
  , inherit: SVG.Element

    // Define parent class
  , parent: SVG.Text

    // Add parent method
  , construct: {
      // Create path for text to run on
      path: function(d) {
        /* create textPath element */
        this.textPath = new SVG.TextPath

        /* move lines to textpath */
        while(this.node.hasChildNodes())
          this.textPath.node.appendChild(this.node.firstChild)

        /* add textPath element as child node */
        this.node.appendChild(this.textPath.node)

        /* create path in defs */
        this.track = this.doc().defs().path(d)

        /* create circular reference */
        this.textPath.parent = this

        /* link textPath to path and add content */
        this.textPath.attr('href', '#' + this.track, SVG.xlink)

        return this
      }
      // Plot path if any
    , plot: function(d) {
        if (this.track) this.track.plot(d)
        return this
      }
    }
  })

  SVG.Nested = SVG.invent({
    // Initialize node
    create: function() {
      this.constructor.call(this, SVG.create('svg'))

      this.style('overflow', 'visible')
    }

    // Inherit from
  , inherit: SVG.Container

    // Add parent method
  , construct: {
      // Create nested svg document
      nested: function() {
        return this.put(new SVG.Nested)
      }
    }
  })

  SVG.A = SVG.invent({
    // Initialize node
    create: 'a'

    // Inherit from
  , inherit: SVG.Container

    // Add class methods
  , extend: {
      // Link url
      to: function(url) {
        return this.attr('href', url, SVG.xlink)
      }
      // Link show attribute
    , show: function(target) {
        return this.attr('show', target, SVG.xlink)
      }
      // Link target attribute
    , target: function(target) {
        return this.attr('target', target)
      }
    }

    // Add parent method
  , construct: {
      // Create a hyperlink element
      link: function(url) {
        return this.put(new SVG.A).to(url)
      }
    }
  })

  SVG.extend(SVG.Element, {
    // Create a hyperlink element
    linkTo: function(url) {
      var link = new SVG.A

      if (typeof url == 'function')
        url.call(link, link)
      else
        link.to(url)

      return this.parent.put(link).put(this)
    }

  })

  SVG.Marker = SVG.invent({
    // Initialize node
    create: 'marker'

    // Inherit from
  , inherit: SVG.Container

    // Add class methods
  , extend: {
      // Set width of element
      width: function(width) {
        return this.attr('markerWidth', width)
      }
      // Set height of element
    , height: function(height) {
        return this.attr('markerHeight', height)
      }
      // Set marker refX and refY
    , ref: function(x, y) {
        return this.attr('refX', x).attr('refY', y)
      }
      // Update marker
    , update: function(block) {
        /* remove all content */
        this.clear()

        /* invoke passed block */
        if (typeof block == 'function')
          block.call(this, this)

        return this
      }
      // Return the fill id
    , toString: function() {
        return 'url(#' + this.id() + ')'
      }
    }

    // Add parent method
  , construct: {
      marker: function(width, height, block) {
        // Create marker element in defs
        return this.defs().marker(width, height, block)
      }
    }

  })

  SVG.extend(SVG.Defs, {
    // Create marker
    marker: function(width, height, block) {
      // Set default viewbox to match the width and height, set ref to cx and cy and set orient to auto
      return this.put(new SVG.Marker)
        .size(width, height)
        .ref(width / 2, height / 2)
        .viewbox(0, 0, width, height)
        .attr('orient', 'auto')
        .update(block)
    }

  })

  SVG.extend(SVG.Line, SVG.Polyline, SVG.Polygon, SVG.Path, {
    // Create and attach markers
    marker: function(marker, width, height, block) {
      var attr = ['marker']

      // Build attribute name
      if (marker != 'all') attr.push(marker)
      attr = attr.join('-')

      // Set marker attribute
      marker = arguments[1] instanceof SVG.Marker ?
        arguments[1] :
        this.doc().marker(width, height, block)

      return this.attr(attr, marker)
    }

  })

  var sugar = {
    stroke: ['color', 'width', 'opacity', 'linecap', 'linejoin', 'miterlimit', 'dasharray', 'dashoffset']
  , fill:   ['color', 'opacity', 'rule']
  , prefix: function(t, a) {
      return a == 'color' ? t : t + '-' + a
    }
  }

  /* Add sugar for fill and stroke */
  ;['fill', 'stroke'].forEach(function(m) {
    var i, extension = {}

    extension[m] = function(o) {
      if (typeof o == 'string' || SVG.Color.isRgb(o) || (o && typeof o.fill === 'function'))
        this.attr(m, o)

      else
        /* set all attributes from sugar.fill and sugar.stroke list */
        for (i = sugar[m].length - 1; i >= 0; i--)
          if (o[sugar[m][i]] != null)
            this.attr(sugar.prefix(m, sugar[m][i]), o[sugar[m][i]])

      return this
    }

    SVG.extend(SVG.Element, SVG.FX, extension)

  })

  SVG.extend(SVG.Element, SVG.FX, {
    // Rotation
    rotate: function(deg, x, y) {
      return this.transform({
        rotation: deg || 0
      , cx: x
      , cy: y
      })
    }
    // Skew
  , skew: function(x, y) {
      return this.transform({
        skewX: x || 0
      , skewY: y || 0
      })
    }
    // Scale
  , scale: function(x, y) {
      return this.transform({
        scaleX: x
      , scaleY: y == null ? x : y
      })
    }
    // Translate
  , translate: function(x, y) {
      return this.transform({
        x: x
      , y: y
      })
    }
    // Matrix
  , matrix: function(m) {
      return this.transform({ matrix: m })
    }
    // Opacity
  , opacity: function(value) {
      return this.attr('opacity', value)
    }

  })

  SVG.extend(SVG.Rect, SVG.Ellipse, SVG.FX, {
    // Add x and y radius
    radius: function(x, y) {
      return this.attr({ rx: x, ry: y || x })
    }

  })

  SVG.extend(SVG.Path, {
    // Get path length
    length: function() {
      return this.node.getTotalLength()
    }
    // Get point at length
  , pointAt: function(length) {
      return this.node.getPointAtLength(length)
    }

  })

  SVG.extend(SVG.Parent, SVG.Text, SVG.FX, {
    // Set font
    font: function(o) {
      for (var k in o)
        k == 'leading' ?
          this.leading(o[k]) :
        k == 'anchor' ?
          this.attr('text-anchor', o[k]) :
        k == 'size' || k == 'family' || k == 'weight' || k == 'stretch' || k == 'variant' || k == 'style' ?
          this.attr('font-'+ k, o[k]) :
          this.attr(k, o[k])

      return this
    }

  })



  SVG.Set = SVG.invent({
    // Initialize
    create: function() {
      /* set initial state */
      this.clear()
    }

    // Add class methods
  , extend: {
      // Add element to set
      add: function() {
        var i, il, elements = [].slice.call(arguments)

        for (i = 0, il = elements.length; i < il; i++)
          this.members.push(elements[i])

        return this
      }
      // Remove element from set
    , remove: function(element) {
        var i = this.index(element)

        /* remove given child */
        if (i > -1)
          this.members.splice(i, 1)

        return this
      }
      // Iterate over all members
    , each: function(block) {
        for (var i = 0, il = this.members.length; i < il; i++)
          block.apply(this.members[i], [i, this.members])

        return this
      }
      // Restore to defaults
    , clear: function() {
        /* initialize store */
        this.members = []

        return this
      }
      // Checks if a given element is present in set
    , has: function(element) {
        return this.index(element) >= 0
      }
      // retuns index of given element in set
    , index: function(element) {
        return this.members.indexOf(element)
      }
      // Get member at given index
    , get: function(i) {
        return this.members[i]
      }
      // Get first member
    , first: function() {
        return this.get(0)
      }
      // Get last member
    , last: function() {
        return this.get(this.members.length - 1)
      }
      // Default value
    , valueOf: function() {
        return this.members
      }
      // Get the bounding box of all members included or empty box if set has no items
    , bbox: function(){
        var box = new SVG.BBox()

        /* return an empty box of there are no members */
        if (this.members.length == 0)
          return box

        /* get the first rbox and update the target bbox */
        var rbox = this.members[0].rbox()
        box.x      = rbox.x
        box.y      = rbox.y
        box.width  = rbox.width
        box.height = rbox.height

        this.each(function() {
          /* user rbox for correct position and visual representation */
          box = box.merge(this.rbox())
        })

        return box
      }
    }

    // Add parent method
  , construct: {
      // Create a new set
      set: function() {
        return new SVG.Set
      }
    }
  })

  SVG.SetFX = SVG.invent({
    // Initialize node
    create: function(set) {
      /* store reference to set */
      this.set = set
    }

  })

  // Alias methods
  SVG.Set.inherit = function() {
    var m
      , methods = []

    /* gather shape methods */
    for(var m in SVG.Shape.prototype)
      if (typeof SVG.Shape.prototype[m] == 'function' && typeof SVG.Set.prototype[m] != 'function')
        methods.push(m)

    /* apply shape aliasses */
    methods.forEach(function(method) {
      SVG.Set.prototype[method] = function() {
        for (var i = 0, il = this.members.length; i < il; i++)
          if (this.members[i] && typeof this.members[i][method] == 'function')
            this.members[i][method].apply(this.members[i], arguments)

        return method == 'animate' ? (this.fx || (this.fx = new SVG.SetFX(this))) : this
      }
    })

    /* clear methods for the next round */
    methods = []

    /* gather fx methods */
    for(var m in SVG.FX.prototype)
      if (typeof SVG.FX.prototype[m] == 'function' && typeof SVG.SetFX.prototype[m] != 'function')
        methods.push(m)

    /* apply fx aliasses */
    methods.forEach(function(method) {
      SVG.SetFX.prototype[method] = function() {
        for (var i = 0, il = this.set.members.length; i < il; i++)
          this.set.members[i].fx[method].apply(this.set.members[i].fx, arguments)

        return this
      }
    })
  }




  SVG.extend(SVG.Element, {
  	// Store data values on svg nodes
    data: function(a, v, r) {
    	if (typeof a == 'object') {
    		for (v in a)
    			this.data(v, a[v])

      } else if (arguments.length < 2) {
        try {
          return JSON.parse(this.attr('data-' + a))
        } catch(e) {
          return this.attr('data-' + a)
        }

      } else {
        this.attr(
          'data-' + a
        , v === null ?
            null :
          r === true || typeof v === 'string' || typeof v === 'number' ?
            v :
            JSON.stringify(v)
        )
      }

      return this
    }
  })

  SVG.extend(SVG.Element, {
    // Remember arbitrary data
    remember: function(k, v) {
      /* remember every item in an object individually */
      if (typeof arguments[0] == 'object')
        for (var v in k)
          this.remember(v, k[v])

      /* retrieve memory */
      else if (arguments.length == 1)
        return this.memory()[k]

      /* store memory */
      else
        this.memory()[k] = v

      return this
    }

    // Erase a given memory
  , forget: function() {
      if (arguments.length == 0)
        this._memory = {}
      else
        for (var i = arguments.length - 1; i >= 0; i--)
          delete this.memory()[arguments[i]]

      return this
    }

    // Initialize or return local memory object
  , memory: function() {
      return this._memory || (this._memory = {})
    }

  })

  function camelCase(s) {
    return s.toLowerCase().replace(/-(.)/g, function(m, g) {
      return g.toUpperCase()
    })
  }

  // Ensure to six-based hex
  function fullHex(hex) {
    return hex.length == 4 ?
      [ '#',
        hex.substring(1, 2), hex.substring(1, 2)
      , hex.substring(2, 3), hex.substring(2, 3)
      , hex.substring(3, 4), hex.substring(3, 4)
      ].join('') : hex
  }

  // Component to hex value
  function compToHex(comp) {
    var hex = comp.toString(16)
    return hex.length == 1 ? '0' + hex : hex
  }

  // Calculate proportional width and height values when necessary
  function proportionalSize(box, width, height) {
    if (width == null || height == null) {
      if (height == null)
        height = box.height / box.width * width
      else if (width == null)
        width = box.width / box.height * height
    }

    return {
      width:  width
    , height: height
    }
  }

  // Calculate position according to from and to
  function at(o, pos) {
    /* number recalculation (don't bother converting to SVG.Number for performance reasons) */
    return typeof o.from == 'number' ?
      o.from + (o.to - o.from) * pos :

    /* instance recalculation */
    o instanceof SVG.Color || o instanceof SVG.Number ? o.at(pos) :

    /* for all other values wait until pos has reached 1 to return the final value */
    pos < 1 ? o.from : o.to
  }

  // PathArray Helpers
  function arrayToString(a) {
    for (var i = 0, il = a.length, s = ''; i < il; i++) {
      s += a[i][0]

      if (a[i][1] != null) {
        s += a[i][1]

        if (a[i][2] != null) {
          s += ' '
          s += a[i][2]

          if (a[i][3] != null) {
            s += ' '
            s += a[i][3]
            s += ' '
            s += a[i][4]

            if (a[i][5] != null) {
              s += ' '
              s += a[i][5]
              s += ' '
              s += a[i][6]

              if (a[i][7] != null) {
                s += ' '
                s += a[i][7]
              }
            }
          }
        }
      }
    }

    return s + ' '
  }

  // Add more bounding box properties
  function boxProperties(b) {
    b.x2 = b.x + b.width
    b.y2 = b.y + b.height
    b.cx = b.x + b.width / 2
    b.cy = b.y + b.height / 2
  }

  // Parse a matrix string
  function parseMatrix(o) {
    if (o.matrix) {
      /* split matrix string */
      var m = o.matrix.replace(/\s/g, '').split(',')

      /* pasrse values */
      if (m.length == 6) {
        o.a = parseFloat(m[0])
        o.b = parseFloat(m[1])
        o.c = parseFloat(m[2])
        o.d = parseFloat(m[3])
        o.e = parseFloat(m[4])
        o.f = parseFloat(m[5])
      }
    }

    return o
  }

  // Get id from reference string
  function idFromReference(url) {
    var m = url.toString().match(SVG.regex.reference)

    if (m) return m[1]
  }

  // Shim layer with setTimeout fallback by Paul Irish
  window.requestAnimFrame = (function(){
    return  window.requestAnimationFrame       ||
            window.webkitRequestAnimationFrame ||
            window.mozRequestAnimationFrame    ||
            window.msRequestAnimationFrame     ||
            function (c) { window.setTimeout(c, 1000 / 60) }
  })()

  return SVG
}));

define('number',[],function() {
	return {
		roundToOrder: function(number, orderlessTarget, degrees) {
			number = parseFloat(number);

			if (number == 0) return 0;

			if (! degrees) degrees = 2;

			if (orderlessTarget === 1) {
				return parseFloat( number.toPrecision( degrees ) );
			}
			
			return recurse(number, orderlessTarget);

			function recurse(number, orderlessTarget) {
				var magnitude = Math.abs(number);
				if (magnitude >= Math.pow(10, degrees)) {
					number /= 10;
					number = recurse(number, orderlessTarget);
					number *= 10;
				} else if (magnitude < Math.pow(10, degrees - 1)) {
					number *= 10;
					number = recurse(number, orderlessTarget);
					number /= 10;
				} else {
					var roundedValue = Math.round(number / orderlessTarget) * orderlessTarget;
					if (roundedValue === 0) {
						degrees++;
						roundedValue = recurse(number, orderlessTarget);
					}
					number = roundedValue;
				}

				return parseFloat( number.toPrecision( degrees + 1 ) );
			}

		},
		renderValue: function(value) {

			if (value === 0) return "0";
			if (! value) return '';

			var sign = 1;
			if (value < 0) {
				sign = -1;
				value *= -1;
			}

			var value = this.roundToOrder(value, 1, 3);
			var power = 0;

			function recurseToStandardForm(number) {
				if (number == 0) {
					return 0;
				} else if (number >= 1 && number < 1000) {
					return number;
				} else if (number < 1) {
					power -= 3;
					return recurseToStandardForm(number * 1000);
				} else if (number >= 1000) {
					power += 3;
					return recurseToStandardForm(number / 1000);
				}
			}

			var normalizedNumber = new String(sign * recurseToStandardForm(value));

			if (power == 3) {
				return normalizedNumber + "k";
			} else if (power == 6) {
				return normalizedNumber + "m";
			} else if (power == 9) {
				return normalizedNumber + "bn";
			} else if (power == 12) {
				return normalizedNumber + " trillion";
			} else {
				return new String(sign * value);
			}
		},
		getDataTotal: function(data) {
			var dataTotal = 0;
			for (var i = 0; i < data.length; i++) {
				dataTotal += data[i].value;
			}
			return dataTotal;
		},
		getAngle: function(value, dataTotal, totalSize) {
			totalSize = (typeof totalSize === 'undefined') ? Circle.whole : totalSize;
			return (totalSize / dataTotal) * value;
		},
		getFactor: function(number) {
			for (var factor = number - 1; factor > 1; factor--) {
				var fraction = number / factor;
				if (parseInt(fraction) == fraction) {
					return factor;
				}
			}
			
			return number;
		}
	}
});
define('color-scale-key',[
	"svg-js",
	"number"
], function(
	SVG,
	NumberUtilities
) {

return function(chart, tickMarks, maxTintNumber, scale, orientation, positiveColorClass, negativeColorClass) {
	var colorScaleKey = chart.group();

	var colorMarkers = chart.group();
	var colorLabels = chart.group();

	var scaleLength = scale.map(scale.domain.max);

	var configuration = {
		COLOR_MARKER_THICKNESS: 5,
		TICK_MARK_EXTRUDE: 8,
		TICK_LABEL_MARGIN: 5,
		TICK_LABEL_FONT_HEIGHT: 12,
		VALUE_MARKER_THICKNESS: 10,
		VALUE_MARKER_LENGTH: 10,
		VALUE_MARKER_MARGIN: 2		
	};
	colorScaleKey.configuration = configuration;

	if (tickMarks[tickMarks.length - 1].value >= 0) {
		var positiveTickMarks = [];
		var negativeTickMarks = [];
	
		tickMarks.some(function(tickMark, tickMarkIndex) {
			if (tickMark.value >= 0) {
				positiveTickMarks = tickMarks.slice(tickMarkIndex, tickMarks.length + 1);
				negativeTickMarks = tickMarks.slice(0, tickMarkIndex);
				
				return true;
			}
		});
		
		if (negativeTickMarks.length == tickMarks.length || positiveTickMarks.length == tickMarks.length) {
			var tintStepSize = Math.ceil(maxTintNumber / (positiveTickMarks.length - 2));
			tickMarks.forEach(function(tickMark, tickMarkIndex) {
				var tintNumber = parseInt(maxTintNumber - tickMarkIndex * tintStepSize);
				if (tintNumber > 0) {
					tickMark.tintClass = "tint-" + tintNumber;
				}
			});
		} else {
			var positiveTintStepSize = Math.ceil(maxTintNumber / (positiveTickMarks.length - 1));
			positiveTickMarks.forEach(function(tickMark, tickMarkIndex) {
				var tintNumber = parseInt(maxTintNumber - tickMarkIndex * positiveTintStepSize);
				if (tintNumber > 0) {
					tickMark.tintClass = "tint-" + tintNumber;
				}
			});
			
			negativeTickMarks.reverse();
			var negativeTintStepSize = Math.ceil(maxTintNumber / (negativeTickMarks.length - 1));
			negativeTickMarks.forEach(function(tickMark, tickMarkIndex) {
				var tintNumber = parseInt(maxTintNumber - tickMarkIndex * negativeTintStepSize);
				if (tintNumber > 0) {
					tickMark.tintClass = "tint-" + tintNumber;
				}
			});
			negativeTickMarks.reverse();
		}
		
		tickMarks = negativeTickMarks.concat(positiveTickMarks);
	}
	
	colorScaleKey.tickMarks = tickMarks;

	function drawVerticalScale() {
		
		var markerHeight = scaleLength / (tickMarks.length - 1);
		
		tickMarks.forEach(function(tickMark, tickMarkIndex) {

			var markPosition = scaleLength - markerHeight * tickMarkIndex;

			if (tickMarkIndex != tickMarks.length - 1) {
				var colorMarker = chart.rect(configuration.COLOR_MARKER_THICKNESS, markerHeight);
				colorMarker.move(configuration.VALUE_MARKER_LENGTH + configuration.VALUE_MARKER_MARGIN, markPosition - markerHeight);
				
				if (tickMark.value >= 0 || ! negativeColorClass) {
					colorMarker.addClass(positiveColorClass);
				} else {
					colorMarker.addClass(negativeColorClass);
				}
				
				if (tickMark.tintClass) {
					colorMarker.addClass(tickMark.tintClass);
				}
				
				colorMarkers.add(colorMarker);
			}

			var tickLine = chart.line(
				configuration.VALUE_MARKER_LENGTH + configuration.VALUE_MARKER_MARGIN,
				markPosition,
				configuration.VALUE_MARKER_LENGTH + configuration.VALUE_MARKER_MARGIN + configuration.COLOR_MARKER_THICKNESS + configuration.TICK_MARK_EXTRUDE,
				markPosition
			);
			tickLine.addClass("fm-color-scale-key-tick-line");

			var tickLabel = chart.text("" + NumberUtilities.renderValue(tickMark.value));
			tickLabel.move(
				configuration.VALUE_MARKER_LENGTH + configuration.VALUE_MARKER_MARGIN + configuration.COLOR_MARKER_THICKNESS + configuration.TICK_MARK_EXTRUDE + configuration.TICK_LABEL_MARGIN,
				markPosition - configuration.TICK_LABEL_FONT_HEIGHT
			);
			tickLabel.addClass("fm-color-scale-key-tick-label");

			colorMarkers.add(tickLine);
			colorLabels.add(tickLabel);
			
		});

		colorScaleKey.add(colorMarkers);
		colorScaleKey.add(colorLabels);
	}

	function drawHorizontalScale() {
		tickMarks.forEach(function(tickMark, tickMarkIndex) {
			if (tickMarkIndex === tickMarks.length - 1) {
				return;
			}

			var markPosition = scale.map(tickMark.value);

			var colorMarker = chart.rect(scale.map(scale.domain.max) / (tickMarks.length - 1), configuration.COLOR_MARKER_THICKNESS);
			colorMarker.move(markPosition, configuration.VALUE_MARKER_LENGTH + configuration.VALUE_MARKER_MARGIN);
			
			if (tickMark.value >= 0 || ! negativeColorClass) {
				colorMarker.addClass(positiveColorClass);
			} else {
				colorMarker.addClass(negativeColorClass);
			}
			
			if (tickMark.tintClass) {
				colorMarker.addClass(tickMark.tintClass);
			}

			var tickLine = chart.line(
				markPosition,
				configuration.VALUE_MARKER_LENGTH + configuration.VALUE_MARKER_MARGIN,
				markPosition,
				configuration.VALUE_MARKER_LENGTH + configuration.VALUE_MARKER_MARGIN + configuration.COLOR_MARKER_THICKNESS + configuration.TICK_MARK_EXTRUDE
			);
			tickLine.addClass("fm-color-scale-key-tick-line");

			var tickLabel = chart.text("" + NumberUtilities.renderValue(tickMark.value));
			tickLabel.move(
				markPosition - tickLabel.bbox().width / 2,
				configuration.VALUE_MARKER_LENGTH + configuration.VALUE_MARKER_MARGIN + configuration.COLOR_MARKER_THICKNESS + configuration.TICK_MARK_EXTRUDE + configuration.TICK_LABEL_MARGIN
			);

			tickLabel.addClass("fm-color-scale-key-tick-label");

			colorMarkers.add(colorMarker);
			colorMarkers.add(tickLine);
			colorLabels.add(tickLabel);
		});

		var finalTickLine = chart.line(
			scale.map(tickMarks[tickMarks.length - 1].value),
			configuration.VALUE_MARKER_LENGTH + configuration.VALUE_MARKER_MARGIN,
			scale.map(tickMarks[tickMarks.length - 1].value),
			configuration.VALUE_MARKER_LENGTH + configuration.VALUE_MARKER_MARGIN + configuration.COLOR_MARKER_THICKNESS + configuration.TICK_MARK_EXTRUDE
		);
		finalTickLine.addClass("fm-color-scale-key-tick-line");

		var finalTickLabel = chart.text("" + NumberUtilities.renderValue(tickMarks[tickMarks.length - 1].value));
		finalTickLabel.move(
			scale.map(tickMarks[tickMarks.length - 1].value) - finalTickLabel.bbox().width / 2,
			configuration.VALUE_MARKER_LENGTH + configuration.VALUE_MARKER_MARGIN + configuration.COLOR_MARKER_THICKNESS + configuration.TICK_MARK_EXTRUDE + configuration.TICK_LABEL_MARGIN
		);
		finalTickLabel.addClass("fm-color-scale-key-tick-label");
		colorMarkers.add(finalTickLine);
		colorLabels.add(finalTickLabel);

		colorScaleKey.add(colorMarkers);
		colorScaleKey.add(colorLabels);
	}

	if (orientation === "horizontal") {
		drawHorizontalScale();
	} else if (orientation === "vertical") {
		drawVerticalScale();
	} else {
		console.log("Incorrect scale orientation of " + orientation + " specified. Defaulting to vertical.");
		drawVerticalScale();
	}

	colorScaleKey.colorMarkers = colorMarkers;

	colorScaleKey.markValue = function(value, secondary) {
		var markPosition = scale.map(value);

		var markerPoints;

		if (orientation === "horizontal") {
			markerPoints = [
				[markPosition - (1/2 * configuration.VALUE_MARKER_THICKNESS), 0],
				[markPosition, configuration.VALUE_MARKER_LENGTH],
				[markPosition + (1/2 * configuration.VALUE_MARKER_THICKNESS), 0]
			];
		} else {
			markerPoints = [
				[0, scaleLength - markPosition - (1/2 * configuration.VALUE_MARKER_THICKNESS)],
				[configuration.VALUE_MARKER_LENGTH, scaleLength - markPosition],
				[0, scaleLength - markPosition + (1/2 * configuration.VALUE_MARKER_THICKNESS)]
			];
		}

		var valueMarker = chart.polygon().plot(markerPoints);

		valueMarker.addClass("fm-color-scale-key-marker hidden");
		valueMarker.removeClass("hidden");

		if (! secondary) {
			this.valueMarker = valueMarker;
			colorScaleKey.add(this.valueMarker);
		} else {
			this.secondaryValueMarker = valueMarker;
			this.secondaryValueMarker.addClass("secondary");
			colorScaleKey.add(this.secondaryValueMarker);
		}

	};

	colorScaleKey.reset = function() {
		if (this.valueMarker) {
			this.valueMarker.remove();
		}
	};

	return colorScaleKey;
}

});
(function() {
  define('path',[], function() {
    var Path;
    Path = function(init) {
      var areEqualPoints, instructions, plus, point, printInstrunction, push, verbosify;
      instructions = init || [];
      push = function(arr, el) {
        var copy;
        copy = arr.slice(0, arr.length);
        copy.push(el);
        return copy;
      };
      areEqualPoints = function(p1, p2) {
        return p1[0] === p2[0] && p1[1] === p2[1];
      };
      printInstrunction = function(_arg) {
        var command, params;
        command = _arg.command, params = _arg.params;
        return "" + command + " " + (params.join(' '));
      };
      point = function(_arg, _arg1) {
        var command, params, prev_x, prev_y;
        command = _arg.command, params = _arg.params;
        prev_x = _arg1[0], prev_y = _arg1[1];
        switch (command) {
          case 'M':
            return [params[0], params[1]];
          case 'L':
            return [params[0], params[1]];
          case 'H':
            return [params[0], prev_y];
          case 'V':
            return [prev_x, params[0]];
          case 'Z':
            return null;
          case 'C':
            return [params[4], params[5]];
          case 'S':
            return [params[2], params[3]];
          case 'Q':
            return [params[2], params[3]];
          case 'T':
            return [params[0], params[1]];
          case 'A':
            return [params[5], params[6]];
        }
      };
      verbosify = function(keys, f) {
        return function(a) {
          var args;
          args = typeof a === 'object' ? keys.map(function(k) {
            return a[k];
          }) : arguments;
          return f.apply(null, args);
        };
      };
      plus = function(instruction) {
        return Path(push(instructions, instruction));
      };
      return {
        moveto: verbosify(['x', 'y'], function(x, y) {
          return plus({
            command: 'M',
            params: [x, y]
          });
        }),
        lineto: verbosify(['x', 'y'], function(x, y) {
          return plus({
            command: 'L',
            params: [x, y]
          });
        }),
        hlineto: verbosify(['x'], function(x) {
          return plus({
            command: 'H',
            params: [x]
          });
        }),
        vlineto: verbosify(['y'], function(y) {
          return plus({
            command: 'V',
            params: [y]
          });
        }),
        closepath: function() {
          return plus({
            command: 'Z',
            params: []
          });
        },
        curveto: verbosify(['x1', 'y1', 'x2', 'y2', 'x', 'y'], function(x1, y1, x2, y2, x, y) {
          return plus({
            command: 'C',
            params: [x1, y1, x2, y2, x, y]
          });
        }),
        smoothcurveto: verbosify(['x2', 'y2', 'x', 'y'], function(x2, y2, x, y) {
          return plus({
            command: 'S',
            params: [x2, y2, x, y]
          });
        }),
        qcurveto: verbosify(['x1', 'y1', 'x', 'y'], function(x1, y1, x, y) {
          return plus({
            command: 'Q',
            params: [x1, y1, x, y]
          });
        }),
        smoothqcurveto: verbosify(['x', 'y'], function(x, y) {
          return plus({
            command: 'T',
            params: [x, y]
          });
        }),
        arc: verbosify(['rx', 'ry', 'xrot', 'large_arc_flag', 'sweep_flag', 'x', 'y'], function(rx, ry, xrot, large_arc_flag, sweep_flag, x, y) {
          return plus({
            command: 'A',
            params: [rx, ry, xrot, large_arc_flag, sweep_flag, x, y]
          });
        }),
        print: function() {
          return instructions.map(printInstrunction).join(' ');
        },
        points: function() {
          var instruction, prev, ps, _fn, _i, _len;
          ps = [];
          prev = [0, 0];
          _fn = function() {
            var p;
            p = point(instruction, prev);
            prev = p;
            if (p) {
              return ps.push(p);
            }
          };
          for (_i = 0, _len = instructions.length; _i < _len; _i++) {
            instruction = instructions[_i];
            _fn();
          }
          return ps;
        },
        instructions: function() {
          return instructions.slice(0, instructions.length);
        },
        connect: function(path) {
          var first, last, newInstructions;
          last = this.points().slice(-1)[0];
          first = path.points()[0];
          newInstructions = path.instructions().slice(1);
          if (!areEqualPoints(last, first)) {
            newInstructions.unshift({
              command: "L",
              params: first
            });
          }
          return Path(this.instructions().concat(newInstructions));
        }
      };
    };
    return function() {
      return Path();
    };
  });

}).call(this);

define('geometry',[],function() {
	return {
		circle: {
			tenth: 1/5 * Math.PI,
			eighth: 1/4 * Math.PI,
			quarter: 1/2 * Math.PI,
			half: Math.PI,
			whole: 2 * Math.PI,
			getPointOnCircumference: function(x, y, radius, angle) {
				return {
					x: x + radius * Math.sin(angle),
					y: y + -radius * Math.cos(angle)
				};
			},
			getAngle: function(value, dataTotal, totalSize) {
				totalSize = (typeof totalSize === 'undefined') ? this.whole : totalSize;
				return (totalSize / dataTotal) * value;
			}
		}
		
	}
});
define('circle-segment',[
	'svg-js',
	'path',
	'geometry'
], function(
	SVG,
	Path,
	Geometry
) {

	SVG.CircleSegment = SVG.invent({
		create: 'path',

		inherit: SVG.Path,

		construct: {
			circleSegment: function(xOrigin, yOrigin, radius, startAngle, endAngle) {
				var point1 = Geometry.circle.getPointOnCircumference(xOrigin, yOrigin, radius, startAngle);
				var point2 = Geometry.circle.getPointOnCircumference(xOrigin, yOrigin, radius, endAngle);

				var large = ((endAngle - startAngle) > Math.PI) ? 1 : 0;

				var segmentPathString = Path()
					.moveto(xOrigin, yOrigin)
					.lineto(point1.x, point1.y)
					.arc(radius, radius, 0, large, 1, point2.x, point2.y)
					.closepath()
					.print();

				return this.put(new SVG.CircleSegment)
					.attr({
						d: segmentPathString
					});
			}
		}
	});

	var configuration = {

	};

	return configuration;

});
define('configuration-builder',[],function() {
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
define('float',[],function() {
	return {
		left: function() {
			var xTracker = 0;
			var yTracker = 0;
			var rowBottom = 0;
			
			var xPadding = this.xPadding;
			var yPadding = this.yPadding;
			var flowWidth = this.flowWidth;

			this.children().forEach(function(element, index) {
				var bbox = element.bbox();
				
				if (bbox.height + yTracker > rowBottom) {
					rowBottom = bbox.height + yTracker;
				}
				
				if (xTracker + bbox.width > flowWidth) {
					xTracker = 0;
					yTracker = rowBottom + yPadding;
				}
				
				element.move(xTracker, yTracker);
				xTracker += bbox.width + xPadding;
			});
		},
		
		right: function() {
			var xTracker = this.flowWidth;
			var yTracker = 0;
			var rowBottom = 0;
			
			var xPadding = this.xPadding;
			var yPadding = this.yPadding;
			var flowWidth = this.flowWidth;
			
			this.children().forEach(function(element, index) {
				var bbox = element.bbox();
				
				if (bbox.height + yTracker > rowBottom) {
					rowBottom = bbox.height + yTracker;
				}
				
				if (xTracker - bbox.width < 0) {
					xTracker = flowWidth;
					yTracker = rowBottom + yPadding;
				}
				
				xTracker -= bbox.width;
				element.move(xTracker, yTracker);
				xTracker -= xPadding;
			});
		}
	};
});
define('grid',[],function() {
	function getCellSize(elements) {
		var size = {
			height: 0,
			width: 0
		};
		
		elements.forEach(function(element) {
			var bbox = element.bbox();
			
			if (bbox.width > size.width) size.width = bbox.width;
			if (bbox.height > size.height) size.height = bbox.height;
		});
		
		return size;
	}
	
	return {
		left: function() {
			var size = getCellSize(this.children());
			
			var numberOfColumns = Math.floor((this.flowWidth + this.xPadding) / (size.width + this.xPadding));
			if (numberOfColumns < 1) numberOfColumns = 1;
			
			var xPadding = this.xPadding;
			var yPadding = this.yPadding;
			
			this.children().forEach(function(element, index) {
				var column = index % numberOfColumns;
				var row = Math.floor(index / numberOfColumns);
				
				var x = column * (size.width + xPadding);
				var y = row * (size.height + yPadding);
				
				element.move(x, y);
			});
		},
		
		right: function() {
			var size = getCellSize(this.children());
			
			var numberOfColumns = Math.floor((this.flowWidth + this.xPadding) / (size.width + this.xPadding));
			if (numberOfColumns < 1) numberOfColumns = 1;
			
			var xPadding = this.xPadding;
			var yPadding = this.yPadding;
			var flowWidth = this.flowWidth;
			
			this.children().forEach(function(element, index) {
				var column = index % numberOfColumns;
				var row = Math.floor(index / numberOfColumns);
				
				var x = flowWidth - column * (xPadding + size.width) - element.bbox().width;
				var y = row * (size.height + yPadding);
				
				element.move(x, y);
			});
		}
	};
});
define('center',[],function() {
	
	function getTotalWidth(elements) {
		var elementWidths = [];
		elements.forEach(function(element) {
			elementWidths.push(element.bbox().width);
		});

		return elementWidths.reduce(function(previousWidth, currentWidth) {
			return previousWidth + currentWidth;
		});
	}


	return function() {

		var totalWidth = getTotalWidth(this.children()) + this.xPadding * (this.children().length - 1);
		
		var xTracker = (this.flowWidth / 2) - (totalWidth / 2);

		var xPadding = this.xPadding;
		this.children().forEach(function(element) {
			element.move(xTracker, 0);
			xTracker += element.bbox().width + xPadding;
		});

	};
});
define('flow',[
	'svg-js',
	'float',
	'grid',
	'center'
], function(
	SVG,
	Float,
	Grid,
	Center
) {
	SVG.Flow = SVG.invent({
		create: 'g',

		inherit: SVG.G,
		
		extend: {
			setWidth: function(width) {
				this.flowWidth = width;
				
				return this;
			},
			setPadding: function(x, y) {
				this.xPadding = x;
				this.yPadding = y;
				
				return this;
			},
			floatLeft: Float.left,
			floatRight: Float.right,
			gridLeft: Grid.left,
			gridRight: Grid.right,
			center: Center
		},
		
		construct: {
			flow: function(width, xPadding, yPadding) {
				return this.put(new SVG.Flow)
					.setWidth(width)
					.setPadding(xPadding, yPadding);
			}
		}
	});
});
define('key',[
	"flow",
	"float",
	"grid",
	"svg-js"
], function(
	Float,
	Flow,
	Grid,
	SVG
) {

return function(chart, width, values, colorClasses, colorOverrides, lastItemIsOther) {
	
var Configuration = {
	INDICATOR_SIZE: 13,
	TITLE_PADDING_LEFT: 7,
	KEY_ITEM_PADDING_LEFT: 10,
	PADDING_TOP: 20,
	PADDING_RIGHT: 20,
	PADDING_BOTTOM: 20,
	PADDING_LEFT: 20
};

var key = chart.group()
	.addClass("fm-key");
	
key.configuration = Configuration;

var topBorder = chart.line(0, 0, width, 0)
	.addClass("fm-key-top-border");

var centeredKeyItems;
var isReDraw = false;

key.backgroundColorClass = "fm-datum-color-neutral";

key.setValues = function(values, colorOverrides) {
	if (key.keyItems) {
		isReDraw = true;
		key.keyItems.clear();

		key.keyItems = chart.flow(
			width - Configuration.PADDING_RIGHT - Configuration.PADDING_LEFT,
			Configuration.KEY_ITEM_PADDING_LEFT,
			Configuration.PADDING_BOTTOM
		)
			.addClass("fm-key-items");
	}
	
	key.keyItems = chart.flow(
		width - Configuration.PADDING_RIGHT - Configuration.PADDING_LEFT,
		Configuration.KEY_ITEM_PADDING_LEFT,
		Configuration.PADDING_BOTTOM
	)
		.addClass("fm-key-items");

	values.forEach(function(value, valueIndex) {
		var keyItem = chart.group();

		var valueTitle = chart.text(value)
			.move(Configuration.INDICATOR_SIZE + Configuration.TITLE_PADDING_LEFT, 0)
			.addClass("fm-key-value-title");
		var valueIndicator = chart.rect(Configuration.INDICATOR_SIZE, Configuration.INDICATOR_SIZE)
			.addClass("fm-key-value-indicator");
			
		if (lastItemIsOther && valueIndex == values.length - 1) {
			valueIndicator.addClass("fm-datum-color-overflow");
		} else {
			if (colorOverrides && colorOverrides[valueIndex]) {
				valueIndicator.attr({ fill: colorOverrides[valueIndex] });
			} else {
				valueIndicator.addClass(colorClasses[valueIndex]);
			}
		}

		keyItem.add(valueTitle);
		keyItem.add(valueIndicator);

		key.keyItems.add(keyItem);
	});

	key.keyItems.gridLeft();

	var keyBackgroundHeight = key.keyItems.bbox().height + Configuration.PADDING_TOP + Configuration.PADDING_BOTTOM

	if (isReDraw) {
		key.background.attr("height", keyBackgroundHeight);
	} else {
		key.background = chart.rect(width, keyBackgroundHeight)
			.addClass("fm-key-background " + key.backgroundColorClass);
	}

	centeredKeyItems = chart.flow(width, 100, 100);

	centeredKeyItems.add(key.keyItems);
	centeredKeyItems.center();
	centeredKeyItems.move(0, Configuration.PADDING_TOP);

	key.add(key.background);
	key.add(topBorder);
	key.add(centeredKeyItems);
};

key.clearItems = function() {
	key.keyItems.clear();
};

key.setValues(values, colorOverrides);

return key;
	
}

});
define('configuration',[
	'circle-segment',
	'configuration-builder',
	'key'
],
function(
	CircleSegmentConfiguration,
	combineConfigurations,
	KeyConfiguration
) {

var chartConfiguration = {
	// Layout settings
	ASPECT_RATIO: 2.5/3,
	MAX_HEIGHT: 10000,
	SMALL_BREAKPOINT: 500,
	MAP_AREA_PADDING: 0.1,
	TARGET_KEY_AREA_PROPORTION: 1/5,
	DEBOUNCE_TIMEOUT: 200,
	// Spillover size
	SPILLOVER_TOP: 0,
	SPILLOVER_RIGHT: 15,
	SPILLOVER_BOTTOM: 0,
	SPILLOVER_LEFT: 0.15,
	// Padding
	PADDING_FOR_LABELS: 70,
	KEY_AREA_PADDING: 20,
	// Key
	MAX_KEY_WIDTH: 200,
	MAX_KEY_HEIGHT: 200,
	DEFAULT_TARGET_INCREMENT_COUNT: 5,
	MAX_TINT_NUMBER: 9,
	POSITIVE_COLOR_CLASS: "fm-datum-color-wheel-d",
	NEGATIVE_COLOR_CLASS: "fm-datum-color-wheel-k",
	// Thumbnail map
	THUMBNAIL_MAP_SCALE_FACTOR: 0.3,
	THUMBNAIL_MAP_SIDE_PADDING: 30,
	THUMBNAIL_MAP_TOP_BOTTOM_PADDING: 10,
	ANIMATE_SPEED: 120
};

return combineConfigurations([CircleSegmentConfiguration, chartConfiguration]);
	
});
define('tooltip-background',[
	'svg-js',
	'path'
], function(
	SVG,
	Path
) {

SVG.TooltipBackground = SVG.invent({
	create: 'path',

	inherit: SVG.Path,

	extend: {
		setConfiguration: function(configuration) {
			this.configuration = configuration;

			return this;
		}
	},

	construct: {
		tooltipBackground: function(
			type,
			width,
			height
		) {

			var configuration = {
				ARROW_LENGTH: 7,
				ARROW_THICKNESS: 10,
				BORDER_RADIUS: 5
			};

			var heightWithoutRoundedCorners = (height - configuration.BORDER_RADIUS * 2);

			var sectionOnePoints = [];
			var sectionTwoPoints = [];

			function getSingleSectionPointsWithTopArrow() {
				var points = [];
				var widthWithoutRoundedCorners = width - configuration.BORDER_RADIUS * 2;
				
				points.push({ x: -configuration.ARROW_THICKNESS / 2, y: configuration.ARROW_LENGTH });
				points.push({ x: -widthWithoutRoundedCorners / 2, y: configuration.ARROW_LENGTH });
				points.push({ x: -width / 2, y: configuration.ARROW_LENGTH });
				points.push({ x: -width / 2, y: configuration.ARROW_LENGTH + configuration.BORDER_RADIUS });
				points.push({ x: -width / 2, y: configuration.ARROW_LENGTH + configuration.BORDER_RADIUS + heightWithoutRoundedCorners });
				points.push({ x: -width / 2, y: configuration.ARROW_LENGTH + height });
				points.push({ x: -width / 2 + configuration.BORDER_RADIUS, y: configuration.ARROW_LENGTH + height });
				points.push({ x: widthWithoutRoundedCorners / 2, y: configuration.ARROW_LENGTH + height });
				points.push({ x: width / 2, y: configuration.ARROW_LENGTH + height });
				points.push({ x: width / 2, y: configuration.ARROW_LENGTH + configuration.BORDER_RADIUS + heightWithoutRoundedCorners });
				points.push({ x: width / 2, y: configuration.ARROW_LENGTH + configuration.BORDER_RADIUS });
				points.push({ x: width / 2, y: configuration.ARROW_LENGTH });
				points.push({ x: widthWithoutRoundedCorners / 2, y: configuration.ARROW_LENGTH }); 
				points.push({ x: configuration.ARROW_THICKNESS / 2, y: configuration.ARROW_LENGTH });
				
				return points;
			}
			
			function getSingleSectionPointsWithLeftArrow() {
				var points = [];
				
				points.push({ x: configuration.ARROW_LENGTH, y: -1/2 * configuration.ARROW_THICKNESS });
				points.push({ x: configuration.ARROW_LENGTH, y: -1/2 * heightWithoutRoundedCorners });
				points.push({ x: configuration.ARROW_LENGTH, y: -1/2 * height });
				points.push({ x: configuration.ARROW_LENGTH + configuration.BORDER_RADIUS, y: -1/2 * height });
				points.push({ x: configuration.ARROW_LENGTH + width - configuration.BORDER_RADIUS, y: -1/2 * height });
				points.push({ x: configuration.ARROW_LENGTH + width, y: -1/2 * height });
				points.push({ x: configuration.ARROW_LENGTH + width, y: -1/2 * heightWithoutRoundedCorners });
				points.push({ x: configuration.ARROW_LENGTH + width, y: 1/2 * heightWithoutRoundedCorners });
				points.push({ x: configuration.ARROW_LENGTH + width, y: 1/2 * height });
				points.push({ x: configuration.ARROW_LENGTH + width - configuration.BORDER_RADIUS, y: 1/2 * height });
				points.push({ x: configuration.ARROW_LENGTH + configuration.BORDER_RADIUS, y: 1/2 * height });
				points.push({ x: configuration.ARROW_LENGTH, y: 1/2 * height });
				points.push({ x: configuration.ARROW_LENGTH, y: 1/2 * heightWithoutRoundedCorners });
				points.push({ x: configuration.ARROW_LENGTH, y: 1/2 * configuration.ARROW_THICKNESS });
				
				return points;
			}
			
			function getSectionPointsWithTopArrow() {
				var points = [];

				var widthWithoutRoundedCorners = width - configuration.BORDER_RADIUS * 2;
				
				points.push({ x: -configuration.ARROW_THICKNESS / 2, y: configuration.ARROW_LENGTH });
				points.push({ x: -widthWithoutRoundedCorners / 2, y: configuration.ARROW_LENGTH });
				points.push({ x: -width / 2, y: configuration.ARROW_LENGTH });
				points.push({ x: -width / 2, y: configuration.ARROW_LENGTH + configuration.BORDER_RADIUS });
				points.push({ x: -width / 2, y: configuration.ARROW_LENGTH + configuration.BORDER_RADIUS + heightWithoutRoundedCorners });
				points.push({ x: -width / 2, y: configuration.ARROW_LENGTH + height });
				points.push({ x: -width / 2 + configuration.BORDER_RADIUS, y: configuration.ARROW_LENGTH + height });
				points.push({ x: width / 2, y: configuration.ARROW_LENGTH + height });
				points.push({ x: width / 2, y: configuration.ARROW_LENGTH });
				points.push({ x: configuration.ARROW_THICKNESS / 2, y: configuration.ARROW_LENGTH });
				
				return points;
			}
			
			function getSectionPointsWithLeftArrow() {
				var points = [];
				
				points.push({ x: configuration.ARROW_LENGTH, y: -1/2 * configuration.ARROW_THICKNESS });
				points.push({ x: configuration.ARROW_LENGTH, y: -1/2 * heightWithoutRoundedCorners });
				points.push({ x: configuration.ARROW_LENGTH, y: -1/2 * height });
				points.push({ x: configuration.ARROW_LENGTH + configuration.BORDER_RADIUS, y: -1/2 * height });
				points.push({ x: configuration.ARROW_LENGTH + width, y: -1/2 * height });
				points.push({ x: configuration.ARROW_LENGTH + width, y: 1/2 * height });
				points.push({ x: configuration.ARROW_LENGTH + configuration.BORDER_RADIUS, y: 1/2 * height });
				points.push({ x: configuration.ARROW_LENGTH, y: 1/2 * height });
				points.push({ x: configuration.ARROW_LENGTH, y: 1/2 * heightWithoutRoundedCorners });
				points.push({ x: configuration.ARROW_LENGTH, y: 1/2 * configuration.ARROW_THICKNESS });
				
				return points;
			}			
			
			function getSectionPoints() {
				var points = [];
		
				points.push({ x: -width + configuration.BORDER_RADIUS, y: 0 });
				points.push({ x: -width, y: 0 });
				points.push({ x: -width, y: configuration.BORDER_RADIUS });
				points.push({ x: -width, y: height - configuration.BORDER_RADIUS });
				points.push({ x: -width, y: height });
				points.push({ x: -width + configuration.BORDER_RADIUS, y: height });
				points.push({ x: 0, y: height });
	
				return points;
			}
			
			function setUpSingleSectionWithTopOrBottomArrowPathString(points) {
				return Path()
					.moveto(0, 0)
					.lineto(points[0].x, points[0].y)
					.lineto(points[1].x, points[1].y)
					.smoothcurveto(
						points[2].x, points[2].y,
						points[3].x, points[3].y
					)
					.lineto(points[4].x, points[4].y)
					.smoothcurveto(
						points[5].x, points[5].y,
						points[6].x, points[6].y
					)
					.lineto(points[7].x, points[7].y)
					.smoothcurveto(
						points[8].x, points[8].y,
						points[9].x, points[9].y
					)
					.lineto(points[10].x, points[10].y)
					.smoothcurveto(
						points[11].x, points[11].y,
						points[12].x, points[12].y
					)
					.lineto(points[13].x, points[13].y)
					.closepath()
					.print();
			}

			function setUpSingleSectionWithLeftOrRightArrowPathString(points) {
				return Path()
					.moveto(0, 0) 
					.lineto(points[0].x, points[0].y)
					.lineto(points[1].x, points[1].y)
					.smoothcurveto(
						points[2].x, points[2].y,
						points[3].x, points[3].y
					)
					.lineto(points[4].x, points[4].y)
					.smoothcurveto(
						points[5].x, points[5].y,
						points[6].x, points[6].y
					)
					.lineto(points[7], points[7])
					.smoothcurveto(
						points[8].x, points[8].y,
						points[9].x, points[9].y
					)
					.lineto(points[10].x, points[10].y)
					.smoothcurveto(
						points[11].x, points[11].y,
						points[12].x, points[12].y
					)
					.lineto(points[13].x, points[13].y)
					.closepath()
					.print();
			}
				
			function setUpSectionPathString(points) {
				return Path()
					.moveto(0, 0) 
					.lineto(points[0].x, points[0].y)
					.smoothcurveto(
						points[1].x, points[1].y,
						points[2].x, points[2].y
					)
					.lineto(points[3].x, points[3].y)
					.smoothcurveto(
						points[4].x, points[4].y,
						points[5].x, points[5].y
					)
					.lineto(points[6].x, points[6].y)
					.closepath()
					.print();	
			}
			
			function setUpSectionWithTopOrBottomArrowPathString(points) {
				return Path()
					.moveto(0, 0)
					.lineto(points[0].x, points[0].y)
					.lineto(points[1].x, points[1].y)
					.smoothcurveto(
						points[2].x, points[2].y,
						points[3].x, points[3].y
					)
					.lineto(points[4].x, points[4].y)
					.smoothcurveto(
						points[5].x, points[5].y,
						points[6].x, points[6].y
					)
					.lineto(points[7].x, points[7].y)
					.lineto(points[8].x, points[8].y)
					.lineto(points[9].x, points[9].y)
					.lineto(0, 0)
					.print();
			}
			

				
			function setUpSectionWithLeftOrRightArrowPathString(points) {
				return Path()
					.moveto(0, 0)
					.lineto(points[0].x, points[0].y)
					.lineto(points[1].x, points[1].y)
					.smoothcurveto(
						points[2].x, points[2].y,
						points[3].x, points[3].y
					)
					.lineto(points[4].x, points[4].y)
					.lineto(points[5].x, points[5].y)
					.lineto(points[6].x, points[6].y)
					.smoothcurveto(
						points[7].x, points[7].y,
						points[8].x, points[8].y
					)
					.lineto(points[9].x, points[9].y)
					.closepath()
					.print();
			}

			var points;
			var tooltipBackgroundPath = new SVG.TooltipBackground;
			var segmentPathString;
			
			if (type == "singleTop" || type == "singleBottom") {
				points = getSingleSectionPointsWithTopArrow();
				segmentPathString = setUpSingleSectionWithTopOrBottomArrowPathString(points);
			} else if (type == "singleLeft" || type == "singleRight") {
				points = getSingleSectionPointsWithLeftArrow();
				segmentPathString = setUpSingleSectionWithLeftOrRightArrowPathString(points);
			} else if (type == "leftSection" || type == "rightSection") {
				points = getSectionPoints();
				segmentPathString = setUpSectionPathString(points);
			} else if (
				type == "leftSectionWithTopArrow"
				|| type == "rightSectionWithBottomArrow"
				|| type == "rightSectionWithTopArrow"
				|| type == "leftSectionWithBottomArrow"
			) {
				points = getSectionPointsWithTopArrow();
				segmentPathString = setUpSectionWithTopOrBottomArrowPathString(points);
			} else if (type == "leftSectionWithLeftArrow" || type == "rightSectionWithRightArrow") {
				points = getSectionPointsWithLeftArrow();
				segmentPathString = setUpSectionWithLeftOrRightArrowPathString(points);
			}
			
			tooltipBackgroundPath.attr({
					d: segmentPathString
				})
				.addClass("fm-tooltip-background")
				.setConfiguration(configuration);
			
			if (
				type == "singleRight"
				|| type == "rightSection"
				|| type == "rightSectionWithRightArrow"
				|| type == "rightSectionWithTopArrow"
			) {
				tooltipBackgroundPath
				//	.translate(2 * x, 0)
					.scale(-1, 1);
			} else if (
				type == "singleBottom"
				|| type == "leftSectionWithBottomArrow"
			) {
				tooltipBackgroundPath
				//	.translate(0, 2 * y)
					.scale(1, -1);
			} else if (type == "rightSectionWithBottomArrow") {
				tooltipBackgroundPath
				//	.translate(2 * x, 2 * y)
					.scale(-1, -1);
			}
			
			return tooltipBackgroundPath;
		}
	}
});

});
define('G.unshift',['svg-js'], function(SVG) {
	SVG.extend(SVG.G, {
		unshift: function(svgJSElement) {
			this.node.insertBefore(svgJSElement.node, this.children()[0].node);
		}
	});
});
define('multi-measure-tooltip',[
	"svg-js",
	"tooltip-background",
	"G.unshift"
], function(
	SVG,
	TooltipBackground,
	Unshift
) {

return function(
	chart,
	title,
	measures,
	colorClasses,
	arrowPosition
) {

	var configuration = {
		INDICATOR_SIZE: 7,
		LINE_SPACING: 5,
		PADDING: 10,
		COLUMN_SPACING: 10
	};

	var tooltip = chart.group().addClass("fm-tooltip fm-multi-measure-tooltip");

	tooltip.configuration = configuration;

	tooltip.title = chart.text("" + title)
		.attr({
			"text-anchor": "middle"
		})
		.addClass("fm-multi-measure-tooltip-title");
	tooltip.add(tooltip.title);
	var titleObjectBBox = tooltip.title.bbox();

	tooltip.measures = [];
	var measureGroup = chart.group();
	measures.forEach(function(measureItem, measureIndex) {
		var indicator = chart.circle(
			configuration.INDICATOR_SIZE,
			configuration.INDICATOR_SIZE
		)
			.addClass("fm-multi-measure-tooltip-measure-indicator " + colorClasses[measureIndex]);

		var measure = {
			indicator: indicator,
			title: chart.text(measureItem.title).addClass("fm-multi-measure-tooltip-measure-label"),
			value: chart.text("" + measureItem.value).addClass("fm-multi-measure-tooltip-measure-value")
		};

		measureGroup.add(measure.indicator);
		measureGroup.add(measure.title);
		measureGroup.add(measure.value);

		tooltip.measures.push(measure);
	});

	tooltip.add(measureGroup);

	var tooltipBackgroundHeight = titleObjectBBox.height
		+ configuration.PADDING * 2
		+ configuration.LINE_SPACING;
	var maxMeasureTitleWidth;
	var maxMeasureValueWidth;

	tooltip.measures.forEach(function(measureItem, measureIndex) {
		var measureItemTitleBBox = measureItem.title.bbox();
		var measureItemValueBBox = measureItem.value.bbox();

		tooltipBackgroundHeight += Math.max(
			measureItemTitleBBox.height,
			measureItemTitleBBox.height
		);
		if (measureIndex > 0) {
			tooltipBackgroundHeight += configuration.LINE_SPACING;
		}
		if (measureIndex === 0) {
			maxMeasureTitleWidth = measureItemTitleBBox.width;
			maxMeasureValueWidth = measureItemValueBBox.width;
		}
		if (measureItemTitleBBox.width > maxMeasureTitleWidth) {
			maxMeasureTitleWidth = measureItemTitleBBox.width;
		}

		if (measureItemValueBBox.width > maxMeasureValueWidth) {
			maxMeasureValueWidth = measureItemValueBBox.width;
		}
	});

	var tooltipBackgroundWidth = configuration.INDICATOR_SIZE 
		+ Math.max(maxMeasureTitleWidth, titleObjectBBox.width)
		+ maxMeasureValueWidth
		+ configuration.COLUMN_SPACING * 2
		+ configuration.PADDING * 2;

	var tooltipBackgroundType;
	if (arrowPosition == "left") {
		tooltipBackgroundType = "singleLeft";
	} else if (arrowPosition == "right") {
		tooltipBackgroundType = "singleRight";
	} else {
		throw "Invalid arrow position for multi-tier tooltip";
	}
	
	tooltip.background = chart.tooltipBackground(
		tooltipBackgroundType,
		tooltipBackgroundWidth,
		tooltipBackgroundHeight
	);

	tooltip.unshift(tooltip.background);

	if (arrowPosition == "left") {
		var titleXPosition = tooltip.background.configuration.ARROW_LENGTH
			+ tooltipBackgroundWidth / 2;
	
		var baseYPosition = -(tooltipBackgroundHeight - configuration.PADDING * 2) / 2;

		tooltip.title.move(
			titleXPosition,
			baseYPosition
		);

		var measureTitleXPosition = tooltip.background.configuration.ARROW_LENGTH
			+ configuration.PADDING
			+ configuration.INDICATOR_SIZE
			+ configuration.COLUMN_SPACING;

		var measureValueXPosition = tooltip.background.configuration.ARROW_LENGTH
			+ tooltipBackgroundWidth
			- configuration.PADDING;

		var indicatorXPosition = tooltip.background.configuration.ARROW_LENGTH
			+ configuration.PADDING;
		var yTracker = baseYPosition + titleObjectBBox.height + configuration.LINE_SPACING;

		tooltip.measures.forEach(function(measureItem) {
			var measureItemTitleBBox = measureItem.title.bbox();
			var measureItemValueBBox = measureItem.value.bbox();

			measureItem.title.move(
				measureTitleXPosition,
				yTracker
			);

			measureItem.indicator.move(
				indicatorXPosition,
				yTracker + measureItemTitleBBox.height / 2
			);

			measureItem.value.move(
				measureValueXPosition,
				yTracker
			);

			measureItem.value.attr({
				"text-anchor": "end"
			});

			yTracker += Math.max(
				measureItemTitleBBox.height,
				measureItemValueBBox.height
			) + configuration.LINE_SPACING;
		});
	} else {
		var titleXPosition = -tooltip.background.configuration.ARROW_LENGTH
			- tooltipBackgroundWidth / 2;

		var baseYPosition = -(tooltipBackgroundHeight - configuration.PADDING * 2) / 2;

		tooltip.title.move(
			titleXPosition,
			baseYPosition
		);

		var measureTitleXPosition = -tooltipBackgroundWidth
			- tooltip.background.configuration.ARROW_LENGTH
			+ configuration.PADDING
			+ configuration.INDICATOR_SIZE
			+ configuration.COLUMN_SPACING;

		var measureValueXPosition = -tooltip.background.configuration.ARROW_LENGTH
			- configuration.PADDING;

		var indicatorXPosition = -tooltipBackgroundWidth
			- tooltip.background.configuration.ARROW_LENGTH
			+ configuration.PADDING;
		var yTracker = baseYPosition + titleObjectBBox.height + configuration.LINE_SPACING;

		tooltip.measures.forEach(function(measureItem) {
			var measureItemTitleBBox = measureItem.title.bbox();
			var measureItemValueBBox = measureItem.value.bbox();

			measureItem.title.move(
				measureTitleXPosition,
				yTracker
			);

			measureItem.title.attr({
				"text-anchor": "start"
			});

			measureItem.indicator.move(
				indicatorXPosition,
				yTracker + measureItemTitleBBox.height / 2
			);

			measureItem.value.move(
				measureValueXPosition,
				yTracker
			);

			measureItem.value.attr({
				"text-anchor": "end"
			});

			yTracker += Math.max(
				measureItemTitleBBox.height,
				measureItemValueBBox.height
			) + configuration.LINE_SPACING;
		});
	}

	return tooltip;
}

});
define('tooltip',[
	"svg-js",
	"tooltip-background",
	"G.unshift"
], function(
	SVG,
	TooltipBackground,
	Unshift
) {

return function(
	chart,
	mainText,
	arrowPosition,
	icon
) {
	var configuration = {
		PADDING: 7,
		ICON_SPACING: 9
	};

	var tooltip = chart.group()
		.addClass("fm-tooltip");

	tooltip.configuration = configuration;

	tooltip.mainTextObject = chart.text("" + mainText);
	tooltip.add(tooltip.mainTextObject);
	var mainTextObjectBBox = tooltip.mainTextObject.bbox();

	var backgroundWidth = mainTextObjectBBox.width + 2 * configuration.PADDING;
	var backgroundHeight = mainTextObjectBBox.height + 2 * configuration.PADDING;

	var iconWidth = 0;
	var iconHeight = 0;
	if (icon) {
		var iconBBox = icon.bbox();
		iconWidth = iconBBox.width;
		iconHeight = iconBBox.height;

		backgroundWidth = mainTextObjectBBox.width + iconWidth + 2 * configuration.ICON_SPACING + configuration.PADDING;
		backgroundHeight = Math.max(iconHeight, mainTextObjectBBox.height) + 2 * configuration.PADDING;

		tooltip.add(icon);
	}

	var backgroundType;
	switch (arrowPosition) {
		case "left": 
			backgroundType = "singleLeft";
			break;
		case "right":
			backgroundType = "singleRight";
			break;
		case "top":
			backgroundType = "singleTop";
			break;
		case "bottom":
			backgroundType = "singleBottom";
			break;
		default: 
			backgroundType = "singleLeft";
			break;
	}

	tooltip.background = chart.tooltipBackground(
		backgroundType,
		backgroundWidth,
		backgroundHeight
	);

	tooltip.unshift(tooltip.background);

	var xTracker;
	if (arrowPosition == "left") {
		xTracker = tooltip.background.configuration.ARROW_LENGTH;
		if (icon) {
			xTracker += configuration.ICON_SPACING;
			icon.move(
				xTracker,
				-iconHeight / 2
			);
			xTracker += iconWidth + configuration.ICON_SPACING;
		} else {
			xTracker += configuration.PADDING
		}
		tooltip.mainTextObject.move(
			xTracker,
			-mainTextObjectBBox.height / 2
		);
	} else if (arrowPosition == "right") {
		xTracker = -tooltip.background.configuration.ARROW_LENGTH;
		if (icon) {
			xTracker -= configuration.ICON_SPACING;
			icon.move(
				xTracker - iconWidth,
				-iconHeight / 2
			);
			xTracker -= iconWidth + configuration.ICON_SPACING;
		} else {
			xTracker -= configuration.PADDING;
		}
		tooltip.mainTextObject.attr({ "text-anchor": "end" });
		tooltip.mainTextObject.move(
			xTracker,
			-mainTextObjectBBox.height / 2
		);	
	} else if (arrowPosition == "top") {
		xTracker = -configuration.PADDING;
		if (icon) {
			xTracker += configuration.ICON_SPACING;
			icon.move(
				xTracker,
				-iconHeight / 2
			);
			xTracker += iconWidth + configuration.ICON_SPACING;
		} else {
			xTracker += configuration.PADDING
		}
		tooltip.mainTextObject.attr({ "text-anchor": "middle" });
		tooltip.mainTextObject.move(
			xTracker,
			tooltip.background.configuration.ARROW_LENGTH + mainTextObjectBBox.height / 2
		);
	} else if (arrowPosition == "bottom") {
		xTracker = -configuration.PADDING;
		if (icon) {
			xTracker += configuration.ICON_SPACING;
			icon.move(
				xTracker,
				-iconHeight / 2
			);
			xTracker += iconWidth + configuration.ICON_SPACING;
		} else {
			xTracker += configuration.PADDING
		}
		tooltip.mainTextObject.attr({ "text-anchor": "middle" });
		tooltip.mainTextObject.move(
			xTracker,
			-tooltip.background.configuration.ARROW_LENGTH - mainTextObjectBBox.height / 2 - backgroundHeight / 2
		);
	}
	
	return tooltip;
}

});
define('scale',[],function() {
	var Projection = function() {
		this.domain = null;
		this.range = null;
	};

	Projection.prototype.map = function(value) {
		var proportion = this.domain.getProportion(value);
		return this.range.getValue(proportion);
	};
	
	function bottomUpIncrements(start, end, numberOfIncrements, incrementSize) {
		var rangeOfScale = end - start;
		var rangeOfIncrements = incrementSize * numberOfIncrements;

		if (rangeOfIncrements > end) {
			if (start >= 0 && start < incrementSize) {
				start = 0;
			} else {
				start -= (rangeOfIncrements - rangeOfScale) / 2;
			}
		}

		var increments = [];

		var counter = start;
		while (increments.length < numberOfIncrements + 1) {
			increments.push(counter);
			counter += incrementSize;
		}
		
		return increments;
	}
	
	function middleOutIncrements(start, end, incrementSize) {
		var increments = [];

		var counter;
		for (counter = 0; counter < end; counter += incrementSize) {
			increments.push(counter);
		}
		increments.push(counter);
		
		for (counter = -incrementSize; counter > start; counter -= incrementSize) {
			increments.unshift(counter);
		}
		increments.unshift(counter);
		
		return increments;
	}

	function getIncrements(start, end, numberOfIncrements) {
		var straddlesZero = end * start < 0;
		
		var range = end - start;
		
		var numberOfRegions = numberOfIncrements - 1;
		var incrementSize = getNiceIncrement(range, numberOfRegions);

		var increments;
		if (straddlesZero) {
			increments = middleOutIncrements(start, end, incrementSize);
		} else {
			increments = bottomUpIncrements(start, end, numberOfIncrements, incrementSize);
		}

		return increments;
	}

	function getNiceIncrement(range, numberOfRegions) {
		var uglyIncrement = range / numberOfRegions;

		var order = Math.floor(Math.log(uglyIncrement) / Math.LN10);
		var divisor = Math.pow(10, order);

		return Math.ceil(uglyIncrement / divisor) * divisor;
	}
	 
	var numberOfIncrements = 0;
	
	return function() {
		return {
			withIncrements: function(increments) {
				numberOfIncrements = increments;

				return this;
			},
			project: function(domain) {
				var projection = new Projection();
		
				projection.domain = domain;
			
				return {
					onto: function(range) {
						projection.range = range;
				
						return projection;
					}
				};
			},
			domains: {
				RealNumbers: function(min, max) {
					if (numberOfIncrements > 0) {
						this.increments = getIncrements(min, max, numberOfIncrements, false);
					
						this.min = this.increments[0];
						this.max = this.increments[this.increments.length - 1];
					} else {
						this.min = min;
						this.max = max;
					}
		
					this.getProportion = function(value) {
						return (value - this.min) / (this.max - this.min);
					};

					return this;
				}
			},
			ranges: {
				Angle: function(start, end) {
					if (start === undefined) {
						start = 0;
					}
		
					if (end === undefined) {
						end = 2 * Math.PI;
					}
		
					this.getValue = function(proportion) {
						var angle = start + (end - start) * proportion;

						if (angle > 2 * Math.PI) {
							angle = angle % 2 * Math.PI;
						} else if (angle < 0) {
							while (angle < 0) {
								angle += 2 * Math.PI;
							}
						}

						return angle;
					};
					
					return this;
				},
				Chromatic: {},
				Linear: function(start, end) {
					if (start === undefined || end === undefined) {
						throw "Both start and end points must be defined for linear scales.";
					}
		
					this.getValue = function(proportion) {
						return start + (end - start) * proportion;
					};
					
					return this;
				},
				Logarithmic: {},
				PointOnPath: {}
			}
		}
	};

});
define('utilities',[
	"color",
	"configuration",
	"geometry",
	"path",
	"scale"
],
function(
	Color,
	Configuration,
	Geometry,
	Path,
	Scale
) {

function applyBorderFilter(chart, map) {
	var dilateRadius = 1.2 / map.scaleFactor;
	var namespace = "http://www.w3.org/2000/svg";

	var filter = document.createElementNS(namespace, "filter");
	filter.id = "black-border";
	filter.setAttribute("x", "-5%");
	filter.setAttribute("y", "-5%");
	filter.setAttribute("width", "110%");
	filter.setAttribute("height", "110%");

	var morphology = document.createElementNS(namespace, "feMorphology");
	morphology.setAttribute("in", "SourceAlpha");
	morphology.setAttribute("operator", "dilate");
	morphology.setAttribute("radius", "" + dilateRadius);
	morphology.setAttribute("result", "border");

	var gaussianBlur = document.createElementNS(namespace, "feGaussianBlur");
	gaussianBlur.setAttribute("in", "border");
	gaussianBlur.setAttribute("result", "blurred-border");
	gaussianBlur.setAttribute("stdDeviation", "0.1");

	var merge = document.createElementNS(namespace, "feMerge");
	var mergeNodeOne = document.createElementNS(namespace, "feMergeNode");
	mergeNodeOne.setAttribute("in", "blurred-border");
	var mergeNodeTwo = document.createElementNS(namespace, "feMergeNode");
	mergeNodeTwo.setAttribute("in", "SourceGraphic");
	merge.appendChild(mergeNodeOne);
	merge.appendChild(mergeNodeTwo);

	filter.appendChild(morphology);
	filter.appendChild(gaussianBlur);
	filter.appendChild(merge);

    chart.node.querySelector("defs").appendChild(filter);
}

/*
 * Map groups to corresponding colours
 */
function buildColorGroupMap(groups, classes) {
	var map = {};
	groups.forEach(function(currentGroup, groupIndex) {
		map[currentGroup] = classes[groupIndex];
	});
	return map;
}

/*
 * Create an array of colour classes accounting for overrides
 */
function collateColorClasses(groups, options) {
	var classes = Color.harmonious(groups.length);
	groups.forEach(function(group, groupIndex) {
		var camelCaseGroupName = group.replace(/(?:^\w|[A-Z]|\b\w)/g, function(letter, index) {
				return index == 0 ? letter.toLowerCase() : letter.toUpperCase();
			}).replace(/\s+/g, '');
		var optionName = "colorClass" + camelCaseGroupName.charAt(0).toUpperCase() + camelCaseGroupName.substring(1);
		if (options[optionName]) {
			classes[groupIndex] = options[optionName];
		}
	});

	return classes;
}

/*
 * Create an array of the groups in the data
 */
function getGroupsFromKeys(keys) {
	var groups = [];

	for (var keyIndex = 1; keyIndex < keys.length; keyIndex++) {
		groups.push(keys[keyIndex].textContent);
	}

	return groups;
}

/*
 * Create a Scale object
 */
function createScale(rows, targetNumberOfIncrements, keySize) {
	if (! targetNumberOfIncrements) {
		targetNumberOfIncrements = Configuration.DEFAULT_TARGET_INCREMENT_COUNT;
	}
	var maxValue = Math.max
		.apply(Math, rows.map(function(row) {
			return row.value
		}));

	return Scale()
		.withIncrements(targetNumberOfIncrements)
		.project(new Scale().domains.RealNumbers(0, maxValue))
		.onto(new Scale().ranges.Linear(0, keySize));
}

/*
 * Create a deep clone of an SVG.js group, including one level of nested groups
 */
function cloneGroup(group) {
	var clone = group.parent.group();
	group.each(function(childIndex, children) {
		var childToAdd;

		if (children[childIndex].type == "g") {
			childToAdd = children[childIndex].clone();
			children[childIndex].each(function(innerChildIndex, innerChildren) {
				var innerChildToAdd = innerChildren[innerChildIndex].clone();

				innerChildToAdd.title = children[childIndex].title;
				if (! isNaN(children[childIndex].value)) {
					innerChildToAdd.value = children[childIndex].value;
				}
				if (children[childIndex].values) {
					innerChildToAdd.values = children[childIndex].values;
				}

				childToAdd.add(innerChildToAdd);
			})
		} else {
			childToAdd = children[childIndex].clone();
		}

		childToAdd.title = children[childIndex].title;
		if (! isNaN(children[childIndex].value)) {
			childToAdd.value = children[childIndex].value;
		}
		if (children[childIndex].values) {
			childToAdd.values = children[childIndex].values;
		}

		clone.add(childToAdd);

	});

	return clone;
}

/*
 * Draw a "zoom-in" magnifying glass icon
 */
function drawZoomIcon(chart, color, size) {
	if (! color) {
		color = "black";
	}
	if (! size) {
		size = 0.22;
	}
	
	var icon = chart.group();

	var plusSymbol = chart.path("M42.4,23.1v39 M22.9,42.6h40")
		.attr({
			"fill": "none",
			"stroke": color,
			"stroke-width": "9",
			"stroke-miterlimit": "10"
		});
	var handle = chart.path("M78,43c0,19.3-15.7,35-35,35S8,62.3,8,43 S23.7,8,43,8S78,23.7,78,43z M67.2,68.3l30.2,30")
		.attr({
			"fill": "none",
			"stroke": color,
			"stroke-width": "16",
			"stroke-miterlimit": "10"
		});

	icon.add(plusSymbol);
	icon.add(handle);

	icon.scale(size, size);

	icon.addClass("fm-choropleth-zoom-icon");

	return icon;
}


/*
 * Draw visible rectangles to illustrate layout regions (for testing only)
 */
function drawTestRegions(chart, layout) {
	var mapArea = chart.rect(
		layout.drawRegions.mapArea.width,
		layout.drawRegions.mapArea.height
	);
	mapArea.move(
		layout.drawRegions.mapArea.x,
		layout.drawRegions.mapArea.y
	);
	mapArea.attr({
		"fill": "transparent",
		"stroke": "black"
	});

	var keyArea = chart.rect(
		layout.drawRegions.keyArea.width,
		layout.drawRegions.keyArea.height
	);
	keyArea.move(
		layout.drawRegions.keyArea.x,
		layout.drawRegions.keyArea.y
	);
	keyArea.attr({
		"fill": "transparent",
		"stroke": "black"
	});

	return {
		mapArea: mapArea,
		keyArea: keyArea
	};
}

function hasCollision(bBoxOne, bBoxTwo) {
	return !(
		((bBoxOne.y + bBoxOne.height) < (bBoxTwo.y)) ||
		(bBoxOne.y > (bBoxTwo.y + bBoxTwo.height)) ||
		((bBoxOne.x + bBoxOne.width) < bBoxTwo.x) ||
		(bBoxOne.x > (bBoxTwo.x + bBoxTwo.width))
	)
}

return {
	applyBorderFilter: applyBorderFilter,
	buildColorGroupMap: buildColorGroupMap,
	collateColorClasses: collateColorClasses,
	getGroupsFromKeys: getGroupsFromKeys,
	cloneGroup: cloneGroup,
	createScale: createScale,
	drawTestRegions: drawTestRegions,
	drawZoomIcon: drawZoomIcon,
	hasCollision: hasCollision
};

});
define('chart',[
	"color",
	"color-scale-key",
	"configuration",
	"key",
	"multi-measure-tooltip",
	"number",
	"path",
	"svg-js",
	"tooltip",
	"utilities"
],
function(
	Color,
	ColorScaleKey,
	Configuration,
	Key,
	MultiMeasureTooltip,
	NumberUtilities,
	Path,
	SVG,
	Tooltip,
	Utilities
) {

function removeTooltip(chart) {
	if (chart.tooltip) {
		chart.tooltip.remove();
	}
}

function removeSecondaryTooltip(chart) {
	if (chart.secondaryTooltip) {
		chart.secondaryTooltip.remove();
	}
}

function deactivateAllAreas(map) {
	map.each(function() {
		this.active = false;
		this.removeClass("fm-highlighted");
		this.removeClass("fm-active");
	});
}

function markKeyValue(keyType, key, value, secondaryMarker) {
	if (keyType == "scalar" && value) {
		key.markValue(value, secondaryMarker);
	}
}

function removeKeyMarker(key) {
	if (key.valueMarker) {
		key.valueMarker.remove();
	}
}

function removeSecondaryKeyMarker(key) {
	if (key.secondaryValueMarker) {
		key.secondaryValueMarker.remove();
	}
}

/*
 * Handle mouse over events on a map area
 */
var areaMouseOverHandler = function(map, chartDescription, stateMachine, key) {
	var currentArea = this;

	var areaActive = stateMachine.isInState("AreaActive") || stateMachine.isInState("ShowingZoomRegionAndAreaActive");
	var showingZoomRegion = stateMachine.isInState("ShowingZoomRegion") || stateMachine.isInState("ShowingZoomRegionAndAreaActive");

	this.remove();
	map.add(currentArea);

	if (areaActive) {
		var activeArea = chartDescription.chart.activeArea;
		chartDescription.chart.activeArea.remove();
		map.add(activeArea);
	}

	if (areaActive && ! currentArea.active) {
		markKeyValue(chartDescription.keyType, key, currentArea.value, true);
		currentArea.addClass("fm-highlighted");
		if (showingZoomRegion && chartDescription.keyType == "non-scalar" && currentArea.values) {
			showMultiMeasureTooltip(currentArea, chartDescription, true, stateMachine);
		} else {
			showTooltip(currentArea, chartDescription, true, showingZoomRegion, stateMachine);
		}
	} else if (! areaActive) {
		markKeyValue(chartDescription.keyType, key, currentArea.value);
		currentArea.addClass("fm-active");
		showTooltip(currentArea, chartDescription, false, showingZoomRegion, stateMachine);
	}
}

/*
 * Handle mouse out events on a map area
 */
var areaMouseOutHandler = function(map, chartDescription, stateMachine, key) {
	var currentArea = this;

	var areaActive = stateMachine.isInState("AreaActive") || stateMachine.isInState("ShowingZoomRegionAndAreaActive");

	if (areaActive) {
		currentArea.removeClass("fm-highlighted");
		removeSecondaryKeyMarker(key);
		if (currentArea.active !== true) {
			removeSecondaryTooltip(chartDescription.chart);
		}
	} else {
		currentArea.removeClass("fm-active");
		removeKeyMarker(key);
		removeTooltip(chartDescription.chart);
	}
}

/*
 * Handle click events on a map area
 */
var areaClickHandler = function(map, chartDescription, stateMachine, key) {
	var currentArea = this;

	var areaActive = stateMachine.isInState("AreaActive") || stateMachine.isInState("ShowingZoomRegionAndAreaActive");
	var showingZoomRegion = stateMachine.isInState("ShowingZoomRegion") || stateMachine.isInState("ShowingZoomRegionAndAreaActive");

	if (showingZoomRegion && chartDescription.keyType == "non-scalar") {
		if (! currentArea.values) {
			return;
		}

		if (! areaActive) {
			removeTooltip(chartDescription.chart);
			deactivateAllAreas(map);
			currentArea.addClass("fm-active");
			showMultiMeasureTooltip(currentArea, chartDescription, false, stateMachine);
		} else if (areaActive && ! currentArea.active) {
			removeTooltip(chartDescription.chart);
			removeSecondaryTooltip(chartDescription.chart);
			deactivateAllAreas(map);
			currentArea.addClass("fm-active");
			showMultiMeasureTooltip(currentArea, chartDescription, false, stateMachine);
		}

		if (! currentArea.active) {
			currentArea.active = true;
			chartDescription.chart.activeArea = currentArea;
			stateMachine.transition("ShowingZoomRegionAndAreaActive");
		} else {
			currentArea.active = false;
			chartDescription.chart.activeArea = null;
			stateMachine.transition("ShowingZoomRegion");
			removeTooltip(chartDescription.chart);
		}

	} else {
		if (! currentArea.value) {
			return;
		}
		
		if (areaActive && ! currentArea.active) {
			removeTooltip(chartDescription.chart);
			removeSecondaryTooltip(chartDescription.chart);
			deactivateAllAreas(map);
			currentArea.addClass("fm-active");
			showTooltip(currentArea, chartDescription, false, showingZoomRegion, stateMachine);
		}

		if (! currentArea.active) {
			currentArea.active = true;
			chartDescription.chart.activeArea = currentArea;
			if (showingZoomRegion) {
				stateMachine.transition("ShowingZoomRegionAndAreaActive");
			} else {
				stateMachine.transition("AreaActive");
			}
			removeKeyMarker(key);
			markKeyValue(chartDescription.keyType, key, currentArea.value);
		} else {
			currentArea.active = false;
			chartDescription.chart.activeArea = null;
			if (stateMachine.isInState("ShowingZoomRegionAndAreaActive")) {
				stateMachine.transition("ShowingZoomRegion");
			} else {
				stateMachine.transition("Neutral");
			}
			removeTooltip(chartDescription.chart);
		}
	}
}

/**
 * Apply the relevant mouse handlers to a given map area
 */
function applyAreaPathMouseHandlers(areaPath, map, chartDescription, stateMachine, key) {
	areaPath.on("mouseover", function() {
		areaMouseOverHandler.call(this, map, chartDescription, stateMachine, key);
	});
	areaPath.on("mouseout", function() {
		areaMouseOutHandler.call(this, map, chartDescription, stateMachine, key);
	});
	areaPath.on("click", function() {
		areaClickHandler.call(this, map, chartDescription, stateMachine, key);
	});
}

/**
 * Apply the relevant mouse handlers to a given map region
 */
function applyRegionMouseHandlers(region, map, chartDescription, stateMachine, key) {
	region.on("mouseover", function() {
		var currentRegion = this;
		this.remove();
		map.add(currentRegion);
		this.attr({
			"filter": "url(#black-border)"
		});
		showTooltip(region, chartDescription, false, false, stateMachine, true);
	});

	region.on("mouseout", function() {
		this.attr({
			"filter": ""
		});
		removeTooltip(chartDescription.chart);
	});

	region.on("click", function() {
		var currentRegion = this;
		currentRegionBBox = currentRegion.bbox();
		reset(chartDescription, key, map, stateMachine);

		map.addClass("fm-hidden");

		showZoomRegion(map, chartDescription, key, currentRegion, currentRegionBBox, stateMachine);
	});
}

function tooltipMouseOverHandler(chartDescription, tooltipDescription, stateMachine, isMultiMeasure) {
	var arrowPosition = (tooltipDescription.arrowPosition == "left") ? "right" : "left";

	var newTooltip;
	if (isMultiMeasure) {
		newTooltip = MultiMeasureTooltip(
			chartDescription.chart,
			tooltipDescription.invertedLeftPoint,
			tooltipDescription.arrowTopPoint,
			tooltipDescription.title,
			tooltipDescription.values,
			chartDescription.colorClasses,
			arrowPosition
		);
	} else {
		newTooltip = Tooltip(
			chartDescription.chart,
			tooltipDescription.invertedLeftPoint,
			tooltipDescription.arrowTopPoint,
			tooltipDescription.title,
			arrowPosition
		);
	}

	var newInvertedLeftPoint = tooltipDescription.arrowLeftPoint;
	tooltipDescription.arrowLeftPoint = tooltipDescription.invertedLeftPoint;
	tooltipDescription.invertedLeftPoint = newInvertedLeftPoint;

	newTooltip.on("mouseover", function() {
		tooltipMouseOverHandler(chartDescription, tooltipDescription, stateMachine, isMultiMeasure);
	});

	removeTooltip(chartDescription.chart);
	chartDescription.chart.tooltip = newTooltip;
}

/**
 * Show a tooltip for a given map area
 */
function showTooltip(area, chartDescription, secondary, showingZoomRegion, stateMachine, includeZoomIcon) {
	var map = area.parent;
	var tooltipDescription = {};

	var areaBBox = area.bbox();

	tooltipDescription.arrowLeftPoint = (areaBBox.x * map.scaleFactor) + map.translateX;
	tooltipDescription.arrowTopPoint = (areaBBox.y * map.scaleFactor)
		+ map.translateY
		+ areaBBox.height * map.scaleFactor / 2;

	var mapAreaMidpoint = chartDescription.layout.drawRegions.mapArea.x
		+ chartDescription.layout.drawRegions.mapArea.width / 2;

	if (tooltipDescription.arrowLeftPoint < mapAreaMidpoint) {
		tooltipDescription.arrowPosition = "left";
		tooltipDescription.invertedLeftPoint = tooltipDescription.arrowLeftPoint;
		tooltipDescription.arrowLeftPoint += areaBBox.width * map.scaleFactor;
	} else {
		tooltipDescription.arrowPosition = "right";
		tooltipDescription.invertedLeftPoint = tooltipDescription.arrowLeftPoint + (areaBBox.width * map.scaleFactor);
	}

	tooltipDescription.title = area.title;
	if (! isNaN(area.value)) {
		tooltipDescription.title += ": " + NumberUtilities.renderValue(area.value);
	}

	var tooltip;
	
	if (includeZoomIcon) {
		var zoomIcon = Utilities.drawZoomIcon(chartDescription.chart, "white", 0.14);

		tooltip = Tooltip(
			chartDescription.chart,
			tooltipDescription.title,
			tooltipDescription.arrowPosition,
			zoomIcon
		);
	} else {
		tooltip = Tooltip(
			chartDescription.chart,
			tooltipDescription.title,
			tooltipDescription.arrowPosition
		);
	}

	tooltip.move(
		tooltipDescription.arrowLeftPoint,
		tooltipDescription.arrowTopPoint
	);

	if (secondary) {

		var tooltipBBox = chartDescription.chart.tooltip.bbox();
		var secondaryTooltipBBox = tooltip.bbox();
		if (Utilities.hasCollision(tooltipBBox, secondaryTooltipBBox)) {
			tooltipDescription.arrowPosition = (tooltipDescription.arrowPosition == "left") ? "right" : "left";
			tooltip.remove();
			tooltip = Tooltip(
				chartDescription.chart,
				tooltipDescription.invertedLeftPoint,
				tooltipDescription.arrowTopPoint,
				tooltipDescription.title,
				tooltipDescription.arrowPosition
			);
		}

		chartDescription.chart.secondaryTooltip = tooltip;
		chartDescription.chart.secondaryTooltip.addClass("fm-secondary");
	} else {
		chartDescription.chart.tooltip = tooltip;
		tooltip.on("mouseover", function() {
			tooltipMouseOverHandler(chartDescription, tooltipDescription, stateMachine);
		});
	}
}

/**
 * Show a tooltip with multiple measures for a given map area
 */
function showMultiMeasureTooltip(area, chartDescription, secondary, stateMachine) {
	var map = area.parent;
	var tooltipDescription = {};

	var areaBBox = area.node.getBBox();

	tooltipDescription.arrowLeftPoint = (areaBBox.x * map.scaleFactor) + map.translateX;
	tooltipDescription.arrowTopPoint = (areaBBox.y * map.scaleFactor)
		+ map.translateY
		+ areaBBox.height * map.scaleFactor / 2;

	var mapAreaMidpoint = chartDescription.layout.drawRegions.mapArea.x
		+ chartDescription.layout.drawRegions.mapArea.width / 2;

	if (tooltipDescription.arrowLeftPoint < mapAreaMidpoint) {
		tooltipDescription.arrowPosition = "left";
		tooltipDescription.invertedLeftPoint = tooltipDescription.arrowLeftPoint;
		tooltipDescription.arrowLeftPoint += areaBBox.width * map.scaleFactor;
	} else {
		tooltipDescription.arrowPosition = "right";
		tooltipDescription.invertedLeftPoint = tooltipDescription.arrowLeftPoint + (areaBBox.width * map.scaleFactor);
	}

	tooltipDescription.title = area.title;
	tooltipDescription.values = chartDescription.groups.map(function(groupItem) {
		var value = NumberUtilities.renderValue(area.values[groupItem]);
		return {
			title: groupItem,
			value: value
		}
	});

	var tooltip = MultiMeasureTooltip(
		chartDescription.chart,
		tooltipDescription.arrowLeftPoint,
		tooltipDescription.arrowTopPoint,
		tooltipDescription.title,
		tooltipDescription.values,
		chartDescription.colorClasses,
		tooltipDescription.arrowPosition
	);

	var tooltipBBox = tooltip.bbox();

	if (secondary) {
		chartDescription.chart.secondaryTooltip = tooltip;
		chartDescription.chart.secondaryTooltip.addClass("fm-secondary");
	} else {
		chartDescription.chart.tooltip = tooltip;
		tooltip.on("mouseover", function() {
			tooltipMouseOverHandler(chartDescription, tooltipDescription, stateMachine, true);
		});
	}
}

/**
 * Draw the main choropleth
 */
var drawMap = function(chartDescription, key, mapData, rows, scale, stateMachine) {
	var map = chartDescription.chart.group();
	map.addClass("fm-choropleth-large-map");

	/*
	 * Draw an area on the map based on the provided path string
	 */
	function drawArea(pathString, title) {
		areaPath = chartDescription.chart.path(pathString);
		
		areaPath.title = title;

		areaPath.addClass("fm-choropleth-area");
		areaPath.addClass("fm-choropleth-neutral-area");

		return areaPath;
	}

	function applyColorClass(area, areaKey) {
		if (key.type == "non-scalar") {
			rows.forEach(function(rowItem, rowIndex) {
				if (rowItem.title == areaKey) {
					area.removeClass("fm-choropleth-neutral-area");
					area.addClass(chartDescription.colorGroupMap[rowItem.majority.title]);
					area.values = rowItem.values;
				}
			});
		}
	}

	/*
	 * Draw all areas from the paths in the supplied data object
	 */
	function drawMapAreas() {
		var areas = {};
		for (mapDataKey in mapData) {
			var area;
			if (typeof mapData[mapDataKey] === "object") {
				var regionGroup = chartDescription.chart.group();
				regionGroup.addClass("fm-choropleth-region");
				regionGroup.title = mapDataKey;
				applyRegionMouseHandlers(
					regionGroup,
					map,
					chartDescription,
					stateMachine,
					key
				);
				for (groupAreaKey in mapData[mapDataKey]) {
					area = drawArea(mapData[mapDataKey][groupAreaKey], groupAreaKey, true);
					regionGroup.add(area);
					area.title = groupAreaKey;

					map.add(regionGroup)

					applyColorClass(area, groupAreaKey);

					areas[groupAreaKey] = area;
				}
			} else {
				area = drawArea(mapData[mapDataKey], mapDataKey);
				area.title = mapDataKey;

				map.add(area);

				applyAreaPathMouseHandlers(
					area,
					map,
					chartDescription,
					stateMachine,
					key
				);

				applyColorClass(area, mapDataKey);

				areas[mapDataKey] = area;
			}
		}

		return areas;
	}

	/*
	 * Apply tint classes to the map areas based on data
	 */
	function addTintClasses(areas) {
		var tintStepSize = Math.ceil(Configuration.MAX_TINT_NUMBER / (key.tickMarks.length - 2));
		rows.forEach(function(rowItem, rowIndex) {
			if (areas[rowItem.title]) {
				if (rowItem.value == key.tickMarks[key.tickMarks.length - 1].value) {
					areas[rowItem.title].addClass(Configuration.POSITIVE_COLOR_CLASS);
					areas[rowItem.title].removeClass("fm-choropleth-neutral-area");
					areas[rowItem.title].value = rowItem.value;
				} else {
					key.tickMarks.some(function(tickMark, tickMarkIndex, tickMarks) {
						if (tickMarkIndex == tickMarks.length - 1) {
							return false;
						}
						if (rowItem.value >= tickMark.value && rowItem.value < key.tickMarks[tickMarkIndex + 1].value) {
							var tintNumber = parseInt(Configuration.MAX_TINT_NUMBER - tickMarkIndex * tintStepSize);
							if (rowItem.value >= 0) {
								areas[rowItem.title].addClass(Configuration.POSITIVE_COLOR_CLASS);
							} else {
								areas[rowItem.title].addClass(Configuration.NEGATIVE_COLOR_CLASS);
							}
							areas[rowItem.title].removeClass("fm-choropleth-neutral-area");
							areas[rowItem.title].value = rowItem.value;
							if (tintNumber > 0) {
								areas[rowItem.title].addClass("tint-" + tintNumber);
							}
							return true;
						}
					});
				}
			}
		});
	}

	var areas = drawMapAreas();

	map.boundingBox = map.bbox();

	if (key.type == "scalar") {
		addTintClasses(areas);
	}

	var heightScaleFactor = chartDescription.layout.drawRegions.mapArea.height
		/ map.boundingBox.height
		/ (1 + Configuration.MAP_AREA_PADDING);
	var widthScaleFactor = chartDescription.layout.drawRegions.mapArea.width
		/ map.boundingBox.width
		/ (1 + Configuration.MAP_AREA_PADDING);
	
	map.scaleFactor = Math.min(
		heightScaleFactor,
		widthScaleFactor
	);

	for (key in areas) {
		areas[key].attr({
			"stroke": "white",
			"stroke-width": 1 / map.scaleFactor
		});
	}

	map.scale(
		map.scaleFactor,
		map.scaleFactor
	);

	map.boundingBox = map.bbox();

	// Workaround for inaccurate SVG bounding box
	var halfWidthDivisorAccountingForBBoxError = 2.8;

	map.translateX = chartDescription.layout.drawRegions.mapArea.x
		+ chartDescription.layout.drawRegions.mapArea.width / 2
		- map.boundingBox.width / halfWidthDivisorAccountingForBBoxError;

	map.translateY = chartDescription.layout.drawRegions.mapArea.y
		+ chartDescription.layout.drawRegions.mapArea.height / 2
		- map.boundingBox.height / halfWidthDivisorAccountingForBBoxError;

	map.move(
		map.translateX,
		map.translateY
	);

	return map;
};

/**
 * Draw the key
 */
var drawKey = function(chartDescription, data, scale, type) {
	var key;

	if (type == "scalar") {
		var tintStepSize = Math.ceil(Configuration.MAX_TINT_NUMBER / (scale.domain.increments.length - 2));

		var tickMarks = scale.domain.increments.map(function(increment, incrementIndex, increments) {
			var tickMark = {
				value: increment
			};

			var tintStepSize = Math.ceil(Configuration.MAX_TINT_NUMBER / (scale.domain.increments.length - 2));
			var tintNumber = parseInt(Configuration.MAX_TINT_NUMBER - incrementIndex * tintStepSize);
			if (tintNumber > 0) {
				tickMark.tintClass = "tint-" + tintNumber;
			}

			return tickMark;
		});

		key = ColorScaleKey(
			chartDescription.chart,
			tickMarks,
			Configuration.MAX_TINT_NUMBER,
			scale,
			chartDescription.layout.keyOrientation,
			Configuration.POSITIVE_COLOR_CLASS,
			Configuration.NEGATIVE_COLOR_CLASS
		);

		key.addClass('color-scale-key');

	} else {
		key = Key(
			chartDescription.chart,
			chartDescription.width,
			chartDescription.groups.slice(0, chartDescription.layout.keyValueCount),
			chartDescription.colorClasses
		)
			.move(
				chartDescription.layout.drawRegions.keyArea.x,
				chartDescription.layout.drawRegions.keyArea.y
			);
	}

	key.type = type;
	return key;
};

function positionKey(chartDescription, key, keyBBox) {
	var xPosition;
	var yPosition;

	if (chartDescription.layout.keyOrientation === "horizontal") {
		xPosition = chartDescription.layout.drawRegions.keyArea.x
			+ chartDescription.layout.drawRegions.keyArea.width / 2;
		if (key.type == "scalar") {
			xPosition -= key.colorMarkers.bbox().width / 2;
		} else {
			xPosition -= keyBBox.width / 2;
		}
		yPosition = chartDescription.layout.drawRegions.keyArea.y
			+ chartDescription.layout.drawRegions.keyArea.height / 2
			- keyBBox.height / 2;
		if (key.type == "scalar") {
			yPosition -= key.configuration.VALUE_MARKER_LENGTH;
		} 
	} else {
		xPosition = chartDescription.layout.drawRegions.keyArea.x
			+ chartDescription.layout.drawRegions.keyArea.width / 2
			- keyBBox.width / 2;
		yPosition = chartDescription.layout.drawRegions.keyArea.y
			+ chartDescription.layout.drawRegions.keyArea.height
			- keyBBox.height;
	}

	key.move(xPosition, yPosition);
}

/*
 * Reset the chart (hide tooltips and remove active styles)
 */
function reset(chartDescription, key, map, stateMachine) {
	var showingZoomRegion = stateMachine.isInState("ShowingZoomRegion") || stateMachine.isInState("ShowingZoomRegionAndAreaActive");
	if (showingZoomRegion) {
		map.zoomedRegion.animate(Configuration.ANIMATE_SPEED).attr("opacity", "0").after(function() {
			this.remove();
		});
		hideThumnailMap(chartDescription.chart, map, function() {
			map.removeClass("fm-hidden");
		});
	}
	removeTooltip(chartDescription.chart);
	removeSecondaryTooltip(chartDescription.chart);
	removeKeyMarker(key);
	removeSecondaryKeyMarker(key);
	map.each(function() {
		this.active = false;
		this.removeClass("fm-highlighted");
		this.removeClass("fm-active");
	});
	stateMachine.transition("Neutral");
}

function showThumbnailMap(chartDescription, key, map, stateMachine) {
	var thumbnailMapGroup = chartDescription.chart.group();

	var thumbnailMap = Utilities.cloneGroup(map);
	thumbnailMap.scale(map.scaleFactor, map.scaleFactor);
	thumbnailMap.addClass("fm-choropleth-thumbnail-map");

	thumbnailMap.animate(Configuration.ANIMATE_SPEED).scale(
		map.scaleFactor * Configuration.THUMBNAIL_MAP_SCALE_FACTOR,
		map.scaleFactor * Configuration.THUMBNAIL_MAP_SCALE_FACTOR
	).after(function() {
		var thumbnailMapBBox = thumbnailMap.bbox();

		// Workarround for inaccurate SVG bounding box
		var inaccurateBBoxCompensationFactor = 1.2;
		
		thumbnailMap.move(Configuration.THUMBNAIL_MAP_SIDE_PADDING * inaccurateBBoxCompensationFactor, Configuration.THUMBNAIL_MAP_TOP_BOTTOM_PADDING * inaccurateBBoxCompensationFactor);

		var thumbnailMapBackgroundWidth = thumbnailMapBBox.width / inaccurateBBoxCompensationFactor  + Configuration.THUMBNAIL_MAP_SIDE_PADDING * 2;
		var thumbnailMapBackgroundHeight = thumbnailMapBBox.height / inaccurateBBoxCompensationFactor + Configuration.THUMBNAIL_MAP_TOP_BOTTOM_PADDING * 2;

		var thumbnailMapBackground = chartDescription.chart.rect(
			thumbnailMapBackgroundWidth,
			thumbnailMapBackgroundHeight
		)
		thumbnailMapBackground.attr("opacity", "0").animate(Configuration.ANIMATE_SPEED).attr("opacity", "1");
		thumbnailMapBackground.addClass("fm-choropleth-thumbnail-map-background");

		var zoomIcon = Utilities.drawZoomIcon(chartDescription.chart);
		zoomIcon.attr("opacity", "0");
		zoomIcon.move(
			thumbnailMapBackgroundWidth - Configuration.THUMBNAIL_MAP_SIDE_PADDING / 2 - zoomIcon.bbox().width,
			Configuration.THUMBNAIL_MAP_SIDE_PADDING / 2
		);
		zoomIcon.animate(Configuration.ANIMATE_SPEED).attr("opacity", "1");

		thumbnailMapGroup.add(thumbnailMapBackground);
		thumbnailMapGroup.add(zoomIcon);
		thumbnailMapGroup.add(thumbnailMap);

		thumbnailMapGroup.addClass("fm-choropleth-thumbnail-map");

		thumbnailMapGroup.on("click", function() {
			reset(chartDescription, key, map, stateMachine);
		});

		chartDescription.chart.thumbnailMap = thumbnailMap;
		chartDescription.chart.thumbnailMapBackground = thumbnailMapBackground;
		chartDescription.chart.thumbnailMapZoomIcon = zoomIcon;
	});

}

function hideThumnailMap(chart, map, callback) {
	chart.thumbnailMapBackground.remove();
	chart.thumbnailMapZoomIcon.remove();
	chart.thumbnailMap.animate(Configuration.ANIMATE_SPEED).scale(map.scaleFactor, map.scaleFactor).after(function() {
		callback();
		chart.thumbnailMap.remove();
	});
}

/*
 * Show a zoom region
 */
function showZoomRegion(map, chartDescription, key, region, regionBBox, stateMachine) {
	stateMachine.transition("ShowingZoomRegion");

	showThumbnailMap(chartDescription, key, map, stateMachine);

	var zoomedRegion = Utilities.cloneGroup(region);
	zoomedRegion.attr("opacity", "0");

	zoomedRegion.addClass("fm-choropleth-zoomed-region fm-choropleth-large-map");

	var thumbnailMapHeight = map.boundingBox.height * Configuration.THUMBNAIL_MAP_SCALE_FACTOR;

	var heightScaleFactor = (chartDescription.layout.drawRegions.mapArea.height - thumbnailMapHeight)
		/ regionBBox.height
		/ (1 + Configuration.MAP_AREA_PADDING);
	var widthScaleFactor = chartDescription.layout.drawRegions.mapArea.width
		/ regionBBox.width
		/ (1 + Configuration.MAP_AREA_PADDING);

	zoomedRegion.scaleFactor = Math.min(
		heightScaleFactor,
		widthScaleFactor
	);

	zoomedRegion.scale(
		zoomedRegion.scaleFactor,
		zoomedRegion.scaleFactor
	);

	zoomedRegion.animate(Configuration.ANIMATE_SPEED).attr("opacity", "1");

	zoomedRegion.each(function(areaIndex, area) {
		this.attr({
			"stroke": "white",
			"stroke-width": 1 / zoomedRegion.scaleFactor
		});
	});

	zoomedRegion.translateX = chartDescription.layout.drawRegions.mapArea.x
		+ chartDescription.layout.drawRegions.mapArea.width / 2
		- regionBBox.width * zoomedRegion.scaleFactor / 2
		- regionBBox.x * zoomedRegion.scaleFactor;

	zoomedRegion.translateY = chartDescription.layout.drawRegions.mapArea.y
		- regionBBox.y * zoomedRegion.scaleFactor
		+ thumbnailMapHeight + Configuration.THUMBNAIL_MAP_TOP_BOTTOM_PADDING * 2;

	zoomedRegion.move(
		zoomedRegion.translateX,
		zoomedRegion.translateY
	);

	chartDescription.chart.add(zoomedRegion);

	zoomedRegion.children().forEach(function(area, areaIndex) {
		applyAreaPathMouseHandlers(area, zoomedRegion, chartDescription, stateMachine, key);
	});

	map.zoomedRegion = zoomedRegion;

}

return {
	drawMap: drawMap,
	drawKey: drawKey,
	positionKey: positionKey,
	reset: reset
};

});
/*
 * classList.js: Cross-browser full element.classList implementation.
 * 2014-12-13
 *
 * By Eli Grey, http://eligrey.com
 * Public Domain.
 * NO WARRANTY EXPRESSED OR IMPLIED. USE AT YOUR OWN RISK.
 */

/*global self, document, DOMException */

/*! @source http://purl.eligrey.com/github/classList.js/blob/master/classList.js */

if ("document" in self) {

// Full polyfill for browsers with no classList support
if (!("classList" in document.createElement("_"))) {

(function (view) {



if (!('Element' in view)) return;

var
	  classListProp = "classList"
	, protoProp = "prototype"
	, elemCtrProto = view.Element[protoProp]
	, objCtr = Object
	, strTrim = String[protoProp].trim || function () {
		return this.replace(/^\s+|\s+$/g, "");
	}
	, arrIndexOf = Array[protoProp].indexOf || function (item) {
		var
			  i = 0
			, len = this.length
		;
		for (; i < len; i++) {
			if (i in this && this[i] === item) {
				return i;
			}
		}
		return -1;
	}
	// Vendors: please allow content code to instantiate DOMExceptions
	, DOMEx = function (type, message) {
		this.name = type;
		this.code = DOMException[type];
		this.message = message;
	}
	, checkTokenAndGetIndex = function (classList, token) {
		if (token === "") {
			throw new DOMEx(
				  "SYNTAX_ERR"
				, "An invalid or illegal string was specified"
			);
		}
		if (/\s/.test(token)) {
			throw new DOMEx(
				  "INVALID_CHARACTER_ERR"
				, "String contains an invalid character"
			);
		}
		return arrIndexOf.call(classList, token);
	}
	, ClassList = function (elem) {
		var
			  trimmedClasses = strTrim.call(elem.getAttribute("class") || "")
			, classes = trimmedClasses ? trimmedClasses.split(/\s+/) : []
			, i = 0
			, len = classes.length
		;
		for (; i < len; i++) {
			this.push(classes[i]);
		}
		this._updateClassName = function () {
			elem.setAttribute("class", this.toString());
		};
	}
	, classListProto = ClassList[protoProp] = []
	, classListGetter = function () {
		return new ClassList(this);
	}
;
// Most DOMException implementations don't allow calling DOMException's toString()
// on non-DOMExceptions. Error's toString() is sufficient here.
DOMEx[protoProp] = Error[protoProp];
classListProto.item = function (i) {
	return this[i] || null;
};
classListProto.contains = function (token) {
	token += "";
	return checkTokenAndGetIndex(this, token) !== -1;
};
classListProto.add = function () {
	var
		  tokens = arguments
		, i = 0
		, l = tokens.length
		, token
		, updated = false
	;
	do {
		token = tokens[i] + "";
		if (checkTokenAndGetIndex(this, token) === -1) {
			this.push(token);
			updated = true;
		}
	}
	while (++i < l);

	if (updated) {
		this._updateClassName();
	}
};
classListProto.remove = function () {
	var
		  tokens = arguments
		, i = 0
		, l = tokens.length
		, token
		, updated = false
		, index
	;
	do {
		token = tokens[i] + "";
		index = checkTokenAndGetIndex(this, token);
		while (index !== -1) {
			this.splice(index, 1);
			updated = true;
			index = checkTokenAndGetIndex(this, token);
		}
	}
	while (++i < l);

	if (updated) {
		this._updateClassName();
	}
};
classListProto.toggle = function (token, force) {
	token += "";

	var
		  result = this.contains(token)
		, method = result ?
			force !== true && "remove"
		:
			force !== false && "add"
	;

	if (method) {
		this[method](token);
	}

	if (force === true || force === false) {
		return force;
	} else {
		return !result;
	}
};
classListProto.toString = function () {
	return this.join(" ");
};

if (objCtr.defineProperty) {
	var classListPropDesc = {
		  get: classListGetter
		, enumerable: true
		, configurable: true
	};
	try {
		objCtr.defineProperty(elemCtrProto, classListProp, classListPropDesc);
	} catch (ex) { // IE 8 doesn't support enumerable:true
		if (ex.number === -0x7FF5EC54) {
			classListPropDesc.enumerable = false;
			objCtr.defineProperty(elemCtrProto, classListProp, classListPropDesc);
		}
	}
} else if (objCtr[protoProp].__defineGetter__) {
	elemCtrProto.__defineGetter__(classListProp, classListGetter);
}

}(self));

} else {
// There is full or partial native classList support, so just check if we need
// to normalize the add/remove and toggle APIs.

(function () {
	"use strict";

	var testElement = document.createElement("_");

	testElement.classList.add("c1", "c2");

	// Polyfill for IE 10/11 and Firefox <26, where classList.add and
	// classList.remove exist but support only one argument at a time.
	if (!testElement.classList.contains("c2")) {
		var createMethod = function(method) {
			var original = DOMTokenList.prototype[method];

			DOMTokenList.prototype[method] = function(token) {
				var i, len = arguments.length;

				for (i = 0; i < len; i++) {
					token = arguments[i];
					original.call(this, token);
				}
			};
		};
		createMethod('add');
		createMethod('remove');
	}

	testElement.classList.toggle("c3", false);

	// Polyfill for IE 10 and Firefox <24, where classList.toggle does not
	// support the second argument.
	if (testElement.classList.contains("c3")) {
		var _toggle = DOMTokenList.prototype.toggle;

		DOMTokenList.prototype.toggle = function(token, force) {
			if (1 in arguments && !this.contains(token) === !force) {
				return force;
			} else {
				return _toggle.call(this, token);
			}
		};

	}

	testElement = null;
}());

}

}

;
define("classList", function(){});

define('mapper',[],function() {
	
	var HtmlTable = function(tableNode) {
		this.keys = tableNode.querySelectorAll('thead > tr > th');
		this.rows = tableNode.querySelectorAll('tbody > tr');
	};

	HtmlTable.prototype.mapRows = function(callback) {
		if (typeof callback != "function") {
			throw new TypeError();
		}

		var headerRowObject = [];
		for (var keyIndex = 0; keyIndex < this.keys.length; keyIndex++) {
			headerRowObject.push(this.keys[keyIndex].textContent);
		}

		var dataObject = [];
		for (var rowIndex = 0; rowIndex < this.rows.length; rowIndex++) {
			var currentRow = this.rows[rowIndex];
			var rowObject = [];
			var classes = currentRow.classList;
			var attributes = currentRow.attributes;

			for (var columnIndex = 0; columnIndex < this.rows[rowIndex].children.length; columnIndex++) {
				rowObject.push(this.rows[rowIndex].children[columnIndex].textContent);
			}
			
			var dataItem = callback(rowObject, rowIndex, currentRow, headerRowObject, classes, attributes);
			if (dataItem) {
				dataObject.push(dataItem);
			}
		}

		return dataObject;
	};

	HtmlTable.prototype.forEachRows = function(callback) {
		if (typeof callback != "function") {
			throw new TypeError();
		}

		var headerRowObject = [];
		for (var keyIndex = 0; keyIndex < this.keys.length; keyIndex++) {
			headerRowObject.push(this.keys[keyIndex].textContent);
		}

		var dataObject = [];
		for (var rowIndex = 0; rowIndex < this.rows.length; rowIndex++) {
			var currentRow = this.rows[rowIndex];
			var rowObject = [];
			var classes = currentRow.classList;
			var attributes = currentRow.attributes;

			for (var columnIndex = 0; columnIndex < this.rows[rowIndex].children.length; columnIndex++) {
				rowObject.push(this.rows[rowIndex].children[columnIndex].textContent);
			}
			
			callback(rowObject, rowIndex, currentRow, headerRowObject, classes, attributes);
		}
	};

	HtmlTable.prototype.reduceRows = function(callback, reduction) {
		if (typeof callback != "function") {
			throw new TypeError();
		}
		
		if (typeof reduction === "undefined") {
			reduction = 0;
		}

		var headerRowObject = [];
		for (var keyIndex = 0; keyIndex < this.keys.length; keyIndex++) {
			headerRowObject.push(this.keys[keyIndex].textContent);
		}

		for (var rowIndex = 0; rowIndex < this.rows.length; rowIndex++) {
			var currentRow = this.rows[rowIndex];
			var rowObject = [];
			var classes = currentRow.classList;
			var attributes = currentRow.attributes;

			for (var columnIndex = 0; columnIndex < this.rows[rowIndex].children.length; columnIndex++) {
				rowObject.push(this.rows[rowIndex].children[columnIndex].textContent);
			}
			
			reduction = callback(reduction, rowObject, rowIndex, currentRow, headerRowObject, classes, attributes);
		}

		return reduction;
	};

	return HtmlTable;

});
define('map-data/constituencies',[],function() { return {
"Greater London": {
	"Feltham and Heston": "m 4304.0868,6669.4085 7.1152,-16.8516 -16.6644,-14.043 19.8474,-8.9876 -2.4341,-20.2219 -22.656,-6.1789 -0.9362,26.2136 -17.7878,15.3537 -6.9279,-2.6214 1.4979,15.7282 15.3537,9.1747 5.43,-4.1192 7.6768,9.9237 z",
	"Ealing Southall": "m 4306.8018,6580.1885 18.6304,11.3281 7.3024,-0.5617 20.0346,15.5409 -31.6435,-4.3065 -9.1748,6.9279 -22.656,-6.5534 z",
	"Ealing North": "m 4283.3032,6565.6775 39.3204,-17.7878 22.8433,13.6685 -8.6131,32.2053 -4.3065,-3.1831 -7.1151,0.749 z",
	"Ruislip Northwood and Pinner": "m 4249.6,6549.0131 53.5506,-14.9792 14.2303,-27.337 -14.9792,-10.4855 -65.1596,-10.1109 0.749,27.337 -10.111,0.3745 z",
	"Uxbridge and South Ruislip": "m 4302.9634,6534.0339 3.5576,20.4092 -23.9668,11.2344 -18.3495,29.7711 -19.0985,-3.3703 4.4938,-43.6269 z",
	"Harrow East": "m 4302.2144,6495.8369 36.5118,-21.5326 26.9626,36.6991 -26.2136,16.4771 -4.4938,-17.4133 -8.613,8.9875 -8.9875,-12.5451 z",
	"Hendon": "m 4340.9731,6477.9555 29.3967,-6.2725 34.5458,26.869 -17.6942,40.1628 z",
	"Harrow West": "m 4339.288,6527.4805 -11.4217,23.5923 -5.4299,-3.5576 -15.9154,6.7406 -3.5576,-20.0346 14.2302,-27.3371 8.8003,12.1706 8.9875,-8.8003 z",
	"Brent North": "m 4376.9232,6525.7017 -24.9029,26.4945 9.7365,13.294 -19.473,9.362 3.1831,-13.4812 -17.7878,-10.86 11.6089,-23.405 26.4008,-16.1026 z",
	"Brent Central": "m 4376.1743,6526.3571 c 0,0 29.7711,32.3925 28.6477,32.3925 -1.1235,0 -18.3495,0.3745 -18.3495,0.3745 l 3.7448,14.6047 -26.9626,1.3107 -1.4979,-9.7365 -9.7365,-13.4813 z",
	"Finchley and Golders Green": "m 4405.0092,6498.2711 12.9196,-9.362 12.1706,19.8474 -11.7961,29.0222 -18.3496,14.792 -12.545,-13.8558 z",
	"Chipping Barnet": "m 4370.9315,6471.8702 31.8308,-24.1539 26.5881,12.7323 13.4813,23.0305 -12.5451,25.2774 -12.1706,-19.8474 -13.4813,9.362 z",
	"Enfield Southgate": "m 4408.0051,6449.4014 15.9154,-15.9154 c 0,0 27.5243,34.8267 28.4605,34.8267 0.9362,0 21.7198,-2.9959 21.7198,-2.9959 l -11.4216,35.7629 -27.8988,-2.2469 8.0513,-15.3537 -14.043,-23.405 z",
	"Enfield North": "m 4505.7444,6465.3168 -31.6436,0 -22.0943,2.8086 -28.2733,-35.2011 29.0222,-6.1789 52.4272,7.6768 z",
	"Edmonton": "m 4496.0079,6501.2669 c -0.749,0 -33.1415,-0.3745 -33.1415,-0.3745 l 11.2344,-35.3883 32.018,0.1872 z",
	"Chingford and Woodford Green": "m 4496.1951,6501.0797 c 0,0 32.0181,15.1664 32.767,14.9792 0.749,-0.1873 8.9875,-25.2774 8.9875,-25.2774 l -9.7364,-7.6769 -0.3745,-11.6089 -21.5326,-6.1789 z",
	"Ilford North": "m 4528.9621,6516.4334 35.9501,14.7919 34.0777,-25.4646 -11.6089,-20.222 -32.5797,17.4134 -16.4772,-12.3579 z",
	"Romford": "m 4623.7056,6478.9853 9.1748,15.1665 -10.86,15.1664 22.4688,8.6131 -17.975,30.5201 -28.2733,-15.9154 0.9362,-27.3371 -11.6088,-19.6602 z",
	"Hornsey and Wood Green": "m 4419.9885,6534.4084 c 0,0 39.3672,2.0597 37.682,0.1873 -1.6851,-1.8724 -4.1661,-16.1027 -4.1661,-16.1027 l 15.1664,-17.0389 -33.5159,-2.6213 z",
	"Hampstead and Kilburn": "m 4419.0522,6537.217 c 0.9362,0.5617 9.7365,29.5839 9.7365,29.5839 l -38.0097,6.7407 -4.681,-14.792 19.0985,-0.1872 -5.2428,-6.3662 z",
	"Ealing Central and Acton": "m 4375.987,6574.8522 1.6852,29.584 -31.4564,-3.1831 -9.362,-7.8641 5.2428,-18.3495 19.4729,-9.5493 1.498,9.9238 z",
	"Brentford and Isleworth": "m 4303.5251,6646.1907 36.9799,-12.7323 14.8856,-21.6262 18.0687,14.3238 3.9321,-21.3454 -30.8011,-3.5575 6.3662,5.43 -31.8308,-4.3066 -9.362,6.3662 2.6213,20.7836 -20.0346,8.6131 z",
	"Twickenham": "m 4341.5348,6633.6456 8.6131,11.2344 -13.2941,17.0389 12.1706,7.1151 -4.681,29.2094 -7.4896,0.1873 -17.226,-20.0347 -10.111,7.1151 -5.2427,-3.932 0.1872,-12.5451 6.5534,-16.8516 -7.8641,-6.1789 z",
	"Richmond Park": "m 4377.953,6609.8662 14.043,6.4597 c 0,0 -1.7787,16.1963 -3.2767,16.1963 -1.4979,0 -11.7961,1.6851 -11.7961,1.6851 0,0 8.4258,17.6006 7.3024,17.4134 -1.1235,-0.1873 -11.9834,37.2607 -11.9834,37.2607 l -24.5284,-10.1109 1.1234,-9.9238 -12.3578,-7.6768 13.6685,-16.2899 -8.2386,-11.6089 13.6686,-18.9112 19.0984,14.5111 z",
	"Hammersmith": "m 4393.7748,6614.8279 14.043,-4.0256 -19.0985,-37.0735 -12.545,0.749 1.5915,33.4224 z",
	"Chelsea and Fulham": "m 4392.6514,6625.9688 17.6006,10.4854 10.1109,-19.6602 11.0472,-2.6213 -2.4342,-17.6006 -20.9708,14.043 -14.043,3.8384 z",
	"Kensington": "m 4399.0175,6572.2309 21.5326,29.3967 -12.9195,8.613 -18.9113,-36.3246 z",
	"Westminster North": "m 4428.9759,6566.6137 4.3066,9.362 -20.222,14.7919 -13.8557,-18.724 z",
	"Cities of London and Westminster": "m 4433.8442,6575.7884 13.1068,9.5493 21.9071,-6.7407 8.2385,8.6131 -5.9916,6.1789 -19.6602,-3.1831 -3.9321,23.5923 -15.9154,0.3745 -2.8086,-17.7879 -7.6768,4.8683 -8.4258,-10.8599 z",
	"Holborn and St. Pancras": "m 4437.9635,6536.2808 19.4729,45.6866 -10.6727,2.9958 -13.6685,-9.7365 -13.8557,-38.1969 0.7489,-2.9959 z",
	"Tottenham": "m 4457.062,6532.7232 24.7156,-2.2468 12.5451,-29.2095 -25.4646,-0.5617 -15.3537,17.6006 z",
	"Islington North": "m 4457.7173,6535.1573 16.3835,21.3454 -14.9792,0.749 -14.6047,-6.1789 -7.1152,-15.3537 z",
	"Islington South and Finsbury": "m 4474.4753,6556.8772 c -0.9362,0 -16.8516,24.5284 -16.8516,24.5284 l -13.1068,-30.5201 14.7919,6.3662 z",
	"Hackney South and Shoreditch": "m 4468.8581,6578.4098 39.5076,-25.4646 -15.781,-12.5471 -18.2967,16.8536 -16.2898,23.9667 z",
	"Hackney North and Stoke Newington": "m 4481.5904,6530.2891 10.7957,9.9331 -17.5363,16.2805 -17.9751,-23.7795 z",
	"Walthamstow": "m 4498.1797,6544.4678 26.8108,-29.7897 -29.9221,-13.637 -13.5047,29.2601 z",
	"Leyton and Wanstead": "m 4508.573,6552.4118 34.4237,-5.8256 -4.1044,-26.0825 -13.9018,-5.8256 -27.0094,29.9221 z",
	"Ilford South": "m 4541.8051,6537.3183 15.6231,20.3894 32.57,-23.1698 -2.5155,-19.8598 -22.243,16.6823 -26.4798,-10.8567 z",
	"West Ham": "m 4506.0575,6554.5301 20.919,40.3817 18.6682,-9.93 -11.1215,-36.9392 -25.8178,4.2368 z",
	"East Ham": "m 4528.1681,6595.0442 32.0404,1.1915 10.4595,-24.2289 -28.8629,-34.2913 1.324,9.0031 -8.4735,1.324 11.1215,36.8069 z",
	"Barking": "m 4566.6961,6582.7311 32.1729,-5.6932 -1.1916,-19.9922 9.9299,-1.324 -17.4767,-21.3162 -31.908,22.5078 12.7102,15.2259 z",
	"Dagenham and Rainham": "m 4598.869,6577.3027 30.8144,26.7125 15.5251,-8.5739 -0.3972,-8.7383 8.3411,0 -27.0093,-38.528 -28.0685,-15.8878 0.7944,-26.6122 -11.5187,9.0031 2.5155,19.4626 18.0063,21.581 -10.0623,1.324 z",
	"Bexleyheath and Crayford": "m 4641.6806,6612.3003 -20.9708,-0.3745 -35.482,3.0894 -7.9577,24.154 37.8224,7.7705 18.5368,-12.1706 z",
	"Erith and Thamesmead": "m 4622.6758,6611.4577 c 0,0 -25.9328,-29.2095 -26.3073,-29.3967 -0.3744,-0.1873 -27.4306,6.4598 -27.4306,6.4598 l -5.6172,10.579 8.8939,17.3197 z",
	"Old Bexley and Sidcup": "m 4606.105,6675.2129 -48.1207,-21.439 13.7622,-37.0735 13.5749,-1.4043 -7.9577,23.7795 37.8225,7.7704 0.094,11.4217 -8.3322,-0.8426 z",
	"Bromley and Chislehurst": "m 4557.8907,6653.8675 -3.5575,10.4855 -17.9751,-18.1623 -20.69,29.0222 11.328,17.7878 26.9626,0.9362 1.5915,-12.3578 15.3537,9.4556 0.1872,8.8939 19.1921,-31.2691 z",
	"Eltham": "m 4535.89,6645.8162 -13.1201,-24.7556 20.4225,-7.0752 7.1151,8.2386 21.3454,-6.7407 -17.4134,49.0569 z",
	"Greenwich and Woolwich": "m 4562.9889,6598.8837 -30.6503,3.1114 -13.7032,-10.3934 -4.2044,3.3762 4.7988,11.0553 -11.277,6.4617 -1.3004,7.8393 16.6169,0.7925 19.7274,-7.2819 6.8847,8.0763 21.8458,-6.8847 z",
	"Poplar and Limehouse": "m 4521.847,6585.3377 c -0.9362,-0.1873 -11.9834,8.0513 -11.9834,8.0513 l 4.4938,11.6089 -4.8682,3.1831 -7.1152,-6.7407 2.4342,-7.8641 -27.8052,-5.898 20.8142,-4.3371 -2.5583,-9.0506 17.0389,-6.3661 z",
	"Lewisham Deptford": "m 4507.6168,6611.5513 -8.9876,-9.7365 -11.7961,8.0513 7.1151,39.3204 14.4175,-10.2982 16.6644,7.6769 -18.3495,-26.9626 z",
	"Lewisham East": "m 4522.596,6621.1005 -15.3537,-0.7489 17.975,26.4008 -17.0388,-7.8641 -8.6131,6.3662 15.7282,29.7712 20.5964,-28.6478 z",
	"Bermondsey and Old Southwark": "m 4477.4711,6593.389 20.9709,2.8086 0.3745,5.2427 -11.6089,8.2386 -28.835,4.3065 0.5618,-19.473 15.9154,2.0597 z",
	"Vauxhall": "m 4458.7471,6594.138 -5.6172,-1.6852 -4.1193,23.5923 -14.7919,17.6005 20.5964,1.1235 6.7406,-11.2344 -3.1831,-9.7365 z",
	"Camberwell and Peckham": "m 4461.5557,6623.1602 -3.1831,-9.362 28.4605,-3.5576 7.3024,39.1332 -17.6006,-16.8516 c 0,0 -6.7406,9.5492 -6.9279,8.8003 -0.1872,-0.749 -8.0513,-18.1623 -8.0513,-18.1623 z",
	"Dulwich and West Norwood": "m 4455.0023,6634.5818 2.0597,34.8267 17.0388,1.6851 11.6089,-29.3967 -9.5493,-9.362 -6.3661,8.9876 -8.4258,-17.7878 z",
	"Streatham": "m 4433.7678,6633.9694 8.3411,27.4065 -5.8256,15.7554 13.6371,2.5156 7.2819,-10.0623 -2.3831,-34.9532 z",
	"Battersea": "m 4448.5964,6615.9631 -26.8769,2.1184 -9.6651,20.3894 11.1215,-2.2508 5.2959,11.9159 10.4595,3.7072 -5.2959,-18.4034 z",
	"Tooting": "m 4411.7234,6639.3977 7.8777,29.5249 18.933,1.8536 3.31,-9.5327 -3.0452,-9.5327 -10.3271,-3.7072 -5.4283,-11.6511 z",
	"Putney": "m 4411.1276,6639.3315 -20.257,-12.2469 -1.986,5.4946 -12.0483,1.9198 7.6792,17.0132 -3.7734,9.9299 33.9603,-10.1285 z",
	"Wimbledon": "m 4378.2339,6669.2212 10.4854,28.835 22.6561,-5.0555 8.2385,-24.154 -5.6172,-17.6005 -33.1414,10.1109 z",
	"Bethnal Green and Bow": "m 4469.7007,6578.4098 35.95,-23.3114 6.5534,12.077 -17.4133,6.8343 2.4341,8.8939 -19.5665,4.1192 z",
	"Kingston and Surbiton": "m 4347.6201,6678.9577 -2.9022,19.7538 5.8981,13.3877 -12.826,23.3114 0,19.1921 0.8426,1.966 13.5749,-9.362 9.362,-25.4646 17.6942,-14.4175 5.9917,1.7788 2.9022,-11.2345 -10.1109,-26.9625 -5.43,18.5367 z",
	"Mitcham and Morden": "m 4389.9364,6698.1498 21.6262,-4.681 8.3322,-24.0603 17.7878,1.7787 -1.966,6.2726 14.4175,2.8086 -1.966,16.1962 -17.0389,2.9959 -7.396,-4.681 -7.3023,9.7365 -4.1193,1.217 -7.6769,-6.0853 -5.4299,7.7705 z",
	"Croydon North": "m 4474.3817,6671.4681 10.1109,17.2261 -32.018,27.337 -4.3065,-19.2857 2.3405,-17.3197 7.0215,-9.6429 z",
	"Lewisham West and Penge": "m 4485.0543,6688.1325 12.7324,0.4681 4.7746,-25.8392 12.8259,13.2005 -16.009,-29.8648 -5.43,3.8384 -8.3321,-7.8641 -10.9536,29.0222 z",
	"Beckenham": "m 4490.302,6688.65 28.7305,43.5592 15.3583,-4.1044 6.4875,4.5016 9.9299,-16.4174 2.5156,-22.1106 -26.6121,-0.7944 -11.7835,-17.4766 -12.3131,-13.1075 -4.8988,25.8177 z",
	"Croydon Central": "m 4452.8332,6715.7918 35.7476,9.2679 13.5047,16.947 23.8318,8.2087 -7.4144,-18.5358 -28.5981,-43.162 -5.2959,-0.2648 z",
	"Croydon South": "m 4452.0388,6715.7918 5.2959,21.4486 -16.947,4.5015 2.1184,16.4175 -8.7383,0.2648 2.6479,20.1246 18.2711,10.3271 24.8909,-29.1278 15.6231,-2.6479 6.0903,-15.8879 -12.9751,-16.1526 z",
	"Hornchurch and Upminster": "m 4666.5247,6504.4834 12.0483,30.7165 10.3271,-1.0592 7.1495,20.7866 -29.6573,8.2088 -0.5296,14.5638 -9.9299,-11.5187 -3.0452,19.4626 -26.3473,-37.204 18.4034,-30.5841 -22.3754,-8.8707 10.5919,-14.9611 -9.6651,-15.4906 15.0935,-2.7804 23.6993,19.4626 -5.5607,8.2087 z",
	"Carshalton and Wallington": "m 4416.8053,6704.2351 7.1152,-8.8003 7.1151,4.4938 16.6643,-2.8086 8.9876,39.6949 -16.4772,4.681 1.6852,16.6643 -8.9875,0.5618 -0.1873,-3.3704 -13.6685,-11.9833 4.8683,-15.5409 z",
	"Hayes and Harlington": "m 4245.4807,6592.4528 18.9112,3.3703 18.724,-29.9584 23.4051,14.2303 -17.4134,23.2177 -0.7489,26.5881 -17.7878,14.792 -35.7629,-13.1068 8.6131,-25.0902 z",
	"Orpington": "m 4526.2491,6749.9988 -6.687,-17.5248 14.8287,-3.972 6.8847,4.7664 9.7975,-16.6822 4.5016,-34.6885 15.623,9.2679 0,8.2087 19.0975,-30.6096 15.591,6.2483 6.6199,17.2118 -9.7975,-2.648 2.3831,35.2181 -17.2117,10.3271 0.5296,15.8878 -17.7415,8.2087 6.0904,18.8007 -16.9471,6.0903 -11.651,-3.972 -6.8848,-13.2398 -9.2679,18.0062 z"
},
"North East England": {
	"Middlesbrough South and East Cleveland": "m 3806.4627,3918.2072 123.9252,-73.6137 100.623,28.0685 -126.0436,55.0779 z",
	"Middlesbrough": "m 3805.4035,3917.6776 -30.2699,-51.9379 65.7527,-42.33 z",
	"Redcar": "m 3851.4783,3795.3412 -46.0748,123.6604 125.2492,-74.9377 z",
	"Stockton South": "m 3775.056,3866.3014 -102.8456,64.3513 79.704,26.4797 54.5483,-38.6604 z",
	"Stockton North": "m 3726.4513,3796.21 -52.8017,133.6894 167.7671,-106.3523 z",
	"Hartlepool": "m 3726.4939,3795.8708 61.433,-77.0561 52.9595,104.595 z",
	"Easington": "m 3750.5904,3766.2135 -70.4361,-106.1838 61.433,-58.2554 46.3396,116.7756 z",
	"Darlington": "m 3653.0532,3925.0312 10.111,-41.5673 -46.0611,-7.8641 -10.111,33.7032 z",
	"Sedgefield": "m 3554.9394,3892.0769 72.6492,-141.1789 62.9126,2.2468 10.111,-61.7892 49.2441,74.7088 -23.2178,29.9584 -53.3634,134.6256 -20.5964,-5.9917 0,0 10.2982,-41.38 -45.8738,-7.8641 -10.2982,33.8904 z",
	"Bishop Auckland": "m 3627.8419,3751.0856 -394.5809,-24.1544 79.7643,234.0501 0,0 241.9141,-68.5299 z",
	"City of Durham": "m 3581.1201,3637.7867 -56.888,106.7451 166.2691,9.362 10.111,-62.5382 -42.6908,-62.1637 z",
	"North West Durham": "m 3217.8181,3679.0951 322.5232,-123.3956 -19.3138,55.8814 60.1255,26.2241 -56.5465,105.9778 -291.3455,-17.6005 z",
	"North Durham": "m 3540.7092,3555.0449 120.2081,41.5673 -3.3703,32.9542 -76.7685,7.8641 -60.2913,-26.5881 z",
	"Sunderland Central": "m 3741.3225,3601.5095 -48.7227,-36.542 46.3396,-47.134 z",
	"Houghton and Sunderland South": "m 3660.5593,3596.7431 -3.0451,32.3053 21.9781,31.6433 62.095,-58.785 -48.4579,-37.4688 z",
	"Blaydon": "m 3477.8491,3579.0017 34.9533,-86.8535 115.4516,56.4019 4.7664,38.3955 -92.4985,-32.088 z",
	"Washington and Sunderland West": "m 3627.4597,3548.2852 86.8535,-5.2959 -53.4891,53.2242 -28.0685,-9.5327 z",
	"South Shields": "m 3696.307,3473.6123 42.8972,43.6916 -25.553,25.9502 4.634,-34.1589 -34.1589,14.0343 z",
	"Jarrow": "m 3627.7244,3547.4908 19.5951,-54.813 44.4859,-1.324 -7.6791,31.5109 34.1589,-13.2399 -5.0312,33.6293 z",
	"Tynemouth": "m 3695.7774,3473.3476 -16.1527,-63.0218 -58.4592,24.0965 70.1103,57.1963 z",
	"North Tyneside": "m 3646.8743,3492.5067 -56.7338,-49.0569 3.1831,-31.0818 98.4883,79.2025 z",
	"Gateshead": "m 3639.5719,3513.2903 -67.7809,7.6769 55.7976,27.337 z",
	"Newcastle-upon-Tyne East": "m 3612.0476,3462.7355 -5.2427,54.1124 32.3925,-3.5576 8.2386,-20.4091 z",
	"Newcastle-upon-Tyne Central": "m 3611.6731,3461.9866 -67.2191,45.3121 27.8987,13.294 34.4522,-3.932 z",
	"Newcastle-upon-Tyne North": "m 3512.8104,3491.945 80.326,-79.9515 -2.8086,31.6435 21.5326,18.1623 -67.4064,45.4994 z",
	"Blyth Valley": "m 3679.2668,3409.9338 -26.5881,-57.6699 -65.534,34.0777 5.9917,26.2136 27.8987,21.9071 z",
	"Wansbeck": "m 3523.6703,3354.8853 63.8489,31.2691 65.3468,-33.8905 -2.8086,-57.1082 -117.9613,-12.3578 z",
	"Hexham": "m 3048.0829,3311.5564 175.2959,-169.7352 257.788,284.0281 42.7571,-71.3958 63.0217,31.2461 5.8256,26.7445 -80.4984,79.9689 -34.6885,87.1183 -259.5014,99.5638 -23.8318,-68.3177 -87.6479,19.0654 41.3084,-225.3426 z",
	"Berwick-upon-Tweed": "m 3649.6829,3294.9685 -60.9253,-322.0319 -203.4577,-219.0919 -151.4772,167.3926 74.1471,138.9321 -84.4453,81.4495 257.8296,284.0431 42.5035,-70.5895 8.2385,-72.6491 z"
},
"North West England": {
	"City of Chester": "m 2820.622,5032.2099 69.188,-11.6286 53.8873,65.0792 25.599,-13.2335 -43.8146,101.7143 -57.461,-46.0748 46.8691,-30.9813 z",
	"Ellesmere Port and Neston": "m 2969.2526,5072.0637 10.4854,-69.2788 -177.1291,-16.8516 17.9751,47.1844 69.2788,-12.7323 55.0486,65.1596 z",
	"Wirral South": "m 2801.8214,4985.6055 -7.1496,-20.919 78.6449,-27.5389 38.6404,59.0839 z",
	"Wirral West": "m 2794.5576,4964.0262 -35.2011,-43.4397 35.0139,-22.2816 10.6726,23.5923 15.5825,-14.5217 16.0611,42.4204 z",
	"Birkenhead": "m 2820.6028,4907.2431 14.7731,-14.0618 31.6436,17.2942 6.1789,26.4009 -36.3245,12.7323 z",
	"Wallasey": "m 2794.7448,4897.7432 55.4231,-26.0264 16.4771,38.7587 -31.6435,-17.4133 -30.3329,28.6477 z",
	"Crewe and Nantwich": "m 3159.033,5271.0571 -47.1339,-61.9626 64.6106,-58.2554 60.136,51.7562 -41.6002,23.9759 3.1776,42.3676 z",
	"Eddisbury": "m 2976.5688,5021.9925 11.2633,32.3828 95.398,-7.6403 -18.5004,35.8994 30.2224,11.0085 45.5451,-46.6044 35.4684,104.0405 -64.0361,58.4189 47.5589,62.5382 -149.043,10.1109 -76.7684,-25.4646 -8.2386,-83.1346 43.8142,-101.8586 z",
	"Weaver Vale": "m 2979.3635,5001.6614 55.4231,-22.0943 2.9958,-27.337 28.4605,-7.8641 18.3495,78.6408 69.2788,8.613 -59.1678,61.7893 -30.4538,-11.6549 18.7985,-34.957 -95.8608,7.4067 -10.0707,-32.3205 z",
	"Halton": "m 2957.2574,4966.0105 25.4206,18.0062 14.8286,-27.0093 3.4424,36.0125 33.4968,-13.5047 3.8396,-27.8037 -8.7383,-27.539 -25.4205,-16.4174 z",
	"Garston and Halewood": "m 2991.6811,4922.5838 -56.6667,-12.1807 -27.5389,39.19 49.7819,31.7757 -0.2648,-14.8287 z",
	"Liverpool Riverside": "m 2917.7522,4934.6749 -26.766,-37.1189 -11.6089,2.9958 3.075,-31.2824 -16.9307,5.8178 12.3578,50.9293 29.9584,23.5922 z",
	"Liverpool Wavertree": "m 2890.7933,4897.428 26.7445,-4.5016 18.0062,16.9471 -17.4766,24.3613 z",
	"Knowsley": "m 2925.2169,4900.076 15.0935,-5.5608 -1.5888,-30.4517 -29.3925,-20.919 21.7134,-26.7445 43.4267,36.8068 -4.5015,64.3458 -34.4237,-7.9439 z",
	"Liverpool West Derby": "m 2923.6281,4854.0012 -21.7133,8.2087 10.0623,15.8879 -21.1838,19.0654 26.7445,-4.7664 7.9439,7.944 14.8287,-6.0904 -2.1184,-30.4517 z",
	"Liverpool Walton": "m 2909.0643,4843.1445 -24.6262,8.3411 -4.8987,48.9876 11.3863,-3.0452 20.919,-19.1978 -9.6651,-16.0203 21.7133,-8.0763 z",
	"Bootle": "m 2865.3343,4875.0872 -21.1581,-35.9501 53.5507,-15.1665 -12.9196,27.3371 -2.0596,17.6005 z",
	"Sefton Central": "m 2843.6593,4838.9078 -18.271,-95.5919 36.2773,4.5016 -12.7103,36.542 36.0124,23.3022 0.2648,-31.2461 52.9595,31.5109 -28.9953,35.6152 -24.3614,7.4144 13.2399,-27.4066 z",
	"Southport": "m 2825.1235,4743.3159 70.0389,-110.2881 9.6651,49.3847 -43.4267,65.6698 z",
	"West Lancashire": "m 2904.093,4682.9789 132.1915,33.3287 -17.2527,98.1826 -35.1745,-16.9204 -19.8475,46.061 -32.767,-27.8987 7.4896,-8.2386 -53.7379,-31.0818 -0.1872,31.0818 -35.9501,-23.5922 13.1068,-36.3246 z",
	"St Helens South and Whiston": "m 3030.3415,4924.1725 15.623,-46.8691 -71.2305,-24.0966 -4.5015,64.081 21.7134,5.0312 12.1807,-14.8287 z",
	"St Helens North": "m 2984.5315,4797.8642 92.6791,43.9563 13.7695,33.8941 -45.5451,1.5888 -70.701,-23.8318 -11.1214,-9.7975 z",
	"Warrington South": "m 3037.7558,4902.7239 44.7508,-0.7943 9.0031,25.1557 57.1962,-11.1215 28.0685,11.9159 -101.1525,56.4018 -9.5328,-40.2492 -27.8037,8.2088 -8.4735,-28.3334 z",
	"Warrington North": "m 3091.2449,4875.7146 47.9283,-34.6884 23.567,56.4018 -14.0343,18.0062 -56.6666,11.3863 -10.0623,-25.1557 -44.2212,0.5296 8.7383,-24.6262 z",
	"Makerfield": "m 3026.6343,4772.9732 14.0343,24.6262 60.3738,-18.271 20.1246,24.8909 -43.9564,37.3364 -57.7258,-27.8037 z",
	"Wigan": "m 3034.5783,4729.2816 33.0996,-1.8535 22.7726,20.919 10.5919,30.9813 -60.6386,17.7414 -14.0343,-24.891 z",
	"Bolton West": "m 3068.6047,4728.09 37.4689,6.4876 24.0965,-23.8318 36.2773,24.3614 -24.3614,57.9906 10.8567,11.9159 -31.7757,-1.0592 -19.595,-24.6261 -11.6511,-31.2461 z",
	"Chorley": "m 3008.7605,4709.8191 24.4938,-24.229 -14.0343,-7.4144 35.2181,-25.1557 -10.5919,-16.8146 55.0778,-36.6745 30.1869,54.0187 1.0592,56.9314 -24.3613,24.3614 -37.0717,-7.1495 -34.1588,1.7212 1.5887,-12.8427 z",
	"Leigh": "m 3077.1028,4841.384 14.043,34.2649 48.1207,-34.2649 7.3024,16.6643 23.9667,-2.4341 7.6768,-49.6186 -57.1082,-2.0597 z",
	"Bolton South East": "m 3157.616,4755.628 56.5465,10.4855 -2.2468,13.8557 10.4854,10.111 -10.111,12.7323 -42.6907,-15.7282 -2.9958,18.724 -14.043,-1.1234 -10.111,-11.7961 z",
	"Bolton North East": "m 3149.003,4723.7972 20.9709,-31.8308 32.9542,27.8988 0,43.6269 -44.5631,-8.2386 8.2386,-20.2219 z",
	"Rossendale and Darwen": "m 3116.7977,4632.0496 52.8017,-11.6089 70.7767,40.8183 2.9959,-62.1637 68.9043,25.0902 14.2303,39.6949 -19.8475,37.448 -27.337,-29.9584 -19.8475,20.9709 10.9536,41.3801 -27.4307,-58.2317 -38.197,-1.1235 -2.2468,45.3121 -32.9543,-27.7115 -20.5964,31.4563 -19.0985,-13.1068 -1.4979,-57.6699 z",
	"Bury North": "m 3244.4954,4767.6114 25.8391,-33.3287 -27.1498,-58.7934 -38.5714,-0.749 -1.8724,45.1249 z",
	"Worsley and Eccles South": "m 3163.005,4897.428 62.757,-56.4018 -14.0343,-38.1309 -42.3676,-15.8878 -2.3831,17.7414 10.8567,1.0592 -7.1496,50.0467 -24.0965,2.1184 z",
	"Altrincham and Sale West": "m 3163.005,4897.9576 44.486,0.5296 10.8567,-19.595 14.5638,7.4143 -14.299,20.3894 12.975,-3.4424 16.9471,33.0997 -12.7103,16.1527 -87.1184,-37.0717 z",
	"Wythenshawe and Sale East": "m 3238.737,4878.3626 33.0997,29.6573 3.7072,45.81 -39.4548,-1.324 12.7103,-16.1527 -17.4767,-32.8349 -12.975,2.9128 z",
	"Tatton": "m 3075.8867,4984.0167 100.8878,-56.6666 59.0498,25.1558 70.7009,3.1775 -25.4206,80.4984 -101.1526,34.4237 21.7134,44.486 -47.6635,-27.8038 -14.0343,-41.3084 14.2991,-14.8286 -69.6417,-8.4735 z",
	"Cheadle": "m 3301.7588,4973.1601 20.1246,5.8255 6.8792,-60.5289 -12.1751,8.099 -28.5981,-20.1246 -16.1527,1.5888 3.7072,45.5451 30.9813,2.1184 z",
	"Manchester Withington": "m 3240.3258,4879.157 60.9034,1.324 -12.975,25.4205 -16.1527,2.1184 z",
	"Hazel Grove": "m 3326.5066,4941.3701 43.0652,11.6089 37.448,-53.1762 -73.7726,-21.3453 z",
	"Stockport": "m 3301.7909,4880.7044 11.0471,17.226 20.4092,-19.2857 -4.681,40.0694 -11.6089,8.0513 -29.0222,-20.9709 z",
	"Manchester Gorton": "m 3238.5038,4878.2702 59.9168,-28.2732 25.2774,1.8724 -21.5326,28.4605 z",
	"Stretford and Urmston": "m 3225.8944,4840.7614 44.7507,22.3753 -31.908,14.6963 -5.8256,8.4735 -14.961,-7.4143 -10.3271,19.4626 -44.486,-1.0592 z",
	"Salford and Eccles": "m 3222.4947,4790.1738 50.9293,46.9036 -20.1283,17.2261 -27.7115,-13.8557 -13.4813,-37.6353 z",
	"Bury South": "m 3262.4705,4744.3936 16.8516,44.1887 -19.473,1.1234 3.3703,12.7323 7.1151,-0.7489 -21.0645,12.6387 0,0 -37.3543,-34.5458 2.0596,-13.7622 -11.0472,-2.6213 -0.094,-42.9716 41.4737,47.0909 z",
	"Blackley and Broughton": "m 3279.2511,4788.5963 33.0996,15.3582 -38.9934,33.1091 -24.4255,-22.6496 21.1838,-12.4455 -6.8848,0.1324 -3.4423,-12.4454 z",
	"Manchester Central": "m 3312.7479,4804.4841 11.3863,47.1339 -25.6853,-1.8535 -27.6714,13.1074 -17.8738,-8.8707 z",
	"Heywood and Middleton": "m 3295.2375,4689.9068 25.0901,60.6657 -17.226,48.6824 -23.7795,-10.6726 -17.4134,-43.8142 8.6131,-11.0472 -11.2344,-41.38 19.8474,-20.7837 z",
	"Rochdale": "m 3326.5066,4663.6932 48.1207,-1.498 12.9195,57.8572 -66.8447,30.7074 -25.8391,-61.4148 11.9834,11.6089 z",
	"Oldham West and Royton": "m 3302.9143,4799.4422 40.2566,18.9112 8.8003,-12.9195 -11.6089,-23.5923 11.9834,-17.2261 -17.9751,-20.2219 -13.6685,6.1789 z",
	"Congleton": "m 3234.5779,5052.2703 60.561,59.3788 29.1277,-9.0031 -44.5447,78.3534 -42.8275,21.0503 -61.1791,-52.005 -21.4486,-62.4922 48.1931,27.8038 -22.5078,-45.0156 z",
	"Macclesfield": "m 3391.6661,4922.6461 15.7282,161.4009 -63.6617,36.3246 -19.4729,-18.3495 -29.9584,9.362 -59.9168,-59.1679 46.4355,-16.4771 20.5964,-63.2871 20.5964,6.3661 4.4938,-38.1969 42.6907,12.3578 z",
	"Oldham East and Saddleworth": "m 3352.0704,4805.0137 68.8473,15.3582 42.3676,-17.4766 -75.9969,-82.8816 -52.6947,24.6262 17.7414,19.8598 -11.9158,17.2118 z",
	"Stalybridge and Hyde": "m 3369.2822,4809.5153 -20.6542,73.084 39.7196,11.1215 31.7757,-73.0841 z",
	"Ashton-under-Lyne": "m 3324.0724,4851.6822 36.8863,-12.3579 8.6131,-30.1456 -17.4133,-4.4938 -9.3621,13.6685 -30.5201,-14.4175 z",
	"Denton and Reddish": "m 3323.8852,4851.6822 -22.2816,29.2094 11.2344,16.8516 20.222,-19.2857 15.7281,4.1193 12.1706,-43.2525 z",
	"South Ribble": "m 2895.2948,4632.6306 122.866,-35.7476 36.0125,56.137 -35.2181,25.1557 14.0343,7.4144 -23.8318,24.0965 -104.595,-27.2741 z",
	"Fylde": "m 2932.179,4621.5641 -89.894,-39.7183 38.1812,-26.2713 -8.9529,-25.758 62.9126,-32.2053 83.7284,98.8291 z",
	"Preston": "m 3021.8177,4601.8397 61.4641,-32.7028 -86.736,0.1042 z",
	"Blackpool South": "m 2842.0706,4581.5246 1.3239,-48.7226 27.2742,-2.9128 9.7975,25.1557 z",
	"Blackpool North and Cleveleys": "m 2871.1983,4529.8892 2.803,-65.6753 -26.1052,4.7719 -4.5016,64.081 z",
	"Wyre and Preston North": "m 2874.5091,4464.0953 155.7837,-29.7712 52.4272,135.1873 -86.8793,-0.3745 -61.7893,-71.5257 -62.5381,31.8308 z",
	"Lancaster and Fleetwood": "m 2849.7934,4439.9413 256.1444,-175.2567 50.1803,71.9002 -103.3565,154.2858 -23.2177,-57.2955 -181.6229,35.5757 z",
	"Morecambe and Lunesdale": "m 2959.1416,4221.2449 -31.8308,166.6437 179.1378,-123.024 58.4675,-99.5118 z",
	"Ribble Valley": "m 3044.1486,4635.7944 287.9752,-189.8614 -176.7546,-109.7227 -102.6076,155.4093 29.584,77.5173 -60.7424,32.5124 z",
	"Blackburn": "m 3154.5315,4562.7241 15.2258,57.8582 -53.1468,11.4673 -17.9751,-32.5798 z",
	"Hyndburn": "m 3243.372,4598.9081 -42.3163,-67.2192 -46.4355,31.2691 14.9792,57.2955 71.1512,41.1928 z",
	"Burnley": "m 3311.5274,4623.4365 31.4563,-75.2705 -141.179,-16.4771 41.5673,67.4064 z",
	"Pendle": "m 3332.4753,4445.6836 45.81,85.7944 -35.7477,16.4174 -140.3426,-16.4174 z",
	"Westmorland and Lonsdale": "m 2795.8683,3964.3516 89.1262,276.3663 279.7367,-74.5215 0.3744,-0.3745 64.0361,-90.2497 -354.6326,-153.1624 z",
	"Barrow and Furness": "m 2795.8641,3965.2561 -60.5069,307.5148 42.3676,66.729 86.8535,-160.4673 z",
	"Copeland": "m 2747.9348,4206.2657 -197.7254,-298.0861 180.4994,-180.4994 71.9002,97.5521 69.6533,-4.4002 2.2468,101.9522 -77.8919,41.5673 z",
	"Workington": "m 2779.9269,3522.1463 -134.782,144.0663 -70.2549,216.7765 155.9656,-155.1712 70.8514,97.8021 33.151,-2.4785 -43.2429,-195.7103 85.529,-9.9517 z",
	"Carlisle": "m 2813.2076,3553.0516 32.9359,-52.1582 132.8273,59.5725 36.0125,79.9688 -120.2181,39.7196 -19.0654,-63.0218 z",
	"Penrith and the Border": "m 3312.6508,3960.9813 -118.1349,-350.2039 -87.9127,19.0654 41.3083,-225.6074 -99.5638,-93.2087 -202.3052,189.595 0,0 132.9465,60.0404 36.3246,79.7642 -119.8336,39.3204 -19.0985,-62.9126 -85.007,10.4854 43.8142,195.4786 36.699,-2.2468 2.2469,101.4841 355.0071,153.5368 z"
},
"Yorkshire and the Humber": {
	"Cleethorpes": "m 4388.7194,4864.4145 -88.1901,-154.8475 -15.7282,59.1678 -82.3856,-122.8295 107.8503,-23.9667 98.8627,110.8461 -23.9667,23.2178 35.9501,36.699 19.4729,-49.4313 37.4041,38.7061 -55.6074,75.7321 z",
	"Great Grimsby": "m 4408.9413,4732.5975 31.4563,10.1109 -19.0985,50.1804 -35.9501,-37.2608 z",
	"Scunthorpe": "m 4059.9213,4802.3604 11.2389,-32.8766 32.1404,-2.6009 6.6183,-58.0649 38.9459,21.3454 18.724,47.1844 29.9585,6.9279 38.5714,-8.4258 15.5409,26.7753 -43.0652,8.9876 9.362,29.0222 -84.0708,16.1026 2.8086,-51.6782 z",
	"Sheffield Hallam": "m 3604.1835,4988.5546 -47.1844,-96.9903 103.7309,-1.4979 8.9876,99.4244 z",
	"Penistone and Stocksbridge": "m 3503.7992,4786.213 128.162,-57.461 87.3831,160.2025 -162.8504,2.3832 z",
	"Sheffield Brightside and Hillsborough": "m 3660.8241,4890.0137 41.9704,34.9532 16.8147,-35.218 z",
	"Sheffield Central": "m 3668.2385,4970.5121 26.4797,-32.8349 16.4174,13.5047 9.5327,-12.1807 -60.109,-49.2523 z",
	"Sheffield Heeley": "m 3689.687,4989.5775 42.1028,-41.838 -11.2539,-8.8707 -9.1355,12.0483 -16.6822,-13.2399 -26.4797,32.8349 1.5887,18.271 z",
	"Sheffield South East": "m 3719.6092,4889.2193 65.4049,101.6822 -95.0623,-1.5888 42.1028,-41.838 -29.2601,-22.6402 z",
	"Rother Valley": "m 3887.2259,4888.6897 -151.186,26.2122 49.239,75.7348 75.9969,-0.2648 z",
	"Rotherham": "m 3699.799,4853.7645 119.5234,46.7873 -83.4155,14.3238 z",
	"Wentworth and Dearne": "m 3699.6169,4853.604 62.3598,-84.8675 56.9315,131.6043 z",
	"Barnsley Central": "m 3668.0324,4793.825 51.6782,-24.3412 -22.0943,-50.9293 -65.6551,10.4623 z",
	"Barnsley East": "m 3697.3662,4718.4249 49.2523,17.2119 15.0934,32.8349 -61.9626,84.4703 -32.0404,-59.0498 52.165,-24.3614 z",
	"Doncaster Central": "m 3891.597,4726.4186 -46.4355,105.6034 93.62,-42.6908 z",
	"Don Valley": "m 3844.4611,4832.1554 -55.7398,-1.9859 30.3193,70.1713 68.1853,-11.7835 83.1464,-67.9206 25.5174,-88.6009 -44.0014,-26.5881 -41.5673,44.9376 28.5404,39.0054 z",
	"Doncaster North": "m 3753.4139,4749.2619 56.3592,-40.4439 101.8586,-26.0263 93.8073,14.0429 -9.362,35.0139 -44.3759,-26.7753 -41.3801,45.3121 -18.724,-24.154 -46.81,105.7906 0,0 -56.172,-1.6851 z",
	"Wakefield": "m 3632.4908,4729.0168 -30.1869,-44.2211 25.4205,-48.9875 15.0935,24.8909 46.8691,-10.0623 -32.3052,44.7508 19.8598,26.2149 z",
	"Hemsworth": "m 3668.2385,4681.0885 65.9345,-47.3987 75.7321,74.9376 -56.9315,40.7788 -6.0903,-13.7694 -49.7819,-17.4766 -19.595,3.7071 -20.6542,-26.7445 z",
	"Normanton Pontefract and Castleford": "m 3668.5941,4679.6086 42.129,-57.4827 61.602,-16.4772 57.2955,41.5673 -19.8475,61.4148 -75.645,-75.0833 z",
	"Dewsbury": "m 3627.963,4635.4199 -79.3897,21.3454 11.9833,57.6699 -39.3204,6.3662 34.4255,42.4447 76.6079,-34.3934 -30.3329,-44.1887 z",
	"Huddersfield": "m 3548.386,4656.7653 -65.3468,17.0389 38.197,47.1844 39.5077,-6.3662 z",
	"Colne Valley": "m 3387.5468,4720.0524 75.974,82.8698 92.9353,-39.5664 -73.4169,-89.7389 z",
	"Keighley": "m 3377.8103,4531.3144 49.4314,-117.2122 92.8899,33.1548 -84.2769,87.4278 -5.2427,34.8266 z",
	"Calder Valley": "m 3548.5733,4656.0163 -35.2012,-50.5548 -26.2136,18.724 13.1068,20.5964 -58.7934,-5.6172 -11.2344,-69.6533 -52.8016,-38.197 -34.4522,16.4772 -31.0819,75.6449 14.6048,39.3205 48.3079,-0.3745 13.1068,56.9209 95.4924,-46.061 z",
	"Halifax": "m 3430.9865,4569.1369 82.5729,36.3246 -26.2136,18.3495 12.9195,20.7837 -58.7933,-5.8045 z",
	"Shipley": "m 3430.7859,4569.2466 114.9787,-39.0556 9.9238,-32.5798 -43.9452,-26.2422 36.542,-13.7695 -28.3333,-9.7975 -84.2056,87.1183 z",
	"Bradford West": "m 3432.8589,4569.5114 99.9862,2.9959 12.7323,-42.3163 z",
	"Bradford South": "m 3523.4831,4620.0662 71.5257,-46.4355 -163.2733,-4.4938 81.5965,36.4844 z",
	"Bradford East": "m 3555.9644,4497.3191 4.5015,75.2025 -27.5389,-0.5296 z",
	"Pudsey": "m 3595.4192,4573.316 -12.9751,-43.6916 19.2416,-7.77 -53.1357,-64.5197 -36.8068,13.7695 44.2212,26.7445 4.5015,73.8785 z",
	"Leeds West": "m 3601.9505,4521.6672 32.6908,38.9518 -14.3312,23.8185 -25.4205,-11.1215 -12.7103,-43.6916 z",
	"Batley and Spen": "m 3568.9394,4590.5278 59.3146,44.7508 -79.4392,21.1838 -25.4205,-36.8069 z",
	"Morley and Outwood": "m 3620.5749,4584.1727 21.9782,28.5981 68.3177,9.0031 -21.4486,28.8629 -47.1339,9.7975 -14.5639,-25.4205 -58.2554,-44.486 25.4206,-17.2118 z",
	"Leeds North West": "m 3548.1988,4456.7929 86.1304,1.4979 -1e-4,102.0458 z",
	"Elmet and Rothwell": "m 3642.5678,4612.2021 77.8918,-72.6491 -86.9096,-81.9535 136.6355,-29.6573 2.1183,177.9439 -60.8317,16.427 z",
	"Leeds North East": "m 3634.8909,4560.7111 57.2955,-47.5589 -58.0444,-54.8614 z",
	"Leeds East": "m 3651.368,4547.0426 30.3329,28.2733 38.7587,-35.5757 -28.4605,-26.9625 z",
	"Leeds Central": "m 3681.3459,4575.8315 -38.9252,36.4097 -21.8458,-28.2009 14.1667,-23.4346 16.6822,-13.3723 z",
	"Selby and Ainsty": "m 3633.9547,4457.9164 139.3066,-139.3066 65.9085,56.9209 -9.7365,71.9002 140.8045,26.9626 3.7448,152.7878 -62.9126,55.4231 -101.1097,26.2136 19.8475,-61.7892 -57.6699,-41.9418 -1.8724,-177.5035 z",
	"York Outer": "m 3839.9188,4374.7818 90.6241,-51.6783 39.6949,151.29 -140.8045,-27.3371 z m 44.7043,15.0299 -30.5212,23.077 26.0547,24.8139 32.5063,-21.8363 z",
	"York Central": "m 3854.149,4412.9787 25.4646,24.7157 32.9543,-21.7198 -28.086,-25.8391 z",
	"Harrogate and Knaresborough": "m 3633.55,4457.0699 -14.8287,-136.6354 110.6854,-36.5421 43.8546,34.3429 z",
	"Skipton and Ripon": "m 3728.8533,4283.7189 -34.8039,-100.0544 -529.0307,-18.6785 -58.9451,99.841 50.3115,72.0249 175.8254,108.5669 45.5452,85.2648 48.7227,-117.0405 0,0 121.2772,43.4268 86.324,0.5296 -15.3583,-138.2242 z",
	"Thirsk and Malton": "m 3693.8715,4183.048 -24.7157,-74.896 226.186,-100.3607 254.6465,79.3898 -23.2178,97.3648 176.0056,-20.2219 38.946,60.6657 -394.3276,162.5244 -17.6005,-64.7851 -90.6242,52.0528 -110.0971,-91.3732 z",
	"East Yorkshire": "m 3969.3131,4474.5465 150.4049,63.5514 6.8848,-110.6853 232.4921,-24.3614 -21.1838,-121.2772 77.3208,-22.7725 -74.1432,-34.9533 -394.0686,163.4659 z",
	"Beverley and Holderness": "m 4359.0949,4403.0512 195.9501,317.2273 -224.5482,-114.3924 -38.6605,-73.0841 -172.1183,5.2959 7.0525,-111.2634 z",
	"Haltemprice and Howden": "m 3975.1386,4627.5994 242.0249,-4.2367 74.6728,-90.0311 -172.1183,4.2367 -149.8753,-63.5514 z",
	"Kingston-upon-Hull East": "m 4301.2782,4550.7874 -18.3495,56.172 46.81,-0.7489 z",
	"Kingston-upon-Hull North": "m 4251.4724,4582.6182 37.6352,5.8045 11.9834,-37.4481 -9.362,-17.7878 z",
	"Kingston-upon-Hull West and Hessle": "m 4217.3011,4623.5302 65.2531,-16.4772 6.4598,-18.5367 -38.0097,-6.0853 z",
	"Brigg and Goole": "m 4202.8644,4645.8705 -99.5638,-20.3894 -129.2211,1.5887 -62.4922,55.3427 94.2678,14.2991 -35.218,123.6603 63.5514,51.9003 37.0716,-102.7414 31.5109,-3.1775 6.8847,-57.4611 39.4548,21.1838 18.5359,46.6044 29.6573,7.4143 39.7196,-34.9533 47.1339,19.0655 z",
	"Scarborough and Whitby": "m 3894.6402,4007.9735 10.5919,-81.028 126.5732,-54.0187 270.6229,291.2772 -175.2958,19.8598 22.5077,-97.1807 z",
	"Richmond Yorks": "m 3165.1056,4163.9495 148.0395,-202.5803 241.4953,-68.8474 197.0092,64.6106 54.0187,-38.1308 99.299,8.7383 -10.3271,80.2336 -225.3426,100.0934 24.6262,75.4673 z"

},
"East Midlands": {
	"South Holland and the Deepings": "m 4624.9515,5423.0508 -115.9813,-79.9688 -70.9657,37.6012 -90.5607,-62.4921 -56.6666,241.4952 210.7787,-10.5919 76.2617,-53.4891 z",
	"Grantham and Stamford": "m 4216.6339,5577.0305 36.2772,-57.0638 -129.1364,-44.2135 -55.4231,-148.2941 47.1845,20.9709 86.1304,-55.4231 45.6866,66.6575 94.7948,-21.3487 -51.3707,220.5762 z",
	"Boston and Skegness": "m 4501.0263,5347.054 164.1744,-189.3302 -4.4216,-96.1456 -262.885,158.0306 -26.1604,-36.5328 -24.5547,134.5855 90.5607,62.7569 z",
	"Sleaford and North Hykeham": "m 4069.1006,5327.4591 -22.4688,-77.1429 56.172,-47.9335 -17.2261,-127.3232 35.9501,-26.9626 90.6242,77.8919 -4.4938,-67.4064 79.3898,-0.749 84.7632,125.2104 -29.3402,155.2752 -95.1179,21.3454 -45.8738,-66.8447 -85.9432,55.2358 z",
	"Lincoln": "m 4121.4392,5047.8329 90.4283,77.8504 -4.3691,-67.6557 -8.7383,-25.0233 z",
	"Louth and Horncastle": "m 4312.7774,5095.6293 43.9239,-225.0359 65.9085,-12.7323 55.423,-75.645 93.6201,55.423 89.311,223.6985 -263.2086,158.3488 z",
	"Gainsborough": "m 4284.8011,4768.7348 -47.559,-19.8474 -39.3204,35.2011 38.197,-8.2386 15.7282,26.9626 -43.0652,8.613 8.9875,29.2095 -83.8836,16.4771 2.9959,-51.6782 -77.1474,-3.4158 -26.2091,71.1966 27.337,170.3885 60.7096,4.2297 77.5857,-14.8286 8.2087,25.2881 79.4392,-0.3972 26.4798,37.6012 43.4163,-225.0903 31.6436,-6.5534 -87.9026,-154.5633 z",
	"Wellingborough": "m 4115.9106,5988.3228 -49.0569,-145.5791 89.1263,-9.7365 -3.3704,49.4314 61.3763,-10.5562 -21.9782,58.7851 -23.3021,-24.0966 -26.7446,7.9439 -11.3863,65.1402 z",
	"Corby": "m 4155.7927,5832.82 -32.018,-106.7269 -27.3371,27.5243 -36.6991,-59.9168 130.9452,-75.2293 26.0826,-41.176 10.7394,63.8845 35.7628,-10.9536 33.0479,136.0299 -55.5859,83.7805 15.4906,21.1838 -42.6324,0.5296 -61.0358,10.5919 z",
	"Rutland and Melton": "m 4060.1131,5693.7006 -154.2858,-84.258 65.9085,-62.9127 -52.2046,-113.9464 136.1059,-148.2865 68.0529,191.4485 128.9563,44.2212 -61.6978,97.7102 z",
	"Kettering": "m 4007.7087,5665.6053 3.972,135.5762 54.7985,41.5622 88.939,-10.111 -31.6435,-106.5396 -27.3371,27.1498 -36.8863,-59.7295 z",
	"Daventry": "m 4097.2527,5932.7906 -21.8026,7.9038 -24.61,-30.873 -1.6245,-4.3784 -57.7721,9.483 -21.237,21.4174 31.6194,30.109 -176.5626,60.8661 -23.7299,-70.8262 35.9106,-77.9899 -50.3115,-12.9751 70.4361,-25.1558 -14.8286,-36.542 130.4937,-75.6767 36.5118,16.1026 1.8724,56.7338 55.0486,41.9417 z",
	"Northampton North": "m 4049.2819,5905.5117 5.8256,18.0062 -32.8349,20.1246 -30.1869,-28.5981 z",
	"Northampton South": "m 3991.5832,5914.8311 -21.5326,21.5326 31.443,29.7806 73.9731,-25.0996 -25.4646,-32.5798 4.8682,14.792 -32.9542,20.4092 z",
	"South Northamptonshire": "m 3801.3563,5957.3036 -27.9556,59.926 44.4483,58.8116 -41.838,13.2399 22.243,93.2087 181.9158,-95.8567 39.9844,43.162 27.539,-38.3956 -36.8069,-41.838 105.1246,-61.433 -19.3302,-55.0779 -270.8878,94.7975 z",
	"Harborough": "m 3905.8272,5609.4426 -39.8124,25.5587 48.051,67.6868 -36.3246,80.8877 95.118,-55.423 36.3246,16.4771 -2.2469,-79.7642 z",
	"South Leicestershire": "m 3761.6524,5719.5397 44.5631,-110.0971 34.8267,-8.613 72.2747,101.1096 -35.9501,81.6366 -35.2012,19.8475 z",
	"Leicester South": "m 3841.1512,5600.7299 37.6012,-18.271 27.2741,26.7445 -40.2492,25.9502 z",
	"Leicester East": "m 3878.4876,5582.4589 9.3111,-29.8634 50.5331,25.6266 -32.5701,31.2461 z",
	"Leicester West": "m 3860.2166,5538.7673 -19.3302,61.6978 37.6012,-18.271 9.4983,-29.8179 z",
	"Charnwood": "m 3806.59,5608.3192 -17.2261,-83.8836 47.559,-32.2053 54.2996,21.3454 -13.8557,-38.5714 52.4272,-19.473 41.9417,90.6242 -33.7032,32.2053 -77.8918,-40.0694 -19.473,62.1637 z",
	"Bosworth": "m 3629.3132,5539.5617 159.9377,-15.0935 16.6822,84.4704 0,0 -44.486,110.6853 -39.19,-38.9251 -48.4579,-24.3614 z",
	"South Derbyshire": "m 3481.9158,5343.1873 162.5244,-8.9876 6.9184,35.2466 54.4963,23.9213 24.0603,-39.9758 41.8482,30.9883 -141.5535,154.2858 -63.6616,-26.5881 59.1678,-91.7476 z",
	"North West Leicestershire": "m 3789.3639,5524.0611 9.2296,-143.6037 -26.7392,3.7903 -142.0189,155.1671 z",
	"Loughborough": "m 3795.606,5436.2907 123.9252,-3.4424 10.0623,22.7726 -52.4299,19.3302 14.2991,39.1901 -55.0779,-21.9782 -46.3395,32.3052 z",
	"Derby North": "m 3651.5562,5369.0322 61.2054,-33.2975 -25.7225,-27.0763 -42.8972,24.8909 z",
	"Derby South": "m 3712.9649,5335.7347 16.9448,17.372 -24.07,39.7572 -53.7539,-23.8317 z",
	"Derbyshire Dales": "m 3407.1482,5084.1102 173.9719,-142.9906 111.2149,234.0809 -30.7165,149.3457 -18.0062,9.5327 -163.1152,8.4735 48.1931,-70.9657 -25.9501,-141.4018 z",
	"Mid Derbyshire": "m 3682.5375,5222.864 12.9751,63.0218 69.3769,3.1776 -34.7266,64.666 -43.4065,-45.1815 -24.9029,14.2302 z",
	"Erewash": "m 3729.9362,5353.1443 47.6636,-88.9719 15.3582,86.8535 24.0966,27.2742 -45.5452,5.5607 z",
	"Amber Valley": "m 3692.3736,5174.6712 69.6533,20.222 15.3537,68.5298 -13.1531,25.3756 -68.7149,-3.1776 -12.8427,-62.3598 z",
	"Rushcliffe": "m 3816.701,5378.0139 82.5813,-62.9133 23.2667,-48.6143 80.6431,75.203 -83.5091,91.3732 -124.3274,2.6213 3.3703,-55.0485 z",
	"Broxtowe": "m 3852.6511,5350.3024 -43.8142,-38.197 14.083,-117.1947 -45.5393,68.5123 15.3537,87.2539 23.9667,27.337 z",
	"Nottingham North": "m 3808.8369,5311.9182 69.8405,-62.5382 -63.6616,7.6768 z",
	"Nottingham South": "m 3838.6081,5285.5173 43.0652,42.3163 -28.6477,22.2815 -44.0014,-38.3842 z",
	"Nottingham East": "m 3862.0131,5264.3592 37.448,49.9931 -17.4133,13.294 -43.8142,-42.6907 z",
	"Gedling": "m 3879.6136,5249.0055 42.7481,17.1839 -23.0879,48.3501 -37.0735,-50.3675 z",
	"Newark": "m 3922.3044,5265.2954 0.7489,-229.9308 127.3233,-55.423 10.8599,64.0361 0,0 59.9168,4.1193 -35.5756,27.337 17.2261,126.1998 -56.921,48.6824 9.7365,33.3287 -53.1762,56.921 z",
	"Sherwood": "m 3823.0296,5194.8464 99.6493,-159.4818 -0.749,230.6798 -42.3162,-16.8517 -64.4106,7.4897 z",
	"Mansfield": "m 3922.444,5035.6522 -122.866,85.2648 43.1619,42.8971 z",
	"Ashfield": "m 3799.8428,5120.6522 -35.4829,3.7072 -2.3832,70.4361 15.6231,67.7881 65.1401,-98.2399 z",
	"Bassetlaw": "m 3833.472,5097.3501 53.7539,-208.6604 83.1464,-68.3177 63.2866,52.165 16.6822,106.9782 -127.3675,55.3426 z",
	"Bolsover": "m 3684.3911,5159.3126 62.4922,-68.3177 -25.4206,-31.2461 43.4268,-5.8255 1.5888,-63.0218 94.7975,0 -27.8038,105.6541 -33.6292,23.8318 -35.7477,3.972 -2.1184,70.4361 -69.6417,-20.6542 z",
	"Chesterfield": "m 3764.2738,5037.237 -73.3981,-21.7198 -9.362,56.172 43.4397,7.8641 -3.3704,-19.473 42.6908,-5.9917 z",
	"North East Derbyshire": "m 3603.8927,4988.7831 162.8504,2.1184 -1.324,45.8099 -74.6729,-21.7134 -9.2679,56.4019 43.162,7.9439 -3.1776,-19.0654 25.4206,30.9813 -61.9626,68.0529 z",
	"High Peak": "m 3580.4041,4940.9957 -76.7309,-154.184 -83.1267,33.4995 -32.4637,73.4096 19.0654,6.3552 -15.623,21.7134 0,0 15.8878,161.7912 z"
},
"West Midlands": {
	"Telford": "m 3130.1701,5596.2283 19.3302,-81.8223 36.8069,29.9221 -16.4175,55.0778 z",
	"West Worcestershire": "m 3450.4595,6129.9699 -193.9807,-129.9446 -0.5299,-130.526 c 0,0 -92.3412,5.4497 -93.0901,3.9517 -0.749,-1.4979 -2.2469,-55.423 -2.2469,-55.423 l -93.7283,68.6831 -8.7384,63.5514 c 0,0 132.134,6.6199 133.1931,6.3551 1.0592,-0.2648 33.6293,231.8301 33.6293,231.8301 l 88.5747,-11.7835 -5.4283,-49.7819 31.9081,7.0172 -14.1667,34.8208 58.1231,-6.0903 z",
	"Worcester": "m 3256.2137,5999.7796 22.243,-42.3676 38.3956,18.0062 -27.2741,46.3396 z",
	"Wyre Forest": "m 3256.1043,5869.3318 17.9751,-31.0819 35.9501,41.5673 24.4318,-47.2572 -12.7668,-51.2811 -77.9263,-24.3185 -82.8816,60.9034 2.1184,56.137 z",
	"The Wrekin": "m 3170.1545,5417.2253 62.4922,82.0872 5.296,51.9003 36.0124,1.5888 -11.1215,65.1401 -33.5046,-13.7418 -59.7296,-5.0555 16.2899,-54.6741 -36.6538,-30.0643 -19.0654,81.8223 -105.9189,-130.5451 129.2211,-15.8878 z",
	"Newcastle-under-Lyme": "m 3197.2963,5254.7721 41.176,-11.7835 0,29.6573 50.8411,12.1807 -12.1807,-76.2617 -19.595,9.5328 -8.7062,-22.1999 -53.786,30.4086 z",
	"Stoke-on-Trent North": "m 3280.2583,5180.8501 52.6144,30.1457 -30.3329,30.1456 -22.4688,-14.6047 -2.9958,-18.3495 -19.2857,9.9237 -9.1748,-22.0943 z",
	"Stoke-on-Trent Central": "m 3289.9948,5285.5173 23.2177,-26.2136 39.8484,7.6957 -20.0009,-56.3781 -30.3329,30.7074 -22.2816,-14.792 z",
	"Stoke-on-Trent South": "m 3289.8075,5285.5173 14.4175,33.3288 20.2219,-30.8946 12.5451,19.8474 25.7561,-15.8927 -9.1349,-24.5096 -40.2134,-8.0929 z",
	"Stone": "m 3232.8865,5499.7199 36.3246,20.9709 51.3038,-57.2954 -68.1554,-46.81 101.1096,-27.7116 -3.3703,17.6006 76.7684,9.7365 -1.921,-48.1904 -46.7614,-30.076 74.896,-21.7198 -32.5797,-61.0403 -83.3219,52.8017 -13.1068,-19.8474 -20.0346,31.2691 -14.6048,-34.2649 -50.9293,-12.5451 0,0 0,-29.7712 -41.1928,11.7961 1.1235,15.3537 -41.9418,109.9099 42.3163,-17.7878 -28.6478,55.2358 z",
	"Stafford": "m 3269.7728,5576.6756 161.2137,-107.2885 -4.3065,-53.5507 -76.9557,-9.5492 0,0 3.7448,-17.6006 -101.1096,27.8988 68.1554,46.9972 -51.491,56.921 -36.5118,-20.7837 5.2427,51.3038 36.3246,1.6852 z",
	"South Staffordshire": "m 3321.2881,5780.7691 -25.8634,-73.9617 23.9667,-5.2427 5.6172,-37.8225 -37.0735,-26.2136 43.4397,-49.0569 28.4605,25.8391 46.4355,-27.7115 -34.0777,-42.6907 20.5964,-49.4314 -122.455,81.6367 0,0 -7.864,42.3162 -33.0014,-14.7874 14.0343,153.5825 z",
	"Staffordshire Moorlands": "m 3407.413,5084.6398 96.3863,46.6043 16.8938,95.9943 -56.6135,19.987 12.7103,43.4267 -33.3644,7.4144 -23.0374,-43.4268 -57.9907,36.8068 -29.1277,-80.4984 -53.2242,-30.7165 43.9563,-77.5856 19.8598,18.0062 z",
	"Burton": "m 3520.4815,5227.1008 8.7383,45.0155 -48.8019,71.4454 144.9238,77.1429 -35.2011,54.2996 -211.3941,-137.4341 74.3343,-21.3454 -9.5492,-18.1623 33.1415,-7.6768 -12.3287,-43.425 z",
	"Cannock Chase": "m 3430.7152,5469.1256 18.271,29.6573 -27.8037,88.1775 -14.5639,0 -34.6884,-43.1619 21.2338,-49.3213 z",
	"Aldridge-Brownhills": "m 3405.8242,5587.49 53.7539,72.0249 12.8682,-22.4435 -15.2514,-67.058 -29.6573,-2.3832 -6.6199,19.3302 z",
	"Sutton Coldfield": "m 3459.447,5659.4357 84.258,34.6393 -30.1456,-70.0277 -30.7074,-5.6172 z",
	"Birmingham Erdington": "m 3459.8215,5659.8102 24.154,52.9889 60.2912,-18.1623 z",
	"Walsall North": "m 3375.5635,5605.6978 -14.792,32.018 13.1068,10.2983 55.0486,-29.3967 -23.0306,-31.8308 z",
	"Wolverhampton South West": "m 3312.6508,5610.3788 20.0347,20.7837 -7.6769,32.3925 -37.0735,-26.4009 z",
	"Wolverhampton North East": "m 3332.9663,5631.4433 27.8052,6.3662 14.9792,-32.8607 -15.8218,9.2684 -28.5541,-25.8391 -19.1921,21.8135 z",
	"Dudley North": "m 3319.1031,5701.7501 42.8972,19.1978 8.4735,-17.609 -45.4128,-39.9844 z",
	"Wolverhampton South East": "m 3373.9161,5647.9962 -16.8146,43.4268 -32.0405,-28.2009 7.8115,-32.1729 27.8038,6.7523 z",
	"Walsall South": "m 3368.0906,5664.0165 27.8037,-12.1807 53.0257,19.595 10.5257,-12.0483 -30.5841,-40.7788 -55.0779,29.5249 z",
	"West Bromwich West": "m 3362.1327,5720.6831 37.7336,-1.8536 -12.8427,-26.4797 8.6059,-40.514 -27.8037,11.9159 -10.5919,27.8037 13.1075,11.7835 z",
	"Birmingham Perry Barr": "m 3421.4473,5704.1333 27.6713,14.0343 9.1355,-17.7415 25.6642,12.1956 -24.605,-53.6364 z",
	"Warley": "m 3378.1529,5719.7563 15.4906,28.2009 32.9673,-14.4314 6.0904,-23.8318 -11.5187,-5.6931 -26.4798,3.4424 5.1636,11.3862 z",
	"Birmingham Edgbaston": "m 3393.3787,5748.0897 -2.5156,27.2079 13.9019,18.2048 17.2119,-29.6573 28.4657,-2.2508 6.8847,-16.285 -30.5841,-11.5187 z",
	"Birmingham Northfield": "m 3422.5065,5764.2423 3.3099,30.4517 22.243,-7.4143 -0.5684,27.5887 -46.6979,9.0857 -19.3302,-22.7726 23.3021,-7.4143 z",
	"Birmingham Selly Oak": "m 3450.575,5761.9915 12.8427,18.1386 16.947,-2.7803 4.5431,30.0323 -37.4329,7.5267 0.7169,-27.7615 -22.243,7.4143 -3.4423,-30.7165 z",
	"Birmingham Ladywood": "m 3484.1831,5712.9092 -10.1735,18.3658 10.5919,0.7944 -7.1496,14.4315 -20.3894,-1.324 -30.5841,-11.5187 6.4876,-23.567 16.0202,8.0764 9.4003,-17.7415 z",
	"Birmingham Hodge Hill": "m 3478.171,5746.3151 34.6394,-23.9668 18.1623,27.8052 3.932,-35.6692 -21.3453,-10.2982 -29.0222,8.8002 -10.86,18.3496 10.86,0.7489 z",
	"Birmingham Hall Green": "m 3477.0476,5747.064 20.2219,32.9543 -11.8897,26.1199 -4.9619,-28.7413 -16.8516,2.6214 -13.4813,-18.5368 7.3023,-16.4771 z",
	"Solihull": "m 3484.9116,5807.2617 25.7455,-56.172 29.2095,13.8558 -10.2982,47.3717 z",
	"Birmingham Yardley": "m 3538.937,5763.7809 -26.1346,-41.1118 -35.8801,24.229 20.1246,32.8348 13.6371,-28.4657 z",
	"Mid Worcestershire": "m 3334.3289,5832.4276 19.595,74.1433 -27.0093,22.7726 85.2648,104.3302 118.0996,34.9532 -56.137,33.8941 37.0716,67.7881 -222.165,-149.0809 27.8037,-46.0748 -38.1308,-17.7414 -22.243,42.1028 -0.5296,-130.0155 18.0062,-31.2461 36.0125,41.838 z",
	"Redditch": "m 3353.6591,5905.5117 116.2461,-23.8317 -30.7165,41.3083 -9.5327,115.7165 -17.7414,-5.5607 -85,-103.8006 z",
	"Dudley South": "m 3362.1326,5721.2127 -54.2834,21.7134 -12.1807,-36.2772 23.0374,-4.7664 z",
	"Halesowen and Rowley Regis": "m 3362.6622,5720.6831 -13.2398,43.9564 41.0436,10.8567 3.4423,-28.3333 -15.8878,-27.2742 z",
	"Stourbridge": "m 3349.4224,5764.6395 -27.539,17.609 -13.9018,-39.19 54.5482,-21.9782 z",
	"Bromsgrove": "m 3484.9986,5807.5367 -14.8286,74.408 -116.7757,23.3022 -31.7757,-122.866 27.8038,-17.7414 41.5732,11.1215 13.5046,17.7414 -23.3021,7.6791 19.8598,23.0374 z",
	"Meriden": "m 3479.6689,5834.8796 140.8045,-9.362 2.6214,-75.2705 -44.5631,20.9709 -34.4523,-76.394 -30.3328,9.5493 20.7836,9.7365 -3.932,36.1373 8.9875,14.9792 -10.2982,47.1845 -44.0014,-5.43 0,0 z",
	"Lichfield": "m 3590.0167,5475.3821 -64.1361,99.0043 -98.0782,-7.021 21.7134,-69.3769 -18.5358,-28.3333 -6.7341,-102.1267 z",
	"Tamworth": "m 3482.8803,5618.2065 110.9501,18.0063 36.0124,-96.9159 -63.5513,-27.0093 -39.5068,61.4595 -69.8546,-3.9985 15.0935,66.729 z",
	"North Warwickshire": "m 3629.9717,5540.1294 44.0524,116.8722 -80.1388,37.8225 105.9779,26.588 -2.2469,30.7074 -74.896,-2.6213 -44.1886,21.3453 -65.9085,-147.5451 80.8877,12.7323 z",
	"Nuneaton": "m 3674.3288,5657.1317 48.4579,24.3614 -22.5078,39.9844 -106.4485,-27.0093 z",
	"Coventry North West": "m 3621.8989,5800.1223 55.0779,-10.0623 2.1183,-38.1308 -56.4018,-2.3832 z",
	"Coventry South": "m 3621.3693,5800.1223 0,24.891 47.3987,11.6511 47.6636,-26.7445 -39.7196,-20.1247 z",
	"Coventry North East": "m 3697.8036,5752.1195 23.0305,21.5326 -3.5576,36.1373 -40.2566,-19.8474 2.2469,-38.3842 z",
	"Kenilworth and Southam": "m 3479.9675,5835.0756 72.1412,62.091 116.5481,-12.2975 14.7269,63.9942 -44.5378,23.907 -37.6012,31.2461 91.0903,66.1993 51.3707,10.8567 93.2087,-203.0996 -216.6043,-52.9595 z",
	"Warwick and Leamington": "m 3552.522,5897.0382 115.9812,-12.1807 14.8287,64.081 -44.486,23.3022 z",
	"Rugby": "m 3722.5219,5680.4339 119.1589,121.8068 16.5875,39.0051 -71.9002,24.3412 -117.9612,-29.2095 48.3079,-26.9625 3.7448,-36.6991 -23.5922,-21.7198 2.6213,-29.9584 z",
	"West Bromwich East": "m 3448.3242,5671.4308 -26.8769,32.3053 -26.7446,3.5748 -7.6791,-15.2259 8.7383,-40.2492 z",
	"Stratford-on-Avon": "m 3479.6712,5834.7841 -9.4032,48.0057 -31.1789,41.077 -8.9083,114.3229 99.4757,30.684 50.7277,69.2866 31.179,0 -20.786,39.8398 31.9213,23.2605 44.7889,-32.1688 24.4977,-99.2283 -90.0725,-66.5646 37.1178,-31.1789 z",
	"Hereford and South Herefordshire": "m 3149.752,6208.2362 -54.4868,0 -54.4869,0 -8.2386,-54.6741 -8.2386,-54.674 -236.4841,-44.0014 21.907,123.0167 52.8018,72.2746 53.8013,-23.7014 110.4679,111.8749 131.9445,-78.8115 z",
	"North Shropshire": "m 3010.6141,5281.9138 187.0794,-12.4455 -41.3084,110.6854 41.838,-17.4767 -45.0156,87.3832 -297.1027,35.7476 -75.4672,-126.8379 95.327,-70.1714 95.0623,70.4362 z",
	"Shrewsbury and Atcham": "m 2829.6251,5558.0975 166.8223,127.6324 133.9875,-88.4424 -106.5082,-131.6453 -167.9543,20.222 z",
	"Ludlow": "m 2876.759,5847.2563 -160.4672,-99.0343 125.2492,-38.3956 15.0934,-65.9345 -75.4672,45.2803 48.4579,-131.0747 167.0871,127.6324 133.7227,-88.972 99.0343,7.4144 14.299,153.0529 -176.8846,129.7507 -134.5171,-83.1464 z",
	"North Herefordshire": "m 3067.1483,5887.5055 -9.2679,63.5514 133.4579,5.8255 28.2543,192.186 -81.824,-2.2469 11.2344,61.0403 -108.5992,-0.3745 -16.4771,-108.9737 -236.297,-44.3759 88.5997,-207.1462 55.6075,-43.162 z"
},
"East of England": {
	"South Basildon and East Thurrock": "m 4826.7271,6580.7451 -52.9595,4.7663 -10.0623,39.1901 -21.7134,6.3551 2.1184,-14.2991 -19.0654,-3.1775 0,0 11.6511,-23.8318 -28.0685,3.7072 -19.1978,-58.6526 98.1074,-6.4876 9.0031,-22.7726 38.1308,3.1776 -14.8286,16.4174 1.5888,34.4237 -16.4175,1.0592 z",
	"Thurrock": "m 4741.6026,6630.9788 -32.1411,0.4199 -11.9833,-16.4771 -20.222,12.7323 -40.8183,-26.9625 8.9875,-5.2428 -0.3744,-8.2385 7.864,-0.3745 3.3704,-20.2219 9.7364,11.6089 0.749,-14.9792 29.9584,-8.2386 11.6089,38.9459 28.4605,-4.1193 -11.9834,23.5923 19.473,3.7448 z",
	"Castle Point": "m 4834.9358,6508.7202 35.7477,15.8878 -5.0312,29.3926 -30.7165,-2.3832 42.3676,13.5046 -46.3395,15.0935 -15.8879,-10.8567 -10.3271,-9.0031 17.2119,-1.0592 -2.3832,-34.6885 z",
	"Southend West": "m 4872.2723,6516.6641 -6.3552,37.6013 19.3302,-3.1776 18.5359,2.648 1.5888,-8.2088 9.5327,-5.8255 -3.972,-15.3583 z",
	"Rochford and Southend East": "m 4878.352,6517.9313 -5.6172,-14.2303 36.3246,5.6172 8.2386,-16.1026 3.3703,20.5964 43.8142,-7.1151 12.3578,-12.3579 21.3454,3.3703 1.4979,-19.8474 50.5548,-5.2427 -93.9945,94.369 -52.9889,-12.9196 2.2469,-8.613 9.5492,-5.8045 -4.4938,-15.7281 z",
	"Rayleigh and Wickford": "m 4796.5402,6505.2778 -1.0592,-29.1277 7.9439,-1.8536 2.9128,7.6792 25.6854,0.2648 15.0934,-12.9751 95.5919,-10.3271 12.4455,13.5047 44.2211,5.0311 -1.8536,20.6542 -20.9189,-3.972 -12.7103,12.4455 -43.162,6.8848 -3.972,-21.1838 -7.6791,16.4174 -36.8068,-5.5607 6.6199,15.0934 -7.4143,-1.8536 -1.0592,7.6791 -36.8068,-16.1526 z",
	"Basildon and Billericay": "m 4730.0579,6531.8137 -1.4979,-60.318 12.7323,-16.4771 22.0944,5.2427 1.4979,17.6006 29.9584,0.3745 1.8724,28.086 -8.9875,21.7198 z",
	"Brentwood and Ongar": "m 4729.3959,6531.2841 -50.6417,3.4988 -11.9834,-30.7074 -9.362,-1.1234 5.6172,-7.8641 -24.3412,-19.473 -51.3038,10.111 -16.8516,-25.4647 14.6047,-6.7406 -10.4854,-20.2219 8.9875,1.1234 8.2386,-38.197 16.4771,-13.4812 -5.1518,-23.0251 74.2567,-29.5839 0.5484,20.7782 26.2136,2.2468 2.9958,35.5756 -9.362,7.4896 16.1027,26.2137 8.2385,-10.111 23.9668,25.4646 -5.9917,17.2261 -11.9834,16.4771 z",
	"Maldon": "m 4988.3859,6473.7669 34.4237,-3.5747 16.4174,-8.6059 -0.662,-97.4455 -30.7165,-2.648 -25.4205,29.1278 -27.5389,-2.1184 -24.3614,29.1277 0.5296,-0.5296 7.9439,-20.1246 -21.1838,-8.4735 -12.7102,-24.891 -35.4829,2.648 8.4735,28.0685 0,0 19.595,4.7664 -36.542,8.4735 -13.2399,-10.0623 5.296,-11.6511 -12.7103,-4.7664 2.1184,-25.4205 -40.2492,14.2991 0,52.4298 -11.1215,-3.7071 -18.0063,9.5327 -16.4174,-21.1838 -19.0654,-4.7664 -12.7103,12.1807 21.1838,22.7726 -5.2959,16.4174 21.7133,6.3552 0,0 1.5888,17.4766 30.9813,0.1324 8.4735,-3.972 2.9128,8.2088 25.2882,0 15.3582,-12.5779 95.1392,-10.3147 13.4813,13.294 z",
	"Chelmsford": "m 4757.3502,6406.7732 3.972,-29.6573 -7.944,-10.3271 7.4144,-8.4735 20.919,5.0311 0,-11.9159 13.5046,-7.6791 11.9159,24.3614 -5.0311,2.6479 0,51.3707 -10.8567,-3.9719 -17.7415,9.2679 z",
	"Epping Forest": "m 4586.6321,6485.726 -31.4564,17.2261 -27.337,-19.8475 0,-11.6089 -21.7199,-5.9916 -1.1234,-68.1554 20.5964,7.1151 16.1026,-26.9626 -12.7323,-8.2385 19.0985,-8.6131 10.8599,25.0902 16.4772,-7.1151 11.6088,13.1068 21.3454,-8.6131 -16.4771,13.1068 -8.2386,37.4481 -9.362,-0.749 11.2344,21.3454 -14.6047,5.6172 z",
	"Harlow": "m 4504.6209,6395.8508 -0.3745,-17.6006 23.9668,-28.4605 65.534,-21.7198 8.9875,-20.9709 0,0 14.9792,0 7.1151,26.9626 0,0 7.4896,-9.3621 13.4813,9.7365 -2.2469,8.9876 -40.4438,16.4771 5.2427,22.8433 -22.0943,8.613 -11.2344,-12.7323 -16.1027,7.1151 -11.9833,-25.8391 -18.724,9.7365 13.8557,7.1151 -16.1026,27.337 z",
	"Broxbourne": "m 4518.5029,6359.9041 -6.3551,-15.3583 -13.7695,0.5296 -13.7694,13.2399 -4.7664,28.5981 -22.243,0.5296 -7.9439,11.1215 -25.4205,-3.7072 0,38.1308 28.5981,-6.3551 52.9595,7.9439 -2.1184,-56.6666 z",
	"Hertford and Stortford": "m 4457.7319,6387.0458 1.986,-44.0888 -11.1215,-2.648 -2.648,-20.1246 31.2461,-18.0062 5.296,11.6511 38.6604,-16.4174 18.0062,-36.5421 34.9533,12.7103 6.3551,-22.7726 29.1277,-12.7103 8.4736,27.0094 -14.8287,7.4143 0,34.9533 -10.0623,20.6542 -65.6697,21.7134 -7.944,10.0623 -8.4735,-15.8879 -12.7103,1.5888 -13.7694,12.7103 -5.8256,28.5981 z",
	"North East Hertfordshire": "m 4457.8109,6377.5012 -22.4688,8.2386 -5.6172,-32.5798 -13.1068,-18.724 12.7323,-5.2427 -22.0943,-12.3578 34.0777,-46.4356 -45.6969,-82.6142 -4.2367,13.7695 -13.7695,-4.2368 -16.947,-30.7164 30.7165,-25.4206 -6.3552,-28.5981 30.7165,-33.8941 23.3022,54.0187 57.1963,-41.3084 9.5327,13.7695 23.3021,-2.1184 20.1246,63.5514 15.8879,-4.2368 15.0934,88.7071 -6.3551,22.243 -35.2181,-12.9751 -18.0062,36.5421 -38.3956,16.947 -5.5607,-12.4455 -31.2461,19.0654 3.1775,20.1246 10.5919,2.9128 z",
	"South West Hertfordshire": "m 4183.6915,6329.5678 118.7102,166.6436 -64.7851,-10.1109 0.3745,27.337 -9.7365,0.749 -4.8682,-6.3662 -16.1027,-112.7185 -69.6533,-29.9584 -39.3204,-62.5382 10.111,-17.2261 z",
	"Witham": "m 4914.0213,6380.7779 92.7774,-38.4778 -29.9584,-116.0888 -68.1554,26.9626 -25.4646,-36.6991 -35.9501,29.2095 7.4896,46.4355 -52.4272,-35.2011 26.9625,102.6075 13.3199,-4.3885 -2.648,26.4797 12.9751,4.2368 -5.0312,11.6511 13.7695,10.0623 33.6292,-8.7383 -17.4766,-4.7664 -8.4735,-28.3333 35.4829,-2.1184 z",
	"Colchester": "m 4977.132,6225.387 33.3645,-30.7165 30.7165,29.6573 -13.2399,17.4766 11.1215,13.7695 -22.7725,-1.0592 -6.8848,16.4174 -26.6053,-21.1286 z",
	"Clacton": "m 5079.4478,6310.0948 109.3482,-89.8752 38.946,25.4647 -88.3773,84.6325 -50.9293,7.4896 z",
	"Harwich and North Essex": "m 5079.4478,6309.7203 -31.8308,-42.3162 22.0944,51.3038 -62.9127,23.2177 -24.3412,-92.4965 26.9626,21.3453 6.7406,-16.8516 22.8433,1.1235 -10.8599,-13.8558 12.7323,-16.8516 -30.3329,-29.5839 -33.4114,31.0292 -68.3178,27.2741 26.215,-89.6339 287.3051,14.299 -33.5384,42.309 z",
	"Braintree": "m 4801.5836,6255.608 -89.1262,-159.7158 172.2608,-36.699 50.3676,103.9182 -26.4009,90.2497 -25.8391,-37.2608 -35.5756,29.5839 7.3024,46.8101 z",
	"Saffron Walden": "m 4711.7084,6095.8922 -95.1179,-35.2011 -75.645,82.3856 8.0091,23.2605 15.8879,-3.972 15.623,88.4423 28.863,-12.7103 8.7383,26.7446 -15.0935,7.4143 0,33.8941 14.2991,1.0592 7.4143,26.7445 7.4143,-8.7383 13.5047,9.2679 -1.5888,8.7383 33.3645,-12.9751 0.7944,20.3894 25.6853,2.648 3.4424,35.2181 -9.5327,7.4143 16.4174,26.7445 23.567,-20.3894 18.8006,4.7664 4.5016,-30.1869 -7.6792,-10.3271 7.4144,-8.4735 20.3894,5.2959 0.5296,-11.9159 13.5046,-7.6791 12.1807,24.0966 21.4486,-7.9439 -27.2619,-104.1089 z",
	"South East Cambridgeshire": "m 4712.8883,6095.3626 74.4651,-160.4968 -84.6325,2.9958 -5.9917,-63.6616 41.1928,53.1762 41.1928,-47.1845 -64.4106,-130.3191 -223.1901,107.1013 116.0888,2.2469 -65.9085,57.6699 11.9834,23.2178 36.6991,-6.7406 10.4854,61.4147 47.1845,32.2053 -15.7282,38.9459 z",
	"West Suffolk": "m 4715.5122,5749.2812 173.7071,-22.2429 -26.4797,49.7819 193.8317,18.0062 -90.0312,85.7944 -64.6105,-57.1963 -46.6044,129.2211 49.7819,8.4736 -92.1494,41.3084 -5.8256,73.084 -94.2679,19.595 74.1147,-160.2408 -85.007,2.9958 -5.2427,-63.6616 40.8183,53.1762 41.5673,-47.1845 z",
	"Bury St Edmunds": "m 4906.438,5961.0794 136.3108,74.896 44.539,-105.3079 -24.6262,-29.9221 14.9138,-36.2819 18.1859,9.2725 -5.8256,-82.0872 -32.9672,2.9128 -90.6931,85.7944 -64.8754,-57.1963 -45.81,129.4859 z",
	"South Suffolk": "m 4905.6367,5960.8544 -92.9438,41.5732 -5.8256,72.8192 77.0561,-16.1526 51.3707,104.3302 168.9407,7.6791 110.6853,-10.5919 -172.6479,-124.4548 z",
	"Ipswich": "m 5112.9638,6087.2792 45.4993,-36.6991 25.4647,52.4272 -52.0527,-2.2468 z",
	"Suffolk Coastal": "m 5149.4756,6102.2584 96.2414,71.5257 130.3191,-134.8129 67.4064,-290.5965 -50.9293,-21.7198 -150.541,93.62 58.4189,143.0514 -116.7171,139.7243 z",
	"Central Suffolk and North Ipswich": "m 5089.4061,5791.6488 74.6729,13.2399 77.8505,-48.7227 34.1588,42.6324 -34.1588,21.1837 58.5202,143.5202 -116.2461,138.4891 -26.2149,-51.3707 -44.2212,36.542 -71.2305,-51.6355 44.486,-104.5949 -24.3614,-30.7165 14.5639,-36.0125 18.5358,9.7975 z",
	"Waveney": "m 5275.8627,5798.7423 -43.627,-55.2358 183.2798,-64.2061 c -2.9958,-5.2428 -32.7388,-40.2739 -32.7388,-40.2739 l 31.4563,-23.2177 34.4522,24.7156 -5.2427,107.8503 -51.491,-21.9071 z",
	"South Norfolk": "m 5057.3657,5794.8264 69.1121,-197.0093 -42.3676,-55.6074 82.6168,-10.0623 -16.4175,30.1869 40.7788,23.8317 29.1278,-27.5389 162.5606,80.3994 33.1133,40.2284 -183.8415,64.2516 9.7365,12.545 -77.3302,48.6825 -75.0832,-13.1069 z",
	"Norwich South": "m 5166.727,5531.8826 53.4891,27.0093 -29.3925,27.0093 -40.7788,-24.0965 z",
	"Great Yarmouth": "m 5383.1307,5638.3632 17.1476,-86.8856 c 0,0 -52.7027,-9.0669 -53.0772,-10.5649 -0.3745,-1.4979 -16.4771,-52.4272 -16.4771,-52.4272 l 65.9085,-41.5673 52.24,193.419 -34.8267,-24.5285 z",
	"North Norfolk": "m 5396.3063,5446.6178 -215.8098,-162.3208 -276.9781,-18.5358 5.8255,53.489 56.1371,-26.4797 29.1277,55.6075 35.4828,-28.5982 25.4206,60.9034 144.0498,19.0655 68.8473,99.0342 62.502,-10.2974 z",
	"Norwich North": "m 5166.727,5531.7502 25.9501,-23.9642 38.6605,6.3551 12.1806,55.6075 z",
	"Broadland": "m 5382.7767,5638.652 17.2261,-86.8793 -53.3634,-10.86 -15.7282,-52.4272 -62.5381,10.111 -68.9044,-98.8628 -144.1748,-19.4729 -25.732,-61.0106 -35.4828,29.1278 -28.8629,-55.8723 -56.1371,26.7445 -38.2167,108.944 52.8017,15.7282 19.0985,-40.4439 151.29,82.0112 -10.472,56.3228 82.8816,-9.9299 26.0825,-24.229 38.6605,6.6199 12.1806,55.2103 z",
	"North West Norfolk": "m 4903.4422,5265.2954 -154.6603,23.9667 -64.4105,146.0473 -58.7934,-11.6089 -47.559,72.6491 302.2054,-5.2427 -8.9875,-62.9127 37.8225,-109.3482 z",
	"Mid Norfolk": "m 4879.4755,5490.7324 33.3287,134.4384 174.1333,85.9431 39.1331,-113.6547 -42.7548,-56.0439 10.3271,-55.8723 -151.0675,-82.2517 -19.0985,40.8183 -52.6145,-15.7281 z",
	"South West Norfolk": "m 4577.2701,5495.9751 49.0568,201.4703 66.283,-4.4938 22.9023,56.5944 173.7071,-22.7725 -25.9501,49.7819 193.5669,18.0062 29.6573,-83.4112 -173.7071,-86.0591 -33.6293,-133.9875 z",
	"North East Cambridgeshire": "m 4470.5432,5550.6492 14.6048,65.9085 -99.2373,25.4647 45.6866,71.9001 34.8267,-25.8391 64.036,150.9155 184.6187,-89.688 -22.6039,-56.4315 -66.1993,5.0311 -49.5171,-201.5108 -75.4673,52.4299 z",
	"Peterborough": "m 4349.0244,5557.0154 -21.9071,99.9861 157.7564,-40.3838 -14.5639,-66.4641 z",
	"North West Cambridgeshire": "m 4289.9828,5559.4215 -73.2165,17.7414 10.9891,64.081 35.7476,-11.1215 32.907,136.2273 -55.6795,83.8193 99.8286,30.4518 20.1246,-88.972 131.6043,65.1402 37.6012,-18.5358 -63.8161,-150.6698 -34.1589,25.9502 -46.6044,-71.7601 -58.785,14.8286 21.9782,-100.0934 z",
	"South Cambridgeshire": "m 4492.288,5856.5242 -60.109,60.9034 -31.2461,-19.3302 24.6262,44.7507 -34.1589,24.0966 50.8411,-1.8536 1.0592,21.4486 -72.8193,38.1308 53.7539,3.0452 -8.4736,50.5763 23.0374,53.8863 57.4611,-40.9112 9.5327,13.9018 23.5669,-1.9859 12.0483,38.9252 75.2025,-81.4252 15.4906,5.6931 15.6231,-39.5872 -46.7368,-32.3053 -22.4503,-16.8892 -21.3975,31.5805 2.4438,-32.6807 -21.0466,-17.0133 15.0519,-19.8103 -11.7835,-22.905 65.7978,-57.5448 z",
	"Cambridge": "m 4553.8651,5939.734 -15.3537,19.6602 21.3453,16.8516 c 0,0 -3.3703,33.3288 -2.6213,32.767 0.7489,-0.5617 21.5326,-31.6435 21.5326,-31.6435 l 22.2815,17.6005 -11.0471,-61.7892 z",
	"Huntingdon": "m 4240.7305,5849.9043 70.9657,97.4454 45.4127,17.4766 12.0483,59.8442 73.8617,-38.3137 -1.3106,-21.5326 -51.1166,2.4341 34.6394,-24.5284 -25.4646,-46.4356 32.018,20.9709 59.5424,-60.4785 -130.6936,-64.9723 -20.0347,88.939 z",
	"North East Bedfordshire": "m 4360.5513,6166.2048 -7.0331,-96.5262 -56.921,-3.1831 -11.2344,25.0902 -29.0222,-36.8863 24.7157,-36.699 -35.9501,-17.9751 -23.9667,49.4314 -90.6242,-69.6533 11.2344,-65.1595 26.9626,-8.2386 23.2177,24.7157 21.7199,-59.1679 42.5035,-0.5617 55.2358,75.4577 46.061,18.3496 11.7962,59.1678 54.6741,3.1831 -8.4258,51.1165 -30.5202,34.0777 5.9917,28.086 z",
	"Mid Bedfordshire": "m 4154.6713,5998.9852 20.919,61.6978 -41.7296,49.8099 10.3231,74.9001 93.0583,53.1761 35.9501,-17.975 8.9876,15.7281 12.3578,-9.7364 -8.9875,-47.1845 10.8599,-5.2427 3.3703,28.4604 14.6047,-24.7156 -10.8599,-10.4855 31.4563,1.8724 23.5839,-29.4329 -5.5607,-70.1713 -56.1371,-3.4424 -11.1215,24.891 -29.5926,-36.997 24.7157,-35.9501 -35.9019,-17.8784 -24.0965,48.9875 z",
	"Bedford": "m 4221.1395,6049.4567 14.2302,31.2691 8.9876,-33.3288 11.6088,7.3024 24.903,-36.8863 -35.7629,-17.6005 z",
	"Hertsmere": "m 4301.9365,6495.2644 2.7996,-62.991 65.4407,-41.994 54.2423,27.996 -0.35,14.6979 -16.4476,16.7976 -4.5494,-2.4496 -32.1954,24.1465 -29.3958,5.9492 -2.7996,-3.1496 z",
	"St Albans": "m 4255.3932,6426.3243 21.6969,-40.2443 36.0448,5.2493 12.9482,-41.2942 35.3449,10.8485 9.0987,29.7458 -65.4406,41.644 -19.9472,-21.6969 z",
	"Watford": "m 4253.9934,6427.7241 31.1455,-17.1476 19.5972,22.0469 -2.7996,62.2911 z",
	"Welwyn Hatfield": "m 4360.7281,6359.4838 -3.1495,-68.2403 52.4925,-15.3978 8.3988,25.8963 -11.1984,15.0479 21.6969,12.5982 -12.2482,5.9491 12.5982,17.1476 5.5992,33.5952 22.3968,-8.0488 0.6999,9.4486 -8.7488,11.1984 -25.1964,-4.1994 0,23.0967 -53.8923,-27.646 z",
	"Hitchin and Harpenden": "m 4278.1399,6386.08 1.0499,-92.3868 23.7966,13.648 6.2991,-11.8982 -23.7966,-115.4836 10.4985,-5.5992 3.1495,28.346 14.6979,-24.4965 -9.7986,-10.8485 30.0957,2.0997 24.1466,-29.3958 2.4496,26.2462 17.1476,31.4956 12.9481,3.8494 4.8994,-13.648 13.998,25.5463 -28.696,1.3998 -23.4466,76.2891 2.7996,68.5903 -34.2951,-10.1486 -12.9482,41.2941 z",
	"Stevenage": "m 4410.0711,6275.4958 -52.8425,15.7477 24.1466,-76.2891 28.346,-1.0498 31.4955,56.6919 -23.0967,31.1455 z",
	"Hemel Hempstead": "m 4210.5996,6308.0411 9.7986,20.6471 25.8963,-43.0439 32.8953,8.0489 -1.7498,92.0369 -23.0967,42.6939 -70.6899,-99.0359 z",
	"South West Bedfordshire": "m 4236.4959,6238.751 9.7986,46.8933 -26.2463,43.7438 -9.4486,-20.997 -92.0369,-65.0907 25.1964,-58.0917 z",
	"Luton North": "m 4281.9894,6236.3014 -2.7996,11.1984 -38.4945,9.4486 -4.1994,-18.1974 36.3948,-17.8474 z",
	"Luton South": "m 4240.3453,6256.9484 6.1241,28.6959 32.8953,8.3988 23.6217,13.1232 6.1241,-11.8983 -14.5229,-69.2902 -12.2483,10.1486 -3.1495,11.3734 z"
},
"South East England": {
	"Isle of Wight": "m 3640.4347,7359.2495 156.7601,-96.3863 135.5763,73.0841 -51.9003,30.7165 -9.5327,47.6635 -69.9066,24.3614 -112.2741,-81.5576 z",
	"New Forest West": "m 3487.533,7184.8803 22.4688,-60.6658 -34.4522,7.8641 -45.6865,-56.172 45.3121,-25.0902 108.9737,51.6783 6.3661,77.1429 22.4688,6.3661 -31.4563,62.9127 80.1387,11.6089 11.2344,34.0777 -28.8349,18.724 -65.534,-16.8516 6.7406,-17.6006 -35.5756,5.9917 -4.1193,-29.9584 -22.0943,13.4813 0,-62.9127 -11.9834,-25.0902 z",
	"New Forest East": "m 3584.1489,7102.8692 77.8918,-17.9751 65.534,65.534 70.0278,71.9002 -56.172,42.3163 -72.2747,17.226 -8.2385,-22.0943 -79.7643,-11.2344 31.0819,-63.2871 -21.7199,-6.3662 z",
	"Southampton Test": "m 3698.3653,7122.7166 23.2178,-19.473 4.1192,18.3496 25.4647,-5.6172 -1.1235,28.4605 -13.4812,-11.6089 -7.8641,17.975 z",
	"Southampton Itchen": "m 3728.6981,7150.8026 34.0778,14.6047 24.3412,-19.4729 -19.473,-33.7032 -16.8516,3.7448 0,28.4605 -14.2302,-11.9834 z",
	"Eastleigh": "m 3762.0269,7164.6584 25.8391,27.337 7.1151,-23.9667 26.2137,-21.7198 c 0,0 -19.8475,-42.3163 -18.3496,-43.8142 1.4979,-1.4979 19.0985,-26.2136 19.0985,-26.2136 l -55.7975,-17.2261 -18.724,23.5922 39.6949,62.5382 z",
	"Romsey and Southampton North": "m 3747.9425,7081.7418 -2.648,-34.4237 -33.8941,-27.0093 21.7134,-46.0748 -12.1807,-19.595 69.377,-68.3177 -64.6106,-28.5981 -58.2554,73.0841 -82.6168,-18.5358 8.2087,33.894 21.4486,5.8256 -3.1776,77.3208 15.6231,21.1838 -5.8256,44.2212 40.514,-10.3271 37.3365,37.3364 22.5077,-19.595 3.972,18.8006 40.2492,-9.2679 z",
	"Fareham": "m 3787.9269,7192.4271 42.6324,28.0685 22.2429,-26.2149 47.3988,10.5919 4.2367,-21.9782 -13.5046,-1.324 -16.6823,-27.5389 -34.6884,27.2741 -18.271,-34.6884 -26.215,21.1837 z",
	"Gosport": "m 3830.0297,7220.4956 59.5794,41.0436 17.7414,-17.4766 -24.6261,-43.162 -30.187,-6.8847 z",
	"Portsmouth North": "m 3904.7025,7182.6296 52.1651,3.7072 -1.5888,27.0093 -9.2679,-5.2959 -0.2648,26.2149 -14.0342,-2.9128 -5.296,-8.7383 -16.6822,2.648 5.0311,-16.6823 -14.8286,-3.7071 z",
	"Portsmouth South": "m 3909.4689,7225.262 -7.6791,9.2679 15.8878,21.9782 38.6604,-10.8567 -10.8567,-11.3863 -13.7694,-3.4424 -5.5608,-8.7383 z",
	"Winchester": "m 3804.6091,7070.6203 3.972,-50.3115 16.1526,-5.0312 7.4144,13.2399 31.2461,-46.0747 18.5358,4.7663 0.2648,-12.9751 24.8909,-1.3239 15.8879,-11.6511 -8.2087,-4.2368 -3.1776,-25.4205 -19.0654,-2.648 -26.7446,10.0623 -20.1246,-21.4486 0.2648,0 16.4175,-6.3551 -4.2368,-18.8007 -67.2585,-6.6199 -70.1713,68.3177 12.1806,19.8598 -21.1838,46.3396 34.1589,27.0093 2.3832,33.6293 17.7414,-22.5078 z",
	"Meon Valley": "m 4001.3536,7168.8601 -33.8941,-21.4486 -29.3925,37.3365 -47.1339,-3.7072 -17.2118,-27.0093 -34.1589,26.7445 -37.866,-78.1152 20.3894,-26.4798 -17.7415,-6.3551 4.1181,-48.5934 16.1027,-5.9917 7.8641,13.4813 30.4354,-47.0737 19.0654,5.8255 0,-13.7695 24.8909,-1.0591 14.8287,41.8379 15.3582,0 -7.4143,61.433 16.947,23.3022 31.2461,-9.0031 27.0094,16.4174 6.3551,19.0655 -18.0062,27.5389 z",
	"Havant": "m 3956.6028,7186.6016 -1.8535,25.9501 13.7694,-16.947 9.7975,10.5919 -6.3551,32.57 -15.3583,6.3552 46.6044,11.3863 3.7072,-14.0343 -15.3583,-1.5888 5.8255,-31.7757 -9.2679,-10.8567 20.3894,-2.9127 -5.8255,-25.4206 -35.2181,-22.5078 -29.1277,36.2773 z",
	"Chichester": "m 4006.9369,7196.1147 -5.9917,22.4688 21.7199,19.473 -4.4938,-38.946 10.4854,2.2469 10.4855,24.7157 -20.2219,25.4647 74.147,51.6782 17.2261,-31.4563 -15.7282,-8.9875 25.4647,-38.946 29.2094,-6.7406 -3.7448,-43.4397 23.2178,-2.9958 -7.4896,-52.4273 -25.4647,-13.4812 3.7448,-33.7032 20.222,14.9792 -9.7365,-29.9584 23.2177,-26.9626 11.9834,-23.9667 51.6783,12.7323 23.9667,-13.4813 -11.2344,-38.197 -150.541,12.7324 -17.2261,19.4729 -23.9667,-8.2385 -30.7074,49.4313 -23.2178,67.4064 8.2386,17.2261 -19.473,27.7116 8.9876,16.4771 z",
	"Bognor Regis and Littlehampton": "m 4099.8079,7253.7846 17.2261,7.4897 122.0805,-33.7033 4.4938,-17.975 -61.4147,-8.9875 -20.222,23.2177 -11.9833,-8.2385 -30.7074,8.2385 z",
	"Worthing West": "m 4239.1417,7228.1748 91.6199,-9.268 -2.9128,-9.5327 -13.2399,1.324 -19.0654,-37.3364 -2.3832,18.5358 -20.9189,2.1184 1.0591,23.3022 -29.6573,-7.4144 z",
	"East Worthing and Shoreham": "m 4298.9859,7179.452 25.1557,-8.7383 0.2648,-11.6511 15.3583,14.0343 46.8691,-2.648 3.972,-8.7383 20.1246,40.2492 -38.3956,0.7944 -41.3084,16.1526 -4.2368,-10.0623 -12.7103,2.1184 z",
	"Hove": "m 4394.0482,7166.7418 8.4735,-12.1807 23.3021,7.9439 23.3022,32.8349 -4.5015,10.3271 -33.6293,-4.2368 z",
	"Brighton Pavilion": "m 4445.9485,7203.2838 11.1214,5.2959 1.8536,-10.5919 14.5639,-4.7663 -10.5919,-6.6199 23.3022,-22.7726 -9.268,-10.5919 -28.5981,-3.972 -13.2398,4.7664 -2.648,-11.9159 -7.4143,19.8598 24.3613,33.3645 z",
	"Arundel and South Downs": "m 4456.0108,7149.6623 6.3551,-50.9735 -23.8318,-12.1807 -0.5296,-23.8317 -29.1277,31.7757 12.7103,22.7725 -19.595,12.1807 -9.5327,-95.8566 -51.9003,14.299 -4.2368,24.3614 -21.1838,29.6573 -22.243,-59.3146 -11.651,14.8286 -42.3676,-4.2367 23.3021,-22.243 -1.5887,-27.5389 -24.3614,14.8286 -50.8411,-13.7695 -12.1807,23.8318 -23.3022,27.0093 10.5919,31.7757 -21.7133,-15.3582 -4.2368,32.8349 27.0093,15.3582 7.4144,50.3115 -23.3022,2.648 3.7072,42.3676 13.2398,8.4735 19.595,-23.3022 62.4922,9.5327 28.5981,7.4144 -0.5296,-24.3614 20.6542,-1.5888 2.1184,-19.595 4.7664,6.3551 23.8317,-6.8847 1.0592,-12.1807 14.8287,12.7103 46.6043,-1.5888 4.2368,-9.0031 3.1776,4.7664 10.0623,-11.1215 20.6542,6.8847 7.4143,-18.0062 3.1776,9.5327 13.2398,-4.7664 z",
	"Brighton Kemptown": "m 4486.4625,7164.3586 67.5233,74.9376 -74.1433,-26.4797 -23.0374,-3.7072 2.648,-10.3271 14.2991,-5.5607 -10.5919,-7.1495 z",
	"Mid Sussex": "m 4391.4002,7031.4303 -0.5296,-15.3583 28.0685,-3.1775 0.5296,-20.6542 12.1807,2.1183 9.5327,20.6542 23.3022,-0.5296 3.1775,11.1215 27.539,-16.947 -19.595,-45.0156 19.0654,-37.0716 46.0747,-7.4143 12.1807,28.0685 -46.0747,14.8287 27.0093,31.7756 -17.4766,68.8474 -22.7726,0.5296 -3.1776,-9.5327 -28.5981,15.8878 11.1215,29.6573 -12.1807,-1.5888 -21.7134,-12.7102 -1.5888,-22.7726 -28.0685,32.3053 11.6511,21.7133 -19.595,12.7103 z",
	"Horsham": "m 4249.9745,6966.9329 143.0514,-48.6824 20.5964,4.1193 -16.8516,38.5714 21.3453,10.8599 33.3287,-27.7115 -2.6213,-25.0902 45.3121,1.498 -0.3745,5.9916 -19.0985,37.4481 20.5964,44.5631 -27.7115,16.8516 -3.3703,-10.4855 -22.8433,-0.3744 -10.4855,-19.8475 -12.3578,-4.1193 0.749,21.7199 -28.4605,4.1193 1.1234,16.4771 -50.9293,16.1026 -5.9917,23.5923 -19.4729,28.4605 -23.2178,-58.0445 -12.3578,14.2303 -41.9418,-3.3703 23.9667,-23.5923 -1.8724,-27.337 z",
	"Crawley": "m 4394.0482,6918.8914 30.9813,-22.7726 6.8847,8.4735 20.1246,-0.7944 -2.9128,15.0935 2.1184,24.8909 -32.3053,27.2742 -22.243,-9.7975 16.9471,-38.3957 z",
	"South West Surrey": "m 4101.6804,6974.048 9.362,-19.0985 -35.2012,-37.448 -16.8516,8.2386 2.6214,-34.0777 -12.7323,-25.4647 20.9708,-28.8349 40.8184,13.8557 2.6213,26.2137 15.3537,-5.6173 12.7323,14.9793 14.2303,-14.6048 7.8641,25.4647 16.8516,-33.3288 15.3537,10.4855 4.1192,9.7365 12.7323,-13.4813 20.222,44.5631 -14.6047,52.8017 -118.8038,10.2046 z",
	"East Hampshire": "m 3890.9331,6929.2185 36.0124,-43.4268 55.6075,2.648 66.7289,-22.243 13.2399,27.0093 -3.7072,32.3053 16.4175,-8.4735 36.0124,38.1308 -12.1807,23.3022 -18.0062,19.595 -24.3613,-7.4143 -29.1278,48.7227 -23.8317,67.2585 -25.9502,-16.4174 -31.2461,9.5327 -18.0062,-25.4205 7.9439,-58.7851 -15.3582,-1.5888 -13.7695,-41.8379 15.8879,-11.1215 -7.944,-2.1184 -3.1775,-26.4798 -21.7134,-1.5887 z",
	"North West Hampshire": "m 3683.3319,6763.4553 40.7788,-6.3551 -9.5327,-15.8879 18.5358,-14.8286 161.5264,12.1806 -30.1869,54.0187 30.1869,18.5358 -15.3582,11.1215 11.6511,50.3115 -11.1215,17.4767 -9.0031,-8.4736 -12.7103,13.2399 -68.3177,-7.4143 -63.5514,-29.6573 -59.3146,73.6137 -83.1464,-17.4767 -7.4143,-38.1308 45.5451,-41.838 43.9564,8.4735 5.2959,-88.4423 z",
	"Newbury": "m 3626.8396,6596.1976 23.9667,-34.8266 39.6949,11.2344 8.2386,14.9792 79.0153,-32.9543 60.2913,25.0902 46.4355,-9.362 0,28.4605 19.8474,17.6005 -12.3578,29.584 13.8558,-0.3745 -38.5715,44.9376 30.7074,30.3329 -2.6214,17.975 -162.1499,-12.7323 -19.0984,14.2302 9.7364,15.3537 -38.9459,7.8641 8.9875,-17.6006 -51.3037,-57.6699 28.4605,-23.5922 z",
	"Wantage": "m 3599.8753,6452.9898 105.6996,-32.1823 47.6635,20.1246 12.1807,-18.0063 36.0125,21.1838 -14.8287,21.1838 18.0062,19.0654 39.19,-2.6479 11.1215,-15.3583 43.4268,36.0125 -13.7695,67.2585 -47.6635,10.0623 -59.8442,-25.4205 -77.8504,33.3644 -10.5919,-15.3582 -38.1309,-12.1807 -23.8317,35.4828 -28.0043,-51.7717 -14.8929,8.345 -7.4143,-12.1807 17.1021,-52.3335 -21.93,-30.9359 c 4.8507,0.3147 24.6175,-3.0905 28.3494,-3.7071 z",
	"Witney": "m 3591.264,6178.2778 31.4563,23.2178 44.9376,-32.2053 19.473,20.2219 34.4522,-11.9833 78.828,58.9806 -4.681,51.8655 -25.4646,0 11.9833,65.9085 -26.2136,13.4813 -14.6047,67.4064 -35.9501,-14.9792 -105.6034,32.5797 -39.3204,-89.5007 56.172,-138.5576 -27.7115,-44.9376 z",
	"Oxford West and Abingdon": "m 3772.5124,6297.3625 53.9251,28.4605 -16.1027,63.2871 28.0861,56.172 -16.8517,18.724 -17.975,-2.9958 0,22.8433 -18.3495,-19.473 16.1026,-20.5964 -36.3245,-21.3453 -10.86,17.975 -12.7323,-4.8682 14.2303,-67.7809 25.8391,-13.8558 z",
	"Oxford East": "m 3818.9479,6355.7814 41.5673,16.8516 -8.6131,28.835 11.9834,1.4979 -10.4854,17.975 -28.0861,-3.7448 -14.9792,-28.8349 z",
	"Basingstoke": "m 3876.6178,6799.5403 c 47.9335,-0.749 47.9335,-1.1234 47.9335,-1.1234 l 13.1068,-12.7324 10.4854,10.111 26.9626,3.7448 -3.3703,40.0694 -49.8059,-10.111 -34.0777,30.3329 -8.2385,-38.197 14.9792,-10.8599 z",
	"North East Hampshire": "m 4070.224,6836.2393 8.2386,-52.4272 -22.0943,4.1193 -2.9959,-20.5964 16.8516,-4.1193 -11.2344,-24.7157 -51.3038,-7.4896 -72.2746,7.1152 -20.9709,-23.2178 -16.1026,5.9917 -3.3704,18.3495 -30.3328,52.8017 12.3578,7.8641 47.2781,-1.1235 13.4813,-12.9195 10.0173,10.6727 27.3371,3.7448 -3.7448,39.6948 -48.6824,-10.8599 -34.4522,29.9584 2.6214,14.9792 -10.8599,15.1665 -9.3621,-6.5534 -11.9833,12.7323 3.7448,16.4771 -16.1027,5.9917 19.0985,22.4688 26.4009,-11.2344 36.5118,-43.4397 54.2996,2.2469 66.283,-22.4688 z",
	"Aldershot": "m 4070.0368,6763.5902 4.3065,-14.4175 31.0819,28.086 11.6088,48.4952 -6.7406,26.5881 -40.0694,-15.1665 8.0513,-52.4272 -22.2815,2.6214 -3.1831,-20.5964 z",
	"Surrey Heath": "m 4110.7149,6852.692 23.567,-2.6479 -7.6791,-47.9284 11.1215,-31.2461 24.0965,4.7664 12.4455,-7.1495 -1.5888,-15.6231 27.2742,-1.5888 16.1526,-10.8567 -6.6199,-14.8286 -7.4144,3.7071 -26.2149,-29.1277 -5.5607,10.5919 -17.7415,-5.0311 -41.838,19.8598 -25.9501,33.0996 20.7584,18.3509 11.5469,48.6429 z",
	"Woking": "m 4133.8856,6844.4779 26.5881,-8.9875 6.7407,-31.0819 20.2219,-8.613 33.7032,19.8474 0,-34.4521 36.699,-14.9792 3.7448,-19.8475 -8.2385,-7.4896 -19.0985,8.6131 -18.724,-5.6172 -16.6644,9.3619 -26.7753,1.498 2.6214,14.9792 -12.7324,7.4896 -24.3412,-4.1193 -11.2344,30.7074 z",
	"Wokingham": "m 3906.2913,6645.0909 13.7695,10.5919 -11.6511,14.8286 7.1495,6.0904 22.5078,-13.5047 21.1838,3.1776 19.8598,22.2429 14.0343,-18.271 -1.0592,-15.3582 39.4548,6.0903 43.4268,25.1558 -20.6542,11.1215 -0.7944,12.7102 -15.0935,-7.9439 -3.4423,14.0343 -8.2087,-8.4736 -3.4424,11.3863 -6.0903,-7.9439 -9.5328,19.595 -72.2896,6.8848 -21.4486,-23.0374 -15.8879,6.6199 -30.9813,-30.7165 z",
	"Reading West": "m 3904.173,6617.0223 8.4735,5.296 18.271,-7.4143 10.3271,7.4143 -0.5296,7.9439 11.1215,8.2087 16.6822,-4.5015 2.3832,17.7414 6.0903,-0.5296 -1.8535,15.623 6.3551,-1.0591 3.972,14.299 -6.0904,8.2087 -20.3894,-21.9781 -20.6542,-2.9128 -23.3021,12.7103 -6.62,-5.0312 12.1807,-15.0934 -14.5639,-10.3271 -14.0342,0.5296 z",
	"Reading East": "m 3952.8957,6639.0005 c 0,-1.0592 29.3925,-26.7445 29.3925,-26.7445 l 12.7103,16.6822 -8.7383,15.0935 14.299,-5.8256 19.595,10.0623 15.0935,-10.3271 -9.0031,22.5078 -34.4237,-5.0311 1.0592,15.0934 -7.9439,9.5327 -3.972,-13.5046 -5.8255,0.7943 1.8535,-16.1526 -5.8255,0 -2.9128,-16.6822 z",
	"Bracknell": "m 4008.2476,6730.2615 8.9875,-19.2857 6.5534,8.8002 3.3703,-12.1706 8.0513,8.2386 3.3704,-14.043 14.7919,8.2386 1.3107,-12.9196 20.0347,-11.4217 13.294,1.498 -1.3107,-12.1706 19.473,-4.1193 14.2303,11.4216 -9.1748,42.3163 -26.4009,33.8904 -11.0471,-9.9237 -3.5576,14.4175 -11.2344,-24.7157 z",
	"Windsor": "m 4074.4377,6684.8105 -2.648,-31.2461 11.3863,-20.919 10.8567,10.0623 20.1246,2.1184 7.6791,-10.5919 12.9751,-0.2648 8.7383,9.2679 9.0031,-10.8567 -5.2959,-15.6231 20.919,-15.8878 37.866,9.5327 37.6012,-3.4424 -9.0031,24.891 -11.1215,-3.4424 -4.2367,15.8879 7.9439,18.5358 -27.0093,-14.5639 -19.595,19.8598 -5.296,32.5701 -5.5607,9.7975 -16.9471,-5.2959 -41.3084,19.8598 8.7383,-42.8972 -14.8286,-11.3863 -18.5358,4.5016 0.7944,11.9158 z",
	"Maidenhead": "m 4000.5592,6637.4117 32.0405,-34.6884 0,0 -17.2118,-27.8038 0,-0.2647 9.0031,-23.8318 0.2648,-0.2648 21.9782,16.947 29.6573,-7.4143 9.2679,-14.0343 9.0031,1.5888 21.4486,-12.4455 6.8847,15.8879 6.3552,-5.296 -3.1776,51.6355 20.919,18.271 5.2959,17.2119 -9.2679,10.3271 -8.7383,-9.7975 -12.7103,0 -7.6791,11.1215 -20.3894,-1.8536 -11.3863,-10.3271 -10.5919,21.1838 3.1776,31.5109 -47.6635,-25.4206 8.2087,-22.7726 -15.3583,10.8567 z",
	"Guildford": "m 4110.4501,6852.692 23.8318,-2.9127 -0.5296,-5.5608 27.0093,-9.2679 6.3552,-30.9813 0,0.2648 20.3894,-8.4735 33.8941,19.8598 9.2679,3.4424 -2.1184,11.3862 0,0 10.3271,-2.3831 0.5296,13.2398 -17.2119,16.4175 18.0063,9.7975 1.8535,19.0654 0,0 27.8038,6.8847 6.6199,-8.2087 16.6822,12.7103 0,54.0187 -42.8971,13.7694 -32.0405,2.3832 0,0 14.299,-52.4299 -20.1246,-44.2212 -12.975,12.4455 -4.7664,-9.5327 -15.0934,-10.0623 -15.8879,32.8349 -8.4735,-25.4206 -13.2399,14.5639 -13.5046,-14.5639 -15.6231,5.5608 0.2648,0 z",
	"Mole Valley": "m 4260.8344,6754.9772 14.2302,2.2468 0,20.222 28.082,4.4327 -1.2788,-12.0412 14.6526,0.1755 20.7079,-15.5975 12.7323,32.018 21.7199,0 7.4896,33.7032 18.724,-1.4979 -11.9834,28.4605 21.7199,27.7115 -17.2261,6.7406 35.5756,13.4813 -32.2053,23.2178 -99.9862,32.9542 0,-53.5506 -17.2261,-12.3579 -7.1151,8.2386 -27.7115,-7.1151 0,0 -2.2469,-19.0985 -17.2261,-10.8599 16.4772,-15.3537 0,-13.4813 -10.86,1.8724 2.6214,-10.111 -9.7365,-4.8682 0.3745,-33.3287 36.699,-15.3537 z",
	"Reigate": "m 4371.306,6785.6845 31.4563,-15.3537 10.111,-31.8308 19.8474,17.6006 3.7448,22.4688 18.3496,10.4855 -3.7448,31.8308 -12.3579,19.8474 10.8599,33.3287 -17.6005,6.7407 -8.9875,-5.6172 3.7448,19.8474 -35.5756,-13.8557 0,0 16.1026,-6.3662 -21.3454,-28.4605 12.3579,-28.4605 -19.473,1.4979 z",
	"East Surrey": "m 4454.8151,6788.6804 25.0901,-29.2095 15.3537,-2.2469 6.7407,-15.3536 23.9667,8.9875 6.3661,34.4522 0,0 9.362,-18.3496 10.86,21.3454 5.9917,38.197 -13.1069,29.5839 13.4813,59.9168 -64.785,10.4854 -1.1235,-7.4896 -44.1886,-0.7489 0,0 2.9958,-14.6047 -21.3453,0.3744 -8.2386,-29.2094 8.9875,6.7406 0,0 17.9751,-7.864 -10.86,-32.9543 12.7324,-20.2219 0,0 z",
	"Lewes": "m 4521.847,7040.331 167.3926,160.2775 -35.5756,7.864 -4.1193,28.4605 8.9875,38.946 -104.4799,-37.0736 -68.5299,-76.0194 -9.362,-10.4855 -20.5964,-2.6213 0,0 6.3662,-52.0528 11.6089,2.2469 -11.9834,-30.3329 29.2095,-15.7281 1.8724,9.362 0.3744,0 22.8433,-0.3745 z",
	"Eastbourne": "m 4688.8651,7200.6085 41.1928,17.6005 -47.5589,58.4189 -23.2178,-0.3745 -10.111,-39.6948 3.7448,-28.4605 z",
	"Bexhill and Battle": "m 4684.7957,7195.6047 4.634,-16.6823 13.9018,5.0312 -17.4766,-95.3271 -54.0187,-20.6542 21.1838,-11.6511 0,-41.838 25.9502,33.8941 49.7819,-28.0685 4.7663,-43.9564 21.7134,-6.8847 39.7196,19.0654 0,20.1246 61.9626,20.1246 46.6044,-14.2991 25.9501,21.1838 -6.8847,21.1838 21.7134,-4.7663 1.0592,16.947 -61.433,10.5919 -28.5982,-14.8286 -32.3052,110.1557 -93.7383,42.3676 -40.7788,-17.4767 z",
	"Hastings and Rye": "m 4928.9389,7034.0783 19.0654,-5.296 0,0 22.7726,7.4143 23.3022,43.9564 0,0 14.8286,-15.3582 14.8287,22.2429 -7.4143,12.1807 -46.6044,-11.6511 -57.1962,61.433 -89.5015,25.9502 31.7756,-110.1557 30.1869,16.4174 60.3739,-12.7103 -2.648,-16.947 -20.1246,5.2959 z",
	"Folkestone and Hythe": "m 4970.8486,7035.8372 25.4647,-53.9251 20.2219,21.7198 -13.4813,-62.1637 48.6824,0 6.7407,-67.4064 23.2177,13.4813 -12.7323,-26.2136 50.9293,-1.4979 0,-21.7199 50.9293,23.2178 1.4979,14.9792 -0.749,-0.7489 37.4481,6.7406 -21.7199,25.4646 26.9626,30.7074 -99.6117,40.4439 -38.946,72.6491 12.7324,54.6741 -71.9002,-6.7407 6.7406,-12.7323 -14.9792,-21.7198 -13.4813,14.9792 z",
	"Dover": "m 5168.5741,6857.5847 29.9584,-0.749 14.2303,-23.2177 -22.4689,-11.2344 9.7365,-22.4688 0,0 34.4522,17.975 0,0 15.7282,-29.9584 35.9501,14.9792 20.9708,-18.724 8.9876,89.8752 -101.8586,62.9127 -26.9626,-29.9584 21.7199,-24.7157 -37.4481,-7.4896 z",
	"South Thanet": "m 5200.6211,6798.9382 -8.4736,-18.5359 9.5327,-12.7102 0,-0.5296 -6.3551,-8.4736 17.4766,-36.0124 64.081,13.7695 7.4143,-22.7726 11.1215,2.648 17.4767,-41.838 -22.243,-10.5919 30.1869,0 14.8286,16.4174 -19.0654,44.486 -24.3613,-1.5888 -5.8256,13.7695 21.1838,46.6043 -21.7134,19.595 -36.542,-15.8878 -13.7695,30.1869 z",
	"North Thanet": "m 5124.3594,6692.4896 168.4112,-27.0093 19.595,9.0031 -17.4767,42.3676 -10.5919,-3.7072 -6.8847,23.3022 -65.6698,-13.2399 -58.785,36.542 0,0 13.2399,-19.0654 -12.1807,-18.0062 -22.7726,5.8255 z",
	"Canterbury": "m 5123.3002,6691.96 -30.1869,5.8255 -13.2399,19.0655 -29.1277,-2.648 40.7788,32.8349 -6.3551,27.5389 -16.4175,13.2399 15.3583,14.299 0.5296,57.1963 33.8941,0 0.5296,-22.7726 48.7227,22.7726 30.1869,-4.2368 14.299,-22.243 -22.2429,-11.6511 9.5327,-22.2429 -7.944,-19.5951 10.0623,-11.1214 -6.8847,-9.0032 -0.5296,-0.5296 18.0062,-35.4828 -59.8442,36.0124 13.7695,-19.0654 -13.2399,-17.4766 -22.7726,5.8255 z",
	"Ashford": "m 4871.7427,7022.9568 -10.0623,-26.4798 30.1869,-37.0716 -28.5981,-6.3552 0,-21.1837 67.2585,-92.1495 13.7695,4.7663 20.1246,-29.6573 22.7725,13.7695 80.4985,-41.838 15.3582,14.299 2.1184,59.3147 -16.4175,0.5295 12.1807,25.9502 -22.243,-13.2399 -7.9439,67.7882 -48.1931,0 13.2399,63.0217 -19.0654,-22.2429 -26.4798,53.489 -22.243,-7.4143 -20.1246,5.8256 -25.4205,-20.1247 z",
	"Maidstone and the Weald": "m 4861.1508,6998.0658 -46.6044,-30.7165 -4.2367,18.5358 -13.7695,-39.7196 21.1838,-33.3645 -16.5881,-4.6754 -61.7919,-49.8728 14.299,1.0592 1.5888,-20.1246 -20.1246,-11.6511 -0.5296,0 20.1246,-16.9471 12.7103,5.8256 0,-21.7134 24.891,-2.648 11.1214,-23.8317 29.6574,10.0623 0,0 -12.1807,75.2024 54.0186,46.0748 15.8879,-6.3552 -27.0093,38.1309 0,21.7133 28.5981,6.8848 z",
	"Tunbridge Wells": "m 4738.2848,6858.2528 -43.9564,4.7663 -10.5919,21.7134 -28.0685,-11.1215 -22.243,15.8879 15.3583,14.299 -21.7134,19.0654 -12.1807,-6.8847 -1.5888,20.1246 41.3084,-6.8847 25.9502,11.1215 -0.5296,0 31.7756,-13.2399 1.0592,16.947 0,0 19.0654,-0.5296 -3.7071,22.7726 11.1215,-7.9439 16.4174,11.1215 38.6604,18.5358 -0.5296,19.595 62.4922,21.1838 0,0 15.8879,-4.2368 -11.6511,-27.5389 -46.0748,-29.6573 -3.7071,19.0654 -15.3583,-41.838 22.7726,-32.3053 -16.947,-4.7663 z",
	"Faversham and Mid-Kent": "m 4803.9545,6767.6921 17.4767,-33.3645 0,0 9.0031,7.4143 0.5296,0 6.3551,-11.1215 59.3146,6.3552 8.4736,38.1308 17.4766,-10.5919 22.243,21.1838 11.1215,-22.7726 32.8348,-2.1184 38.1309,-41.3084 23.8317,-5.8255 39.7196,33.8941 -5.8255,27.5389 -15.8879,11.6511 -82.6167,41.838 -22.243,-14.2991 -19.0654,29.6573 -14.2991,-5.2959 -39.19,54.0186 -16.947,6.8848 -53.4891,-46.6044 -0.5296,0 12.7103,-74.6728 z",
	"Sittingbourne and Sheppey": "m 4864.8579,6732.2092 14.8287,-55.6074 22.243,18.0062 -7.4143,-41.838 20.6542,37.0716 -3.1776,-33.894 21.7134,-0.5296 1.5888,-22.7726 87.9127,19.595 30.1869,37.0716 -31.7757,21.7134 -74.1433,-12.1807 3.1776,9.5327 77.8504,10.5919 -39.7196,41.838 -32.8348,2.1184 -10.5919,22.7726 -23.3022,-21.1838 -16.947,10.5919 -9.5328,-38.1308 z",
	"Gillingham and Rainham": "m 4837.1592,6729.5125 -8.2385,-29.2094 -8.9875,-4.8683 12.7323,-17.975 18.3495,7.4896 15.3537,-19.0985 -7.8641,22.8433 18.3495,-4.4938 -12.7323,48.6824 z",
	"Chatham and Aylesford": "m 4812.4435,6690.9411 16.4772,9.7365 8.2385,29.5839 -5.9916,11.9833 -9.7365,-8.2385 -28.4605,56.921 -14.6047,1.8724 -4.8683,-23.9668 -7.8641,1.4979 -1.8724,-22.8432 -21.7198,-18.724 33.7032,2.9958 0.3745,-25.4646 31.4563,23.2177 z",
	"Rochester and Strood": "m 4740.7307,6728.7636 24.1539,-38.946 24.7157,-17.975 2.9958,-33.7032 -18.3495,-10.8599 9.362,-27.3371 131.4425,8.2386 9.362,30.3329 -56.921,5.2427 2.2469,13.4813 -50.9293,7.4896 14.6047,13.1068 -13.4812,16.8516 -8.2386,-4.1193 -3.7448,38.5714 -32.5798,-23.2177 0,25.8391 z",
	"Gravesham": "m 4773.7676,6627.879 -33.894,12.1807 -33.8941,-4.2367 -10.0623,-13.7695 18.0062,65.1402 1.5888,61.9625 25.4206,-20.6542 23.8317,-39.19 24.3614,-17.4766 2.648,-33.8941 z",
	"Dartford": "m 4695.9172,6622.0535 -19.8598,12.7103 -34.1589,-21.9782 -8.2087,22.243 -18.271,12.1806 0,11.3863 -8.4735,-1.324 -0.7944,18.0063 7.9439,4.2367 6.8847,-10.5919 12.9751,0 14.8287,21.7134 12.7102,-13.7694 15.0935,-0.5296 13.7695,12.7102 -1.0592,18.5358 12.7102,5.0312 -7.9439,21.4486 21.1838,15.3582 -1.5888,-62.2274 z",
	"Sevenoaks": "m 4606.1509,6675.5426 6.3551,16.947 -9.5327,-2.3832 2.3831,33.8941 -17.2117,11.3863 0.2648,15.623 -16.9471,8.4735 4.7664,18.5359 -16.4175,6.3551 -11.651,-5.0312 3.9719,8.4736 6.0904,38.6604 -7.6792,18.5358 82.352,-0.5296 17.4766,-23.567 5.296,12.4455 11.3863,-15.623 -4.5016,-6.0904 0,0 12.1807,-0.5296 -2.1184,-52.1651 10.5919,-8.4735 3.7072,-24.8909 7.4143,8.2087 7.9439,-21.1838 -13.2398,-5.5607 1.0592,-18.2711 -12.9751,-12.7102 -16.4175,0.5296 -12.1806,14.8286 -14.8287,-22.243 -12.7103,-0.5296 -6.8847,10.8567 z",
	"Runnymede and Weybridge": "m 4227.8801,6663.4168 7.3024,3.932 -2.2469,11.0472 13.1068,3.932 2.9959,20.9709 c 0,0 12.7323,8.6131 13.1068,7.8641 0.3744,-0.749 10.8599,-9.7365 10.8599,-9.7365 l 12.5451,16.1027 -6.3662,7.864 -0.5617,32.0181 -18.5368,-2.6214 1.4979,-8.613 -8.4258,-7.3024 -19.0984,8.2386 -17.5003,-6.1014 -7.2154,-15.6185 -7.3024,3.9321 -26.5881,-29.5839 5.43,-32.0181 18.9112,-19.6602 z",
	"Esher and Walton": "m 4278.8613,6707.8478 12.9751,-20.9189 12.4454,-5.0312 5.0312,4.2368 10.0623,-7.1496 17.4766,19.595 7.1495,-0.5296 6.0904,14.0343 -12.7103,23.3022 0,18.8006 -20.6542,16.1526 -14.5638,-0.2648 1.5887,11.9159 -28.5981,-4.7663 -0.2648,-20.1246 4.2368,0 -0.2648,-32.3053 6.3551,-7.4143 z",
	"Spelthorne": "m 4234.4335,6631.9605 29.2095,11.0471 1.4979,15.1665 15.3537,9.362 5.2427,-4.4938 7.8641,9.7365 10.2982,-2.9959 0.1872,11.7962 -12.545,4.8682 -12.9196,21.5326 -5.8044,-6.5534 -11.0472,9.7365 -12.5451,-8.0513 -3.3703,-20.5964 c 0,0 -13.2941,-3.1831 -12.9196,-4.3066 0.3745,-1.1234 2.6214,-11.0471 2.6214,-11.0471 l -9.362,-4.8683 -7.1151,-17.975 4.3065,-15.7282 z",
	"Epsom and Ewell": "m 4338.9135,6757.224 13.8557,-9.7364 8.9876,-25.2774 17.6005,-14.4175 5.9917,1.8724 -1.3107,10.6727 11.2344,2.2468 5.6172,16.8516 -8.8002,8.6131 8.9875,3.7448 9.5492,-7.1151 -8.2385,25.2774 -31.4564,15.5409 -20.9709,0.749 z",
	"Sutton and Cheam": "m 4385.5363,6709.2906 3.183,-11.4216 10.4855,10.2982 5.6172,-7.8641 7.4896,5.8044 4.4937,-0.9362 6.9279,23.0305 -4.681,15.541 -6.1789,-5.9917 -2.0596,6.3661 -9.5493,7.3024 -8.9875,-3.7448 8.2386,-8.613 -5.9917,-17.0389 -10.2982,-1.8724 z",
	"Henley": "m 4016.2989,6558.4687 -1.4979,15.2601 17.2261,28.4605 -31.4564,35.2011 -14.2302,5.9917 8.613,-14.2302 -12.7323,-17.2261 -28.835,26.2136 -12.7323,-8.6131 0.749,-7.4896 -11.2344,-7.4896 -17.9751,7.8641 -28.086,-24.7157 -0.3745,-28.086 14.6048,-67.7809 -44.1887,-35.9501 -10.4854,15.7282 -39.3204,1.8724 -1.498,-22.8433 17.6006,3.3703 17.2261,-19.4729 -13.1068,-28.086 28.086,4.4937 11.2344,-17.975 -11.2344,-2.2469 5.9917,-28.4605 -40.4439,-17.975 6.7407,-27.7116 -52.6358,-29.6896 -2.3831,-8.4735 25.9501,0 4.8682,-52.0132 87.2813,66.0474 51.1059,90.2959 70.4361,5.0312 c 0,0 16.6823,60.109 15.6231,60.109 -1.0592,0 -37.6013,17.2118 -37.6013,17.2118 z",
	"Wycombe": "m 3988.2129,6474.8661 134.8128,-15.7282 14.2303,51.6783 -50.1804,-8.9876 -10.5195,57.4679 -30.1869,8.2087 -21.9782,-16.947 -9.0031,23.0374 0.7944,-15.8879 z",
	"Buckingham": "m 3887.542,6301.6369 43.001,4.7131 -11.9834,-151.2899 -41.1928,-11.9834 102.6075,-56.172 83.1346,86.8794 80.8877,11.9833 -25.4646,58.4189 92.1221,63.6616 -26.9626,22.4689 -74.896,-44.9377 -23.9668,41.9418 -62.9126,-46.4355 73.3981,113.8419 -44.1887,23.2178 -42.3576,-20.7046 -69.9065,-5.0312 z",
	"Aylesbury": "m 4098.6845,6302.6052 39.3204,62.5382 -44.1886,69.6533 29.2094,24.3412 -135.1873,16.1026 36.6991,-17.975 -15.7282,-59.9168 41.1928,20.5964 45.6866,-22.8433 -74.5216,-114.9654 63.6616,47.1845 z",
	"Chesham and Amersham": "m 4137.6304,6365.8924 70.0278,30.3328 16.4771,112.3441 -49.0569,8.613 -15.3536,-34.8266 -22.0944,29.2094 -14.6047,-52.8017 -29.2094,-24.7157 z",
	"Beaconsfield": "m 4224.1353,6508.5693 25.4647,40.4438 -5.8045,58.0444 -20.4328,1.4979 1.5702,-13.1468 -54.7574,-25.8019 -21.0708,8.0686 5.3346,33.2679 -7.0724,5.4763 -21.5326,-19.2857 3.5576,-51.6782 -6.5534,5.4299 -6.9279,-15.9154 -21.1581,12.7323 -9.1748,-1.6851 -9.7365,13.8557 11.2344,-58.0444 50.7421,9.362 21.7198,-28.6477 15.3537,34.4522 z",
	"Slough": "m 4154.482,6610.4279 -5.2427,-32.9543 20.7837,-7.6768 54.6741,25.8391 -1.498,12.9196 -17.4133,1.4979 -38.0097,-9.362 z",
	"Wealden": "m 4558.7521,6914.9194 55.6075,0.5296 -1.0592,21.1838 40.7788,-7.9439 25.9502,12.1807 30.7165,-13.2399 2.1183,16.4174 19.0654,0 -3.7071,22.243 10.5919,-7.4143 15.8878,11.1215 -20.6542,6.3551 -5.2959,43.9564 -48.7227,27.0093 -28.0686,-33.3645 0.5296,40.7788 -19.595,13.2399 51.3707,20.1246 19.0654,95.8567 -13.7694,-4.7664 -5.296,16.5499 -163.1152,-155.3037 12.1807,-47.1339 -25.9502,-32.8349 45.0156,-13.7695 -12.1807,-28.0685 z",
	"Tonbridge and Malling": "m 4559.2817,6914.125 -14.0342,-58.785 5.0311,-10.0623 83.1464,-0.7944 17.4766,-23.0374 4.2368,12.1807 12.1807,-15.8878 -4.2368,-6.8848 11.3863,0.2648 -2.1184,-53.489 11.1215,-7.1496 3.972,-23.8317 27.8037,23.0373 25.4206,-20.919 22.7725,19.5951 1.324,23.8317 7.4144,-3.1776 5.5607,23.8318 -10.8567,1.5888 0,21.7134 -12.4455,-6.0904 -21.1838,18.0063 21.7134,11.3863 -1.7212,19.3302 -59.1822,3.8395 -10.5919,21.3162 -27.9361,-10.4595 -22.7726,15.8879 15.3583,14.299 -21.1838,18.8006 -12.5779,-7.2819 z",
	"Milton Keynes North": "m 4175.4529,6060.1294 c 0,0 -75.0651,92.1735 -77.4482,88.9959 -2.3832,-3.1775 -87.1184,-99.299 -87.1184,-99.299 l 119.8163,-70.2101 23.2177,17.975 z",
	"Milton Keynes South": "m 4020.7927,6129.4082 26.7753,-37.6353 51.1165,57.67 35.0139,-39.1332 10.111,74.896 -80.8877,-11.4216 z",
	"Banbury": "m 3773.6358,6017.2514 -29.5839,64.0361 -52.0528,-10.8599 -24.5284,98.6755 19.8474,20.2219 33.8905,-11.9834 166.0819,124.1402 43.2525,4.681 -12.3579,-151.1027 -42.6907,-13.2941 -77.5174,40.4439 -22.2816,-93.0583 41.9418,-13.2941 z"
},
"South West England": {
	"Cheltenham": "m 3402.7168,6255.0923 -11.7559,33.6885 -24.3891,-1.9301 -43.5143,-19.1252 11.405,-29.1266 z",
	"St Ives": "m 1408.0668,7713.2929 54.5828,53.73 73.3457,-20.4686 10.2343,92.9615 81.0214,-5.97 23.0272,42.6428 -88.6972,74.1986 -130.4871,-138.1629 -142.4271,57.1414 5.1172,-114.2828 z",
	"Camborne and Redruth": "m 1423.271,7727.6248 36.8201,-34.8004 89.6538,-44.7858 46.8033,-0.4157 4.2643,86.1386 32.4085,92.1085 -11.94,6.8229 -76.7571,5.97 -7.6757,-93.8143 -74.1986,23.88 z",
	"Truro and Falmouth": "m 1632.3682,7820.7529 133.8985,-111.7243 -41.79,-111.7242 -32.4086,14.4986 5.97,-46.9072 -86.9914,-10.2343 -60.5528,92.9614 46.9071,1.7058 2.5586,82.7271 z",
	"St Austell and Newquay": "m 1611.8996,7552.103 58.8471,-65.67 110.0186,13.6457 56.2885,95.52 46.0543,-20.4686 17.0571,57.1414 -28.9971,12.7929 -41.79,-19.6157 -29.85,100.6371 -36.6728,-16.2043 -39.2314,-112.5771 -31.5558,16.2043 4.2643,-46.9072 z",
	"South East Cornwall": "m 1804.6453,7535.8987 c 4.2642,0 108.3128,-22.1743 108.3128,-22.1743 l 29.85,-88.6971 126.2228,0.8528 27.2914,50.3186 24.2545,-26.2719 43.1212,176.3747 -30.7028,30.7029 -233.6828,-28.9972 -17.0572,-53.73 -46.0542,21.3215 z",
	"North Cornwall": "m 1672.4524,7480.463 c 0,-7.6757 71.64,-96.3728 71.64,-96.3728 l 206.3914,-158.6314 12.7929,-129.6343 48.6128,5.97 107.46,347.9656 -22.1743,26.4386 -29.85,-52.0243 -125.37,1.7057 -29.85,89.55 -109.1657,19.6157 -26.4385,-36.6728 -106.6071,-10.2343 z",
	"Torridge and West Devon": "m 1964.9824,7090.7074 12.7928,-77.61 121.9586,28.1443 57.9942,-61.4057 177.3943,149.2499 -25.5857,76.7572 -76.7572,-52.8772 -77.6099,88.6971 133.8985,65.67 46.9071,205.5386 -115.1357,5.1171 -74.1985,32.4086 -134.7514,-450.3085 z",
	"Plymouth Moor View": "m 2198.873,7528.0563 13.8535,59.6177 -59.8039,-8.0718 -7.0307,-28.6226 z",
	"Plymouth Sutton and Devonport": "m 2153.4637,7580.2472 7.6758,35.82 39.2314,0.8529 12.7928,-28.9971 -62.2585,-7.6758 z",
	"South West Devon": "m 2213.1637,7587.0701 -26.4385,68.2286 48.6128,19.6157 88.6971,13.6457 43.4957,-34.1143 -1.7057,-82.7271 -29.4235,-58.8471 -115.5622,5.9699 -22.1742,10.2343 z",
	"North Devon": "m 2156.5458,6979.827 c -3.6183,-9.6489 3.6184,-118.1999 3.6184,-118.1999 l 273.7897,-24.1224 1.2061,50.6571 -63.9245,-1.2061 1.2062,34.9775 132.6734,80.8102 -15.6796,119.406 -62.7184,2.4123 -12.0612,34.9775 -82.0163,-32.5653 z",
	"Central Devon": "m 2488.2293,7119.7372 121.8184,91.6652 -54.2755,59.1 -38.5959,7.2367 1.2061,34.9776 37.3898,13.2673 20.504,39.802 -185.7427,131.4673 -65.1306,-41.0081 -39.802,-151.9714 -131.4673,-62.7183 79.604,-86.8408 75.9857,51.8633 24.1225,-83.2225 79.604,33.7715 15.6796,-33.7715 z",
	"Totnes": "m 2318.1662,7690.2328 59.0999,65.1306 85.6347,-10.8551 94.0775,-159.2081 -56.6877,-20.5041 1.2061,-54.2754 -55.4816,16.8857 -54.2755,-31.3592 -67.5428,-41.0081 12.0612,59.0999 32.5653,59.1 -3.6184,88.0469 -49.451,33.7714 8.4429,-4.8245 z",
	"Torbay": "m 2514.2222,7569.9064 c 0,-2.5585 15.7779,-35.287 15.7779,-35.287 l 34.9671,3.4115 -21.7478,-55.4357 -41.79,28.5707 -2.1321,53.73 z",
	"Newton Abbot": "m 2543.711,7482.1768 44.0234,-80.8102 -10.8551,-34.9775 -183.3305,128.452 52.4663,31.3591 57.2908,-16.8857 z",
	"Exeter": "m 2555.7722,7270.5024 21.7102,16.8857 -23.5194,24.7255 3.0153,13.2674 -39.199,-14.4735 0.6031,-33.1684 z",
	"East Devon": "m 2608.7099,7211.4453 127.3775,68.103 -1.2061,56.6878 -122.4092,67.1601 -34.5949,-34.3777 -10.0898,-18.7926 -12.6183,-26.0511 0,-13.2673 21.1071,-25.9316 -19.2979,-15.0765 z",
	"Bridgwater and West Somerset": "m 2433.9539,6836.2986 255.0947,53.6724 156.7959,-36.1837 118.1999,66.9398 -6.0306,36.1836 -54.8785,34.9776 -21.1072,-13.2674 -30.7561,40.4051 -89.8561,-28.3439 -30.153,-42.8173 -124.2306,76.5888 -107.9479,18.0918 6.0307,-41.0082 -132.6734,-80.2071 -1.2062,-33.7714 63.3214,1.2061 z",
	"Tiverton and Honiton": "m 2608.2544,7024.016 22.243,47.1339 118.0997,30.1869 6.3551,48.1931 57.1962,-12.1807 6.3552,48.1932 38.1308,0 7.9439,35.4828 38.1309,14.2991 -38.6605,30.7165 5.8256,43.4268 -80.4984,12.7102 -8.4735,16.4175 -49.2524,-0.5296 4.2368,-57.7259 -126.5732,-70.4361 -120.218,-90.0311 10.5919,-77.3208 z",
	"Taunton Deane": "m 2607.8793,7023.1049 23.2178,47.1845 117.5867,31.4563 7.4896,46.4356 56.172,-11.9834 -18.724,-26.2136 56.921,-23.2178 55.423,-71.9002 -4.4937,-23.9667 -18.724,-13.4813 -31.4564,41.1928 -91.3731,-28.4604 -29.2094,-42.6908 z",
	"Yeovil": "m 2850.8089,7084.9194 28.5981,27.0093 42.8972,-28.5981 38.1308,19.0654 37.6012,-27.0094 -6.3551,-24.3613 60.3738,-30.7165 23.8318,57.1962 -23.3022,88.4424 -19.0654,-10.0623 -170,63.5513 -7.9439,-35.4828 -37.0716,0 -7.4143,-48.7227 -16.9471,-26.4798 z",
	"West Dorset": "m 2869.8743,7307.8788 18.5358,-13.7695 118.0996,40.7788 118.6293,91.6199 -1.0592,-82.0872 34.4237,32.8349 62.4921,-84.2056 37.6013,-14.299 -124.4548,-113.8629 c 0,0 47.6635,-11.1215 46.6043,-13.2399 -1.0592,-2.1184 -6.8847,-24.891 -6.8847,-24.891 l -21.7134,-10.0623 16.947,-27.5389 -14.8286,-4.2367 -5.296,18.0062 -29.6573,-39.19 -43.1619,12.1806 -23.567,90.5608 -19.595,-10.8567 -168.676,63.0217 38.9253,16.6823 -39.4549,30.7165 z",
	"South Dorset": "m 3126.9087,7429.0413 20.2219,23.2178 -5.2427,41.9417 c 0,0 29.2094,-62.1636 29.2094,-65.1595 0,-2.9958 -20.9708,-26.2136 -20.9708,-26.2136 l 11.2344,-17.975 211.9557,53.1761 71.1512,-59.1678 -11.2344,-36.6991 -47.9335,-21.7198 -25.4646,13.4813 -34.4522,4.4937 -54.6741,-29.9584 -11.9833,-29.9584 -37.0736,13.1068 -63.2871,84.6325 -34.8266,-31.8308 z",
	"Mid Dorset and North Poole": "m 3258.7257,7275.13 0,-19.0985 32.9542,8.6131 c 0,0 33.7032,-1.498 35.9501,-2.6214 2.2469,-1.1234 15.7282,-18.3495 15.7282,-18.3495 l 65.534,-0.749 -5.6172,-22.4688 36.699,0 7.1152,35.9501 -21.3454,38.197 -27.7115,-15.7282 -39.3204,54.2996 -33.3288,4.8683 -55.0485,-29.9585 z",
	"Poole": "m 3375.189,7310.3311 52.8017,5.2427 12.3578,13.8558 -24.7157,-1.4979 22.4688,14.6047 22.8433,-25.0901 -28.8349,-37.4481 -7.4896,13.4813 -26.5881,-15.7281 z",
	"Bournemouth West": "m 3461.3194,7319.6931 21.7198,-11.2344 -1.4979,-21.7198 -10.1109,-6.7407 4.4937,-10.4854 -11.9833,-16.1026 -17.2261,3.7448 -14.2303,25.4646 z",
	"Bournemouth East": "m 3475.4659,7268.6888 c 5.8256,-3.972 11.9159,-9.5327 11.9159,-9.5327 l 63.2866,46.8691 -5.0311,12.9751 -62.4922,-10.3271 -1.5888,-22.5078 -9.7975,-6.8847 z",
	"North Dorset": "m 3168.8504,7088.2644 39.6949,-11.9833 -19.4729,-22.4688 c 0,0 34.4521,-23.2178 29.9584,-32.2053 -4.4938,-8.9875 -8.9875,-41.1928 -8.9875,-41.1928 l 60.6657,17.975 76.394,110.0972 82.3856,-32.9543 46.4355,56.172 33.7007,-7.5947 -22.7726,59.8442 -46.6043,34.9532 -37.6012,1.5888 6.8847,22.243 -67.2586,1.0592 -14.8286,18.5358 -36.5421,1.5888 -32.3052,-8.4735 0,23.3022 -124.9844,-114.9221 47.1339,-12.1807 -6.8847,-24.891 -22.243,-10.5918 z",
	"Salisbury": "m 3383.0531,7093.5072 -1.498,-61.0403 c 0,0 73.0237,-34.8266 73.0237,-36.699 0,-1.8724 -2.6214,-38.197 -2.6214,-38.197 l -56.921,-0.3745 8.9875,-60.6658 23.2178,-21.7198 -26.2136,-24.7157 73.3981,-14.2302 12.7323,53.1761 83.8836,7.4896 5.2427,-19.4729 16.4771,68.9043 21.7198,5.9917 -2.9958,77.8918 14.9792,20.9709 -5.2427,44.1887 -37.448,7.3023 -108.412,-52.0527 -45.8738,24.9029 z",
	"South West Wiltshire": "m 3210.0433,6979.6652 -11.2344,-28.086 66.6574,-121.706 -16.1026,-62.5382 117.2122,-4.1193 0.3745,74.896 32.9543,12.3579 26.9625,24.3412 -22.8433,21.7198 -8.9875,61.4148 56.921,-0.749 2.9958,38.5715 -73.7725,36.699 1.1234,61.4147 -35.9501,14.9792 -76.0194,-111.2205 z",
	"Somerton and Frome": "m 3197.6935,6950.4023 12.7102,30.7165 9.0031,41.838 -3.7071,6.8847 -25.4206,23.8318 18.4035,22.3753 -40.6464,12.4455 -13.7695,-3.7071 -5.296,18.4034 -29.3925,-39.3224 -43.5591,12.4454 -23.9642,-56.4018 -61.457,31.6538 7.1152,23.9667 -36.6991,27.3371 -40.0694,-19.8475 -41.9417,28.835 -26.9626,-26.2136 53.5507,-70.4023 -2.9959,-22.8433 55.1919,-34.5809 26.4798,13.7695 21.7133,-35.4829 22.243,12.1807 3.1776,-36.542 42.3676,15.3582 38.1308,-42.3676 30.7165,-69.9065 106.7481,-47.6782 15.9154,62.9126 z",
	"Wells": "m 2845.6741,6852.7165 -12.3578,-90.2497 68.5299,33.3287 49.8058,-7.1151 c 0,0 -5.6172,-24.3412 -4.1193,-24.7157 1.4979,-0.3745 82.7601,16.8516 82.7601,16.8516 l 26.5881,25.0902 34.8267,-17.9751 50.1803,26.2136 -31.4563,71.9002 -36.6991,40.0694 -43.4397,-14.9792 -2.2469,37.8225 -22.8432,-13.1069 -20.9709,35.5757 -26.9626,-14.2303 6.3662,-37.0735 z",
	"Weston-super-Mare": "m 2849.0445,6768.8329 28.4604,-70.7767 102.9821,20.9709 -11.9834,15.7281 17.6006,20.9709 10.4854,-11.2344 24.3412,16.4772 -6.7406,16.4771 -67.4064,-14.2303 4.1192,24.7157 -49.8058,8.2386 -53.1762,-27.3371 z",
	"North Somerset": "m 2893.6076,6701.4265 85.7559,-89.5007 57.67,13.8557 18.724,32.9543 -6.7407,38.9459 28.4605,7.8641 -39.3204,48.6824 -19.8474,-36.699 -6.3662,37.0735 -15.3537,-10.111 -10.4854,10.4855 -17.9751,-20.9709 11.2344,-15.3537 z",
	"Bristol North West": "m 2993.2193,6614.9216 34.8266,-45.3121 13.8558,31.4564 38.5714,-5.6172 17.9751,25.8391 c 0,0 -11.2344,21.7198 -13.1068,20.2219 -1.8724,-1.4979 -8.6131,-17.975 -8.6131,-17.975 l -26.9625,25.0901 -13.8558,-23.9667 z",
	"Bristol West": "m 3056.8809,6659.1103 32.2053,3.7448 8.9875,-26.5881 -11.6089,4.8682 -10.4854,-17.975 -26.2136,24.7157 z",
	"Bristol South": "m 3089.0862,6663.2295 1.8724,30.3329 -13.8558,11.9834 -28.4605,-8.613 7.1152,-37.8225 z",
	"Bristol East": "m 3099.1972,6620.5388 c 2.8086,-2.2469 16.4771,-4.8682 17.6005,-4.4937 1.1235,0.3744 -4.681,62.1637 -4.681,62.1637 l -20.5964,15.5409 -2.6213,-31.0819 9.5492,-26.9625 -12.7323,5.8044 z",
	"Christchurch": "m 3439.9831,7220.4956 49.7819,-36.8068 22.243,-3.1776 11.3863,25.6854 0.2648,62.757 22.5077,-13.7695 3.4424,29.3925 35.7477,-5.0311 -6.3552,16.947 -28.3333,9.0031 -62.757,-46.3395 -12.4455,9.5327 -11.3862,-15.6231 -16.6823,3.7072 z",
	"Kingswood": "m 3116.985,6636.267 14.2302,-31.4563 13.6685,26.9625 19.0985,-1.8724 -13.8558,18.1623 29.584,24.5285 -37.6353,16.1026 -29.9584,-10.2982 z",
	"Filton and Bradley Stoke": "m 3028.0459,6568.2988 c 0.749,-3.183 17.9751,-36.5118 17.9751,-36.5118 0,0 19.4729,4.4938 18.1623,4.681 -1.3107,0.1873 -13.6686,14.043 -13.6686,14.043 l 66.6575,3.1831 -12.5451,20.9709 15.9154,2.0597 12.9196,8.9875 -2.4341,19.8474 -14.6048,33.3287 0,-23.405 -17.6005,5.0555 -18.5368,-25.4646 -38.197,5.4299 z",
	"Thornbury and Yate": "m 3046.7699,6531.0381 58.0445,-78.2664 82.7601,34.0777 c 0.3744,2.6214 -3.3704,40.0694 -3.3704,40.0694 l 65.9085,15.7282 12.7323,51.3037 -40.4438,20.9709 21.3454,10.4855 -3.3704,52.8017 -29.5839,-11.9834 -30.8402,6.272 -29.9221,-24.6262 14.2991,-18.4034 -19.595,2.3832 -13.7695,-27.0093 2.1184,-19.3302 -13.5047,-9.0032 -15.0934,-1.8535 12.7103,-21.4486 -66.729,-2.648 13.2399,-14.8287 z",
	"North East Somerset": "m 3248.5346,6767.1625 -36.8069,-20.3894 26.7446,-12.1807 2.1183,-56.4019 -29.1277,-12.4454 -31.7757,6.6199 -38.1308,16.4174 -30.1869,-10.5919 -33.8941,27.0094 c 0,0 -39.7196,50.3115 -39.7196,49.2523 0,-1.0592 -19.3302,-37.3364 -19.3302,-37.3364 l -6.3551,37.0716 8.7383,6.8847 -7.1495,16.1527 16.947,3.7071 25.6853,24.891 34.9533,-17.2118 51.9003,26.2149 z m -57.2483,-25.6921 -19.3007,-20.178 10.0012,-25.091 16.6688,-0.8773 24.2137,3.6847 3.6847,34.0394 z",
	"Bath": "m 3198.2231,6695.4024 c 1.3239,0 24.6261,2.6479 25.1557,3.9719 0.5296,1.324 3.4424,33.8941 3.4424,33.8941 l -35.4829,8.4735 -19.3302,-20.3894 9.7975,-24.8909 z",
	"Chippenham": "m 3240.061,6704.1407 48.1932,-3.972 c 0,0 -0.5296,-45.8099 0.5296,-46.0747 1.0592,-0.2648 29.1277,9.5327 29.1277,9.5327 l 13.2399,-32.5701 26.2149,32.0405 7.6791,67.2585 -54.2834,33.8941 -61.433,2.3832 -37.3365,-20.1246 27.0094,-12.1807 z",
	"The Cotswolds": "m 3324.0724,6331.4402 42.5035,-44.5631 24.7157,2.2468 15.7282,-44.9376 74.147,23.9668 -41.1928,-65.9085 71.9002,-29.9584 -37.448,-69.6533 55.423,-34.4522 50.1804,69.6533 31.4563,0.749 -21.7198,41.1928 26.9625,45.6865 -55.423,138.5577 38.9459,89.1262 -81.6367,9.7365 -148.2941,-2.9958 -53.9251,72.6491 -68.1554,8.9875 -63.8488,-14.7919 3.3703,-40.2566 -8.613,-24.5285 120.5825,8.2386 -12.7323,-49.2442 52.4383,-13.356 24.8919,-35.3264 z",
	"North Wiltshire": "m 3517.4914,6463.6317 -34.4522,95.1179 12.3579,40.8183 -33.7032,43.8142 10.4854,21.3454 -55.423,49.8058 -56.921,-26.2136 -1.4979,-25.8391 -27.7116,-31.4563 -12.3578,32.2052 -29.9584,-9.362 -0.3745,45.6866 -48.3079,3.7448 3.7448,-77.5174 -20.9709,-10.4854 40.0694,-22.8433 -13.1068,-51.6782 67.7809,-9.362 53.1761,-71.9002 z",
	"North Swindon": "m 3493.1502,6533.6594 19.473,31.4564 63.2871,-23.9668 17.2261,-53.5506 -21.7199,-31.0819 -54.6741,7.1152 z",
	"South Swindon": "m 3495.0226,6601.4403 32.9542,28.086 c 0,0 98.4883,-31.8308 98.4883,-33.7032 0,-1.8724 -28.086,-52.8017 -28.086,-52.8017 0,0 -13.4813,12.3579 -14.9792,10.111 -1.4979,-2.2469 -7.1151,-11.6089 -7.1151,-11.6089 l -64.7851,23.5923 -19.4729,-32.9543 -9.7365,26.2136 z",
	"Devizes": "m 3627.2141,6595.4487 44.1886,69.6533 -27.7115,23.2177 50.1803,58.4189 -8.9875,16.4771 -13.4813,-10.4854 -5.9917,89.1262 -42.6907,-8.2385 -46.4355,42.6907 -5.3594,20.0749 -83.9408,-7.8115 -12.5778,-52.6947 -74.1277,14.2177 c 0,0 -33.5159,-11.4216 -33.5159,-12.3578 0,-0.9362 -0.5617,-74.5216 -0.5617,-74.5216 l -56.5465,0.749 c 0,0 53.1761,-31.4563 53.1761,-34.4522 0,-2.9958 -2.9958,-40.4438 -2.9958,-40.4438 l 56.172,26.9625 53.9251,-51.6782 -8.2385,-20.9709 32.2053,-42.6907 33.7032,29.2094 z",
	"Tewkesbury": "m 3299.3757,6306.9446 -6.8848,-28.5981 -29.1277,-9.5328 -10.0623,-30.7165 60.3738,-60.9034 -5.2959,-49.7819 31.7757,6.3552 -14.2991,34.9532 57.7259,-5.8255 66.678,-33.1451 62.0135,42.1482 -72.0249,29.6573 41.3084,66.729 -74.6729,-24.3614 -3.9115,11.2783 -68.7193,-16.5863 -11.4067,29.2379 43.5523,19.5197 -42.1316,43.4039 z",
	"Gloucester": "m 3235.4143,6325.7294 14.6983,-19.7539 -5.6172,-13.1068 19.0985,-23.5922 29.584,8.613 5.2427,29.584 -36.3246,31.8308 z",
	"Stroud": "m 3104.5436,6452.8026 72.3451,-85.5751 -23.1516,-21.0929 51.3707,-35.2181 57.1754,28.2005 36.6991,-32.3925 65.1595,65.534 -24.3412,35.2011 -52.9889,13.2941 12.5451,49.2441 -120.5826,-8.2385 8.2385,24.1539 z",
	"Forest of Dean": "m 3313.6747,6176.6643 -88.4423,11.9158 -6.0416,-38.8931 -81.0767,-2.4153 20.919,112.2741 -131.7361,79.0095 11.9834,174.5077 137.2469,-145.8599 -23.0305,-21.3454 51.3038,-35.2012 30.7073,14.792 14.6047,-19.473 -5.6172,-13.294 18.5368,-23.5922 -9.9237,-31.0819 z"
},
"Wales": {
	"Monmouth": "m 2809.3496,6178.4651 53.1104,71.8128 53.489,-24.0965 111.2149,112.2741 11.9159,174.2367 -33.3644,26.2149 -69.6418,-60.9034 -88.9719,9.5327 8.1431,-70.4738 -42.0372,-62.9841 -63.755,-23.7244 74.3469,-69.4843 z",
	"Newport East": "m 2909.7102,6480.8577 -43.0652,40.8184 -17.226,-14.2303 15.7281,69.2788 71.1512,-5.6172 69.2788,-32.018 -69.8405,-61.4147 z",
	"Newport West": "m 2847.3665,6487.2716 -62.4922,32.5701 -1.0592,45.4127 17.4767,43.824 63.9485,-32.4377 -16.4174,-70.0389 17.609,15.2259 43.0296,-40.7788 z",
	"Torfaen": "m 2767.0333,6336.8702 0.1873,14.2302 22.0475,70.2618 -14.277,23.4518 20.7368,-4.8214 9.5024,29.6307 -15.5409,19.473 17.0388,19.2857 40.2411,-20.978 7.9439,-70.4361 -42.1028,-62.8894 z",
	"Blaenau Gwent": "m 2691.0139,6312.3417 76.2067,24.3412 -0.1873,14.792 22.2816,69.8405 -14.9792,23.5923 -98.1138,-106.9141 z",
	"Islwyn": "m 2728.0874,6395.4763 -9.9237,102.4203 66.5638,21.6262 22.0943,-11.1408 -17.0388,-19.2857 15.6345,-19.5666 -10.2982,-29.8648 -21.1581,5.2428 z",
	"Merthyr Tydfil and Rhymney": "m 2676.2219,6338.3681 -59.1678,-35.2012 -4.1193,70.2151 -19.8475,-5.43 79.2026,108.5992 53.1761,-52.6144 2.6214,-29.584 z",
	"Cynon Valley": "m 2616.8668,6303.1669 -98.4882,72.4619 7.3438,35.3751 155.3112,96.5023 -9.1182,-31.1422 -79.3898,-109.161 20.4092,5.9917 z",
	"Caerphilly": "m 2714.2316,6558.5624 69.4661,7.1151 1.1234,-46.0611 -67.2191,-21.9071 7.864,-73.3981 -53.3634,51.8655 8.8939,30.8946 z",
	"Cardiff North": "m 2789.6894,6581.2184 -37.6353,-3.5576 -12.1706,32.0181 -29.2094,-13.4813 -9.5493,-26.0264 13.2941,-11.9833 69.2788,7.4896 z",
	"Cardiff South and Penarth": "m 2771.3399,6579.5332 -4.3047,28.2937 -35.1196,23.6796 2.3507,46.515 -24.9029,23.0305 42.5035,-8.4258 6.9279,-45.6865 42.6907,-38.0098 -11.2344,-27.7115 z",
	"Cardiff Central": "m 2739.7264,6609.4756 4.7663,13.3723 22.7726,-15.0935 4.1044,-28.2009 -19.4627,-1.8536 z",
	"Vale of Glamorgan": "m 2731.9298,6631.7673 -68.3934,-35.5697 -87.4879,-8.2386 c -1.4913,-0.1404 -88.7518,47.1845 -88.7518,47.1845 l 46.81,59.9169 174.5077,6.5534 25.6519,-23.5923 z",
	"Cardiff West": "m 2701.0659,6569.756 -44.6183,1.4564 5.1695,24.6108 70.0279,36.3245 12.5451,-9.1748 -4.4938,-13.4812 -29.0222,-13.4813 z",
	"Bridgend": "m 2486.9222,6634.7691 -64.2233,-60.4786 131.068,-3.932 10.2982,23.2177 z",
	"Pontypridd": "m 2613.8152,6590.8074 10.8567,-33.3645 -29.3925,-46.6043 40.514,3.4423 0.2781,-34.5411 44.828,27.5737 33.4063,50.7914 -13.1075,11.7835 -44.7507,0.9268 4.8987,25.0233 z",
	"Ogmore": "m 2594.485,6510.309 -59.3146,-39.9844 -58.2555,0 -0.7944,101.947 78.1153,-2.1184 9.7975,23.3022 11.9159,-5.5608 37.866,2.9128 10.8567,-33.3645 z",
	"Aberavon": "m 2421.8986,6573.815 -71.8217,-76.2163 19.8599,-52.6947 53.7539,40.514 99.0342,-88.9719 12.1807,73.8785 -58.2555,-0.7944 -0.5296,102.4766 z",
	"Rhondda": "m 2534.6408,6469.9274 61.0358,40.9112 39.7196,3.5747 0.5296,-34.6884 -109.7585,-68.1854 z",
	"Neath": "m 2370.4589,6444.1587 -38.9459,-92.1221 59.5423,-25.4647 36.3246,48.6825 86.6921,-20.4092 8.8003,41.7545 -99.2372,88.5646 z",
	"Swansea East": "m 2356.9617,6412.3339 -61.433,47.9284 54.2835,38.1308 20.6542,-54.5483 z",
	"Swansea West": "m 2348.7391,6497.7093 -75.645,20.222 -5.9917,-59.9168 28.6478,2.4341 z",
	"Gower": "m 2331.806,6353.8137 c -1.0592,-0.5296 -41.0436,-2.1184 -41.0436,-2.1184 l -45.5452,101.6822 -130.0155,39.9844 59.0498,68.8474 131.8691,-24.891 -13.2399,-24.6261 -19.595,5.0311 -6.0903,-59.447 28.0685,1.8536 61.433,-47.796 z",
	"Llanelli": "m 2245.482,6453.3775 -123.6604,-12.975 -34.4236,-56.1371 159.1432,-57.9906 44.7508,25.6853 z",
	"Carmarthen East And Dinefwr": "m 2088.7219,6383.2062 54.5483,-207.0715 -109.6261,3.1775 -40.2492,-78.38 449.0964,-64.6106 41.314,113.4816 -92.001,176.3943 -60.2913,26.9625 -40.4439,-1.8724 -45.312,-25.8391 z",
	"Carmarthen West and South Pembrokeshire": "m 2033.1145,6178.253 -363.3021,239.9065 102.2118,80.4984 332.1794,-173.9584 39.3204,-149.043 z",
	"Preseli Pembrokeshire": "m 2033.4269,6178.6523 -84.6325,-164.3967 -421.6646,218.6963 154.2858,53.1762 -115.3399,71.9002 143.8004,32.2053 z",
	"Ceredigion": "m 2441.6101,6036.7244 38.946,-215.7006 -128.8212,-172.2608 -71.4458,22.9398 -87.3337,242.1921 -243.5169,99.6541 43.5445,86.837 z",
	"Dwyfor Meirionnydd": "m 2280.5837,5671.2318 -37.448,-337.0321 -333.2873,102.6076 239.6673,-244.91 128.8211,28.4605 47.9335,-37.448 103.3565,127.3232 190.7975,-38.5714 -17.0388,107.4757 -253.1485,269.6257 z",
	"Arfon": "m 2149.3606,5192.0151 112.0092,-148.1542 70.9658,-10.5918 36.0124,33.894 -42.0777,115.7467 -47.9335,37.8225 z",
	"Ynys Mon": "m 2138.5039,5134.4217 183.2398,-163.1152 -99.0343,13.7694 -37.0716,-102.7414 -160.4672,0.5296 -2.1184,110.1557 -66.729,-24.3613 z",
	"Aberconwy": "m 2332.3356,5032.7395 132.3987,-60.9034 36.3226,324.3391 -71.8055,13.5423 -103.0062,-127.1027 42.3676,-115.4517 z",
	"Clwyd West": "m 2501.3539,5296.317 c 1.0592,-0.2648 294.1123,-61.5371 294.1123,-61.5371 l -79.207,-120.2293 -54.4548,45.1414 9.7365,-59.9168 -38.197,24.7157 -36.2109,-145.7701 -132.9283,-7.4143 z",
	"Vale of Clwyd": "m 2597.0194,4978.0692 72.2746,-24.7157 46.81,160.59 -54.4868,46.123 10.111,-60.853 -38.5715,25.0901 z",
	"Clwyd South": "m 2603.3855,5378.7629 176.7546,-19.8475 95.8669,-70.4022 95.118,70.4022 39.6949,-77.1429 -165.5202,-52.4272 -5.9917,-43.4397 -62.3776,19.4818 19.0654,29.3925 -175.5607,36.8068 z",
	"Montgomeryshire": "m 2351.2686,5647.9962 129.3535,173.8395 361.1837,-111.7445 14.8286,-65.6697 -75.2024,44.4859 75.2024,-203.3644 -76.5264,-126.8379 -176.6199,20.1246 z",
	"Brecon and Radnorshire": "m 2876.2294,5847.2563 -88.4423,207.6011 36.1672,205.8061 -74.298,70.1128 -58.7851,-18.8006 -15.3582,25.9502 -58.2554,-35.2181 -98.5047,72.5545 -5.0311,-20.6542 -86.5888,20.6542 -36.2772,-48.4579 92.6791,-177.4143 -41.5732,-113.5981 38.9252,-213.9563 235.4049,-73.6137 z",
	"Delyn": "m 2670.043,4952.6045 152.7879,102.6076 5.7833,88.9822 -76.148,25.5632 -36.5776,-55.617 z",
	"Alyn and Deeside": "m 2820.622,5033.0043 7.6791,110.9501 -75.4673,25.4205 23.8318,36.0125 62.757,-19.0654 47.0015,-43.5592 -17.8738,-14.6963 46.8691,-30.7165 z",
	"Wrexham": "m 2925.4384,5173.1733 8.2386,83.8835 -88.7518,-27.7115 -5.6172,-43.4397 47.1845,-43.0652 z"
},
"Scotland": {
	"Orkney and Shetland": "m 3708.1959,-850.64521 59.5535,-250.12459 51.613,31.7619 31.7618,-31.7619 -95.2855,-79.4046 51.613,-107.1962 47.6427,31.7618 35.7321,-51.613 -123.0771,-35.7321 39.7023,-83.3748 35.732,-142.9283 47.6428,83.3748 55.5833,0 -19.8512,-238.2139 -43.6725,-11.9107 -51.6131,103.2261 -59.5534,11.9106 -27.7916,214.3925 -63.5237,0 19.8511,-138.9581 -55.5832,11.9107 -87.3451,134.9879 87.3451,51.613 -23.8214,107.1962 -95.2855,-23.8213 0,63.5236 127.0473,95.2856 71.4642,-55.5832 -59.5535,273.94591 z m -504.2194,520.10028 -134.9878,71.46416 -23.8214,63.5237 87.3451,-23.82139 27.7916,55.58324 -158.8093,3.97023 79.4047,142.928319 -75.4344,39.702311 -35.7321,138.95809 -47.6428,-123.077165 43.6726,-19.851156 -23.8214,-67.493929 -107.1963,27.791618 59.5535,75.434392 -75.4344,55.58324 -79.4046,-111.1664764 79.4046,-55.5832356 -55.5832,-27.791618 43.6725,-142.92832 59.5535,-19.85116 107.1962,-27.79162 27.7916,103.22601 35.7321,-63.52369 -123.0771,-154.83902 91.3153,-47.64277 31.7618,150.86878 95.2856,-75.43439 7.9404,31.76185 z",
	"Dumfriesshire Clydesdale and Tweeddale": "m 2845.5129,3500.0921 -261.6003,3.649 14.9792,-281.609 -73.3981,94.369 -209.7089,-128.8212 80.8877,-230.6797 314.5633,-214.2026 223.1901,185.7421 -235.1735,125.8253 314.9378,287.9752 z",
	"Berwickshire Roxburgh and Selkirk": "m 2834.1937,2845.2312 384.8371,-205.0412 166.2691,113.842 0,0 -151.594,167.213 74.1433,138.7538 -293.0973,282.3414 -315.4072,-288.1669 235.3621,-126.1953 z",
	"East Lothian": "m 2994.8586,2759.7185 -139.075,-112.0326 173.4987,-124.1666 189.8598,116.7756 z",
	"Midlothian": "m 2855.4106,2647.6796 -144.1748,95.118 0,0 123.2039,102.6075 160.652,-86.1304 z",
	"Edinburgh East": "m 2829.5715,2609.1082 -31.4563,23.2178 38.1969,27.7115 36.6991,-25.0902 z",
	"Edinburgh South": "m 2797.9279,2632.5132 -5.4299,56.3592 43.4397,-28.8349 z",
	"Edinburgh North and Leith": "m 2829.3843,2608.3592 -57.2955,-8.2385 26.0264,32.2053 z",
	"Edinburgh South West": "m 2797.5846,2632.0862 -116.5109,67.5233 22.243,48.1932 88.9719,-59.0499 z",
	"Edinburgh West": "m 2682.6625,2586.8058 -1.324,112.5389 116.2461,-67.2585 -25.9502,-32.8349 z",
	"Livingston": "m 2648.3231,2785.1138 -126.5742,-11.2344 3.932,-59.1679 63.7552,-6.7406 40.5375,-103.3565 51.6783,3.3703 0,91.3732 21.3453,48.3079 z",
	"Linlithgow and East Falkirk": "m 2451.3466,2623.7129 74.1471,91.3732 63.6616,-7.4897 41.1928,-102.982 51.6782,3.7448 0.749,-22.4688 -137.8087,-33.7032 z",
	"Dunfermline and West Fife": "m 2535.6046,2508.373 170.014,68.9044 32.9542,-76.7684 -116.0888,-63.2872 z",
	"Kirkcaldy and Cowdenbeath": "m 2680.1539,2467.9292 59.5424,-40.0694 38.1969,54.6741 89.8753,-27.7115 -51.3038,76.5812 -103.731,30.8946 25.8391,-62.1637 z",
	"Glenrothes": "m 2739.6963,2427.8598 25.8391,-55.0485 144.9238,40.8183 -41.7545,40.8183 -90.8115,27.7115 z",
	"Falkirk": "m 2451.3466,2623.7129 -64.4106,-77.1429 111.2206,-66.283 46.81,72.2747 z",
	"Airdrie and Shotts": "m 2451.7592,2623.3479 -53.7539,12.7102 -0.5296,96.6511 58.785,55.6075 65.405,-14.2991 3.9719,-58.785 z",
	"Motherwell and Wishaw": "m 2396.9461,2731.1204 -28.1649,18.4771 65.7661,63.0805 21.7134,-23.8317 z",
	"Cumbernauld Kilsyth and Kirkintilloch East": "m 2386.5616,2546.9445 -135.1874,0.3745 13.4813,56.172 93.9452,42.1384 92.5459,-22.291 z",
	"East Dunbartonshire": "m 2359.2125,2645.3261 -77.1885,15.8878 -22.2429,-24.6261 -25.4206,20.9189 -37.5236,-63.1768 68.5049,9.423 z",
	"Coatbridge Chryston and Bellshill": "m 2368.0248,2749.351 -22.502,-21.6591 12.1102,-40.3174 -52.8953,-30.5201 92.6838,-19.6602 -0.1873,94.1817 z",
	"Glasgow East": "m 2345.556,2727.6311 -49.6186,-10.4854 -20.5964,-31.8308 31.4563,13.4813 18.724,-30.1457 31.8308,18.724 z",
	"Glasgow North East": "m 2274.9665,2685.5021 -15.3536,-48.8697 22.2815,25.0902 22.8433,-4.8682 20.4091,11.9834 -18.5367,29.7711 z",
	"Glasgow North": "m 2234.3354,2657.6034 20.7837,31.6435 19.8474,-3.932 -15.3537,-48.6824 z",
	"Lanark and Hamilton East": "m 2345.0458,2727.4133 15.0935,109.3613 142.8856,47.3892 145.2982,-99.2372 -126.9487,-11.2344 -64.7851,14.6047 -22.2815,24.3412 z",
	"Glasgow Central": "m 2296.1246,2717.5202 -21.9071,-32.5798 -29.3967,7.4896 -5.1972,20.674 39.4622,17.523 z",
	"Rutherglen and Hamilton West": "m 2279.273,2730.8142 16.2899,21.9071 35.3884,0 -8.6131,51.3038 33.3288,2.4341 -10.86,-78.8281 -48.3079,-10.6727 z",
	"Glasgow South": "m 2295.2639,2753.0986 -26.0466,14.9649 -20.5577,-31.6471 -17.4767,9.5327 8.3412,-32.5701 39.5872,16.947 z",
	"Glasgow North West": "m 2207.3512,2612.4912 7.6791,68.5825 29.3925,11.6511 10.5919,-3.1776 z",
	"Glasgow South West": "m 2244.158,2692.9896 -15.3582,64.8754 -21.9782,-2.648 7.9439,-74.4081 z",
	"East Kilbride Strathaven and Lesmahagow": "m 2396.6725,2956.6257 -123.5784,13.8558 23.5922,-43.0652 -43.4397,-149.7921 42.3163,-24.7157 35.2011,-0.1872 -8.2385,51.491 33.8904,2.4341 3.5576,30.1457 0,0 143.0514,47.7462 z",
	"East Renfrewshire": "m 2277.5879,2864.8781 -159.5286,-88.7518 91.3732,-49.8058 -2.4341,28.6477 0,0 21.3453,2.8086 3.7448,-12.5451 16.4772,-8.8003 20.9708,31.6436 -16.4771,9.7365 0,0 z",
	"Kilmarnock and Loudoun": "m 2351.3604,3083.5745 -182.3718,-71.1513 10.4855,-47.5589 -111.4064,-105.5819 66.1994,-74.1433 144.5794,80.4984 17.4766,61.433 -23.567,43.6916 123.3956,-13.7695 z",
	"Central Ayrshire": "m 2067.7012,2859.4614 -50.0025,44.7371 51.6782,123.9529 99.6117,-14.9792 10.4855,-48.3079 z",
	"North Ayrshire and Arran": "m 1996.1153,2656.6619 -45.1435,16.7976 -0.35,58.0917 12.2483,56.6919 -27.996,42.6939 82.2382,73.1396 116.5334,-118.9831 -85.0378,-46.8933 z m -234.4665,145.2292 59.4915,71.7398 -13.2981,54.5922 34.995,28.6959 -23.7966,23.0967 22.3968,68.5903 -85.3878,10.4985 -46.8933,-43.3938 -22.3968,-127.3819 z",
	"Ayr Carrick and Cumnock": "m 2069.7326,3027.932 -236.2781,418.1392 483.0793,-258.0168 34.8672,-103.959 -181.9159,-71.2305 z",
	"Dumfries and Galloway": "m 1832.002,3447.1304 23.7358,92.9941 -79.2043,-97.0492 -20.5529,80.4495 80.7859,111.491 26.5356,121.0728 50.2911,30.0105 -33.0661,-169.5929 54.037,-46.8566 217.1425,178.1438 33.0918,-24.4982 -2.5414,-87.8459 -38.1744,-60.1313 27.1529,-36.3758 20.4286,49.2682 151.0833,96.7791 236.3157,-100.3607 19.9234,-362.574 -73.6136,94.7975 -208.9252,-128.6916 z",
	"Paisley and Renfrewshire South": "m 2018.8154,2690.8712 193.3021,14.2991 -2.1184,21.1838 -92.1495,50.3115 -69.3769,-38.6604 z",
	"Paisley and Renfrewshire North": "m 2083.9235,2695.8891 4.2688,-68.5693 72.5545,7.944 53.9284,46.119 -2.6214,23.5923 z",
	"Inverclyde": "m 1951.2921,2673.1298 7.4143,-63.2866 48.1931,-15.623 81.2928,33.0996 -4.2367,68.053 -65.405,-4.7664 -21.9782,-33.894 z",
	"West Dunbartonshire": "m 2160.0011,2634.5728 -68.9043,-21.3453 5.6172,-116.4633 68.9043,17.226 30.3329,79.3898 11.2344,19.8474 7.6768,67.781 z",
	"Stirling": "m 2096.3395,2496.3897 -115.6549,-297.5121 197.0093,-102.7413 167.2526,19.0654 -49.6826,168.4111 197.0093,118.6293 5.1345,78.7939 -110.8461,65.9085 -135.9363,0.3745 14.2302,56.5465 -68.5298,-10.111 -31.0819,-79.7643 z",
	"Na h-Eileanan an Iar": "m 1411.0705,277.27221 -140.4232,121.72348 -132.5048,50.45729 4.0888,86.09038 -140.4233,-16.84968 -50.44284,177.74331 145.53924,104.49749 -135.56637,64.90515 20.82336,94.59941 0.1248,46.82426 -116.67259,-46.21765 -94.8968,42.86505 -9.77328,56.7224 67.83138,72.6921 -47.29228,113.6408 2.19813,238.3567 -78.96615,101.7632 -9.67957,111.6612 101.70475,-100.6823 -17.07226,-88.8046 85.86782,6.217 -21.03149,-112.56 42.31624,-70.9881 18.56085,-166.0096 85.86781,-130.3766 42.31625,-94.74346 151.8866,-95.28265 7.3747,-49.75147 84.5797,-6.1999 70.7223,-79.44571 -7.9692,-118.44348 110.8079,-78.85115 -95.123,22.44283 88.9814,-102.27302 z",
	"Caithness Sutherland and Easter Ross": "m 1827.4628,614.2528 -32.6419,-74.51843 99.9924,-3.25222 46.5427,-228.92854 64.3593,-102.23306 283.4867,101.92707 636.2364,-88.44578 -68.4073,287.22307 -108.7737,61.22171 -61.2628,82.00769 -163.2132,117.14588 -128.5698,163.17197 151.7442,-5.70862 -306.067,228.14266 -2.2469,-2.2469 z",
	"Inverness Nairn Badenoch and Strathspey": "m 2241.7748,1151.8687 308.9424,-228.20459 -205.758,328.06769 95.1437,-95.5703 118.8992,-30.2429 141.9314,398.2553 -155.7008,99.5638 -24.0966,116.246 -357.2117,106.7134 -257.9127,-360.1245 z",
	"Moray": "m 2559.5317,1125.9185 162.2724,-79.5385 296.8863,23.4015 64.6106,158.8785 -176.8847,57.1962 27.5389,153.5825 -181.1214,147.2273 -208.1307,37.6013 156.2304,-99.5639 0.5296,0 z",
	"Banff and Buchan": "m 3018.3095,1069.6206 428.4052,22.4688 65.9085,185.7421 -43.4397,79.3898 -95.8669,-73.3981 -230.6797,86.1304 z",
	"Gordon": "m 2933.3025,1439.2324 107.1013,70.1128 119.1588,-85.7944 207.0716,117.0405 102.7414,-183.5046 -96.3863,-73.3489 -0.5295,0 -229.5794,86.0592 -59.3146,-141.1371 -177.1495,56.9315 z",
	"West Aberdeenshire and Kincardine": "m 2521.1361,1739.4541 515.5605,-7.6791 159.9377,189.595 170.5295,-299.7507 -138.7538,-18.0062 45.2949,-115.3238 -114.2165,-65.1595 -119.4591,86.1304 -106.7268,-69.6533 -180.1249,147.1707 -208.5854,37.0735 z",
	"Aberdeen South": "m 3367.1638,1621.6193 15.0935,-54.0187 -138.4891,-4.5015 -15.3582,40.514 z",
	"Aberdeen North": "m 3366.7632,1540.7165 5.0555,26.4009 -127.3233,-3.9321 29.3967,-75.0832 z",
	"North East Fife": "m 3001.8323,2190.065 -220.1943,79.7643 -53.9251,93.2455 182.7463,50.1803 88.3757,16.1617 116.0904,-82.8191 -123.5784,-89.1263 z",
	"Angus": "m 2718.4102,1736.6738 85.2647,378.5279 219.2523,-20.1246 43.4267,42.3675 130.2804,-215.545 -160.9969,-190.6542 z",
	"Dundee East": "m 3066.8835,2137.4446 -144.0497,42.8972 3.7071,-76.7912 97.0113,-8.2291 z",
	"Dundee West": "m 2926.5618,2103.9346 -122.8294,10.8599 119.4591,65.534 z",
	"Ochil and South Perthshire": "m 2345.0458,2115.2017 156.7601,60.3738 118.6292,-81.5576 161.5774,175.4369 -54.6741,93.62 38.197,10.4854 -25.4646,54.2996 -60.2913,40.0694 -57.2955,-31.0818 -87.6283,72.2746 -37.448,-29.2094 -5.2428,-78.2664 -196.9765,-118.7102 z",
	"Perth and North Perthshire": "m 2164.4949,1846.6667 357.254,-106.7268 196.7117,-3.4385 84.1483,377.1696 119.4592,66.283 -139.6811,89.5008 -161.7754,-175.6312 -118.7102,81.2622 -156.9071,-60.2913 -167.3926,-19.0985 -86.8794,44.9376 11.9834,-130.6935 z",
	"Ross Skye and Lochaber": "m 1323.6793,1876.0819 136.9936,62.4856 -33.4386,6.2578 168.1954,146.2754 264.5073,-243.874 -244.4299,360.0644 0,0 486.8241,-196.2276 62.1637,-164.7712 -257.9536,-359.1901 334.7039,-334.7039 -415.2023,-538.06832 42.5903,219.58182 -74.3303,-18.03735 -31.7685,77.47915 -72.3506,-69.50739 -104.0245,64.11674 34.4837,266.39285 -57.5684,-35.0037 -14.0169,151.0802 102.7806,67.9363 -124.7301,89.9809 -97.0154,-68.3885 -29.5969,-284.3094 -74.3905,-71.5398 -35.2851,162.7043 -100.2308,-85.2241 -89.0323,155.5415 123.4324,41.677 123.4324,243.2483 112.4839,-28.63 -10.1985,138.7121 194.0492,-170.5878 -154.9394,386.4389 -166.1379,28.0899",
	"Argyll and Bute": "m 2103.0801,2011.8125 -488.322,196.2275 -87.0488,219.6241 -101.0808,74.3523 -87.2234,137.7 -4.1999,-57.1756 -172.708,71.7327 -40.5549,145.4451 48.5472,-12.1512 64.8558,-68.4335 11.7598,111.0718 -39.7102,57.6221 37.3769,18.2431 123.9032,-82.7011 -27.1312,-140.8262 61.9516,43.2781 112.0255,-216.3252 90.2497,-132.1915 -15.7282,97.9266 -52.1229,109.1249 20.6666,130.122 38.864,44.7341 -70.3203,107.7252 -18.5278,187.5137 -38.1249,27.9366 -4.5298,85.3283 108.7151,-10.3008 40.125,-60.6936 23.3273,-165.6785 17.7282,-88.6896 21.9275,-60.6936 48.5238,-24.2987 -6.4164,-52.6181 -31.6129,-62.4167 -9.216,-107.2102 186.756,-152.0039 -145.8138,192.9213 44.559,117.3322 121.3316,113.842 -19.8196,-129.5503 37.5723,3.4306 62.7686,-185.5423 12.3759,73.4206 112.3179,43.5117 5.9917,-116.8378 0,0 -116.8378,-297.3372 110.8461,-58.0444 z m -505.9079,133.2223 -148.3788,-77.6889 -72.7896,-125.2821 -125.2822,94.4865 104.9851,60.8913 -84.688,-17.4975 31.4956,40.5942 124.5822,-21.6969 -116.8833,93.7866 16.7976,17.4975 86.7876,-27.996 -5.5992,27.2961 -111.2841,13.2981 -84.688,-11.8983 -15.3978,30.7956 35.6949,-17.4975 11.1984,60.8914 181.2742,-31.4956 61.5912,-31.4955 -11.1984,31.4955 30.7956,12.5982 z"
},
"Northern Ireland": {
	"Newry and Armagh": "m 862.18035,3999.5 111.21491,149.3458 -3.17757,119.6884 182.18061,-52.9595 -43.4268,-252.0871 -81.5576,-76.2617 z",
	"South Down": "m 1126.9778,4066.2289 75.2024,-77.3208 347.4142,7.4143 -55.0778,131.3395 -123.9252,5.296 -102.7414,168.4111 -115.4517,-86.3239 z",
	"Strangford": "m 1334.647,3991.492 58.4189,-173.1876 38.9459,14.2302 21.3409,-56.5685 131.447,23.6143 30.588,104.6305 -35.0818,134.2878 -38.9459,-80.1388 5.2427,-101.1096 -56.9209,-48.6824 -8.9876,40.4438 40.4439,66.6575 -18.3495,79.0153 z",
	"North Down": "m 1389.6568,3764.3599 194.3613,34.9533 -29.6573,-73.6137 -88.972,-2.1184 z",
	"Belfast East": "m 1388.9466,3764.3792 -18.724,22.8433 22.6561,31.2691 39.1331,14.2303 21.1582,-56.5465 z",
	"Belfast South": "m 1376.5888,3866.4251 -48.6824,-35.7629 41.9417,-43.4397 22.8433,31.2691 z",
	"Belfast West": "m 1369.6609,3787.0353 -50.7421,-29.3967 -25.8391,29.0222 6.1789,45.3121 28.4605,-1.3107 z",
	"Belfast North": "m 1388.7594,3764.0048 -2.0597,-41.1929 -21.1581,-17.4133 -46.81,52.0528 51.1165,29.5839 z",
	"Lagan Valley": "m 1202.0811,3988.3183 -33.3288,-190.6103 126.9488,12.3578 3.5575,22.0943 28.2733,-1.3106 0.1872,0 49.0569,35.7628 -42.129,124.7019 z",
	"Upper Bann": "m 1168.8157,3797.7244 -35.4828,72.0249 -107.5078,-30.1869 1.5888,47.6635 81.5576,76.2616 17.7415,103.0062 75.2024,-78.1152 z",
	"Mid Ulster": "m 1025.8251,3839.0328 69.9066,-203.894 -23.3022,-182.1806 -203.36442,104.8597 -58.25543,252.6167 z",
	"South Antrim": "m 1168.8157,3797.1948 41.3084,-130.8099 -114.922,-31.2461 -3.5927,-32.1605 302.2055,29.584 -28.2547,73.0126 -72.5545,81.028 2.648,23.5669 z",
	"East Antrim": "m 1237.1335,3343.8616 156.76,289.1588 -28.3333,72.5545 21.4486,17.7414 115.4517,-83.9408 -157.2897,-341.059 z",
	"North Antrim": "m 1071.762,3454.3097 18.724,-250.9016 201.4703,15.7281 52.8017,79.3898 -107.4758,45.3121 156.9071,289.0986 -302.5799,-29.9584 z",
	"East Londonderry": "m 869.06508,3556.7587 -186.41737,-88.4423 181.65102,-249.4392 225.81277,-15.8436 -18.3495,250.1527 z",
	"West Tyrone": "m 869.06508,3556.7587 -264.7974,-125.2491 -76.99973,163.6046 -193.23172,31.4564 197.72549,143.8003 2.24688,135.5618 277.11526,-96.2414 z",
	"Foyle": "m 604.26768,3431.5096 59.31462,-98.5047 109.89092,10.3271 -91.09031,124.9844 z",
	"Fermanagh and South Tyrone": "m 449.46696,3710.0984 -266.72068,112.6997 290.59654,328.0446 158.77956,14.9792 148.29411,-253.1485 80.70467,86.8266 165.76314,-111.6481 -1.324,-48.8191 -214.75065,-29.1277 -276.71328,95.327 -2.64798,-135.0467 z"
},
"Republic of Ireland": {
	"Ireland": "m 1152.4284,4216.0591 124.9283,143.1762 -47.7254,130.543 145.9836,802.9099 -116.5062,272.3156 22.1081,62.4641 -139.3161,207.0441 74.0446,89.1343 -14.3878,54.042 -244.94368,-60.3586 -25.96825,68.7807 -68.78073,-75.7991 -21.05532,115.1025 -240.03077,8.4221 -121.41907,155.1076 -87.73054,-2.1055 -93.3453,132.6485 -115.80432,20.3535 -14.03688,-53.3402 -33.68853,98.2582 -645.69679,300.3894 50.5328,-129.1394 -224.59019,84.2214 43.51435,-60.3586 113.69878,-77.2029 -161.4242,65.9733 178.26846,-169.8463 -364.95905,123.5246 325.65577,-258.2787 -297.582,123.5246 -14.03686,-81.4139 -143.17618,-70.1845 353.72946,-235.8197 -387.41806,61.7623 28.0738,-98.2582 117.9098,-98.2582 247.04921,56.1476 -106.68034,-174.0574 162.82789,-33.6886 -2.80738,-89.8361 530.594318,-89.836 -168.442638,-95.4508 -95.45083,129.1393 -129.13936,11.2295 -72.99181,-39.3033 -224.59019,106.6804 247.04921,-196.5164 117.90985,-370.5738 174.05739,-22.4591 0,-78.6065 -320.04102,39.3033 -106.68034,-28.0738 56.14755,-123.5246 -101.06558,95.4508 -28.07378,-56.1475 33.68853,-50.5328 -190.90166,5.6147 67.37706,-72.9918 -78.60657,-67.377 134.75412,-11.2296 -61.76231,-44.918 179.67215,11.2295 -117.90984,-72.9918 22.45901,-84.2213 190.90166,-16.8443 -11.22951,-84.2213 -112.29509,-16.8443 -101.06558,39.3033 -50.5328,-112.2951 -95.45083,0 140.36887,-50.5328 50.53279,72.9918 -28.07377,-112.295 -5.61475,-61.7623 5.61475,-72.9919 -78.60657,123.5246 -5.61475,-174.0573 50.53279,-22.4591 101.06559,22.4591 -5.61476,-50.5328 303.19676,28.0737 72.99181,117.9099 44.91803,-123.5246 280.737739,72.9918 -101.065585,-123.5246 261.086096,-151.5984 30.88115,-101.0656 -336.88528,-16.8442 44.119978,-103.7288 146.898551,0 -83.374853,-55.5832 134.987854,-15.8809 -79.404619,-79.4047 67.493929,-27.7916 -59.553467,-43.6725 83.374857,-35.7321 11.91069,-103.226 202.48179,-15.8809 31.76185,35.732 43.67254,-107.1962 83.37485,-3.9702 55.58324,123.0771 -47.64278,87.3451 35.73208,-3.9702 -63.52369,95.2855 115.1367,-115.1367 -39.70231,-138.9581 3.97023,-67.4939 107.19624,-23.8214 -35.73208,-71.4641 127.04739,59.5534 131.01763,95.2856 -183.03553,150.27 -48.42726,-4.9129 -57.55124,98.2582 -77.20287,164.9334 -193.70904,30.8812 115.80432,83.5195 -266.70085,112.295 290.56355,327.7614 159.31867,14.7387 147.38731,-251.9621 81.41394,87.0287 110.89141,147.3873 -2.10554,122.1209 z"
}
};

});

define('state',[],function() {

var State = function(name, enter, leave) {
	this.name = name;
	
	if (enter) {
		this.enter = enter;
	} else {
		this.enter = function() {
			console.log("No enter() method has been defined for the state " + name);
		}
	}

	if (leave) {
		this.leave = leave;
	} else {
		this.leave = function() {
			console.log("No leave() method has been defined for the state " + name);
		}
	}
};

var StateMachine = function() {
	this.states = Array.prototype.slice.call(arguments);

	var setStateByName = function(stateName) {
		var stateFound = false;
		this.states.some(function(state, stateIndex) {
			if (state.name === stateName) {
				this.currentState = state;
				return stateFound = true;
			}
		}.bind(this));

		if (stateFound) {
			return true;
		} else {
			throw "" + stateName + " does not exist in this state machine.";
		}
	};

	this.start = function(stateName) {
		if (stateName) {
			setStateByName.call(this, stateName);
		} else {
			this.currentState = this.states[0];
		}
		
		this.currentState.enter();
	};

	this.transition = function(stateName, data) {
		var previousState = this.currentState.name;
        this.currentState.leave(stateName);
		setStateByName.call(this, stateName);
        this.currentState.enter(data, previousState);
	};

	this.isInState = function(stateName) {
		return (this.currentState.name === stateName);
	};
};

return {
	State: State,
	StateMachine: StateMachine
}

});
define('states',[
	'color-scale-key',
	"configuration",
	"state",
	"svg-js"
],
function(
	ColorScaleKey,
	Configuration,
	StateUtilities,
	SVG
) {

return function(chart, data, key) {

var Neutral = new StateUtilities.State("Neutral");
Neutral.enter = function() {
};
Neutral.leave = function() {

};

var AreaActive = new StateUtilities.State("AreaActive");
AreaActive.enter = function() {
};
AreaActive.leave = function() {
};

var ShowingZoomRegion = new StateUtilities.State("ShowingZoomRegion");
ShowingZoomRegion.enter = function() {
};
ShowingZoomRegion.leave = function() {
};

var ShowingZoomRegionAndAreaActive = new StateUtilities.State("ShowingZoomRegionAndAreaActive");
ShowingZoomRegionAndAreaActive.enter = function() {
};
ShowingZoomRegionAndAreaActive.leave = function() {
};

return new StateUtilities.StateMachine(
	Neutral,
	AreaActive,
	ShowingZoomRegion,
	ShowingZoomRegionAndAreaActive
);

};

});
define('renderer',[
	"chart",
	"classList",
	"color",
	"configuration",
	"key",
	"mapper",
	"map-data/constituencies",
	"number",
	"scale",
	"states",
	"utilities"
],
function(
	Chart,
	classList,
	Color,
	Configuration,
	Key,
	HtmlTable,
	mapData,
	NumberUtils,
	Scale,
	States,
	Utilities
) {

return function(left, top, width, height, options, table, chart) {

	/*
	 * Set up the chart layout regions. Needs to be called with the layout definition object as the context
	 */
	function configureLayout(keyBBox) {
		var layout = this;

		if (layout.keyOrientation == "vertical") {
			layout.drawRegions.keyArea.width = keyBBox.width + 2 * Configuration.KEY_AREA_PADDING;
			layout.drawRegions.keyArea.height = height;
			layout.drawRegions.keyArea.x = left;
			layout.drawRegions.keyArea.y = top;

			layout.drawRegions.mapArea.width = width - layout.drawRegions.keyArea.width;
			layout.drawRegions.mapArea.height = height;
			layout.drawRegions.mapArea.x = layout.drawRegions.keyArea.width;
			layout.drawRegions.mapArea.y = top;
		} else {
			layout.drawRegions.keyArea.width = width;
			layout.drawRegions.keyArea.height = keyBBox.height;
			layout.drawRegions.keyArea.x = left;
			layout.drawRegions.keyArea.y = top + height - keyBBox.height;

			layout.drawRegions.mapArea.width = width;
			layout.drawRegions.mapArea.height = height - layout.drawRegions.keyArea.height;
			layout.drawRegions.mapArea.x = left;
			layout.drawRegions.mapArea.y = top;
			if (options.keyType == "scalar") {
				layout.drawRegions.keyArea.height += 2 * Configuration.KEY_AREA_PADDING;
				layout.drawRegions.keyArea.y -= 2 * Configuration.KEY_AREA_PADDING;
				layout.drawRegions.mapArea.height -= 2 * Configuration.KEY_AREA_PADDING;
			}
		}
	}

	/*
	 * Determine whether the key should be vertical or horizontal
	 */
	function getKeyOrientation() {
		var keyOrientation;
		
		if (width > Configuration.SMALL_BREAKPOINT && options.keyType == "scalar") {
			keyOrientation = "vertical";
		} else {
			keyOrientation = "horizontal";
		}

		return keyOrientation;
	}

	/*
	 * Draw the invisible area behind the chart to allow click handlers on background
	 */
	function drawBackground(chart) {
		var background = chart.rect(
			width,
			height
		);
		background.move(
			left,
			top
		);
		background.attr({
			"opacity": "0"
		});

		return background;
	}

	/*
	 * Function to pass to HtmlTable.map() method, mapping row data to a new JSON array
	 */
	var dataTableMapper = function(rowObject, rowIndex, headerRowObject) {
		var value = parseFloat(rowObject[1].replace(/,([0-9]{3})/g, "$1"));

		return {
			title: rowObject[0],
			value: value
		};
	}

	var multiMeasureDataTableMapper = function(rowObject, rowIndex, headerRowObject) {
		var dataItem = {
			title: rowObject[0],
			majority: {},
			values: {}
		};

		var rowObjectIndex = 1;
		while(rowObject[rowObjectIndex]) {
			dataItem.values[headerRowObject[rowObjectIndex]] = parseFloat(rowObject[rowObjectIndex].replace(/,([0-9]{3})/g, "$1"));
			rowObjectIndex++;
		}

		for (key in dataItem.values) {
			if (Object.keys(dataItem.majority).length === 0
					|| dataItem.values[key] > dataItem.majority.value) {
				dataItem.majority.title = key;
				dataItem.majority.value = dataItem.values[key];
			}
		}

		return dataItem;
	}

	/*
	 * Get the scheme for layout definition object
	 */
	function getLayoutSchema() {
		return {
			drawRegions: {
				mapArea: {
					width: 0,
					height: 0,
					x: 0,
					y: 0
				},
				keyArea: {
					width: 0,
					height: 0,
					x: 0,
					y: 0
				}	
			}
		};
	}

	/*
	 *	Draw the chart with the aid of utility functions above
	 */
	var drawChart = function() {

		var dataTable = new HtmlTable(table);

		var chartDescription = {};

		var rows;
		if (dataTable.keys.length > 2) {
			options.keyType = "non-scalar";
			rows = dataTable.mapRows(multiMeasureDataTableMapper);
			chartDescription.groups = Utilities.getGroupsFromKeys(dataTable.keys);
			chartDescription.colorClasses = Utilities.collateColorClasses(chartDescription.groups, options);
			chartDescription.colorGroupMap = Utilities.buildColorGroupMap(
				chartDescription.groups, chartDescription.colorClasses
			);
		} else {
			options.keyType = "scalar";
			rows = dataTable.mapRows(dataTableMapper);
		}

		chartDescription.layout = getLayoutSchema();
		chartDescription.layout.keyOrientation = getKeyOrientation();

		var background = drawBackground(chart);

		var keySize;
		if (chartDescription.layout.keyOrientation == "horizontal") {
			keySize = Math.min(
				Configuration.MAX_KEY_WIDTH,
				width - Configuration.KEY_AREA_PADDING * 2
			);
		} else {
			keySize = Math.min(
				Configuration.MAX_KEY_HEIGHT,
				height - Configuration.KEY_AREA_PADDING * 2
			);
		}

		var scale = Utilities.createScale(
			rows,
			options.targetNumberOfIncrements,
			keySize
		);

		chartDescription.chart = chart;
		chartDescription.height = height;
		chartDescription.keyType = options.keyType;
		chartDescription.width = width;

		var key = Chart.drawKey(
			chartDescription,
			rows,
			scale,
			options.keyType
		);
		var keyBBox = key.bbox();

		configureLayout.call(chartDescription.layout, keyBBox);

		var stateMachine = States(chart, rows, key);
		stateMachine.start("Neutral");

		Chart.positionKey(chartDescription, key, keyBBox);

		//Utilities.drawTestRegions(chart, chartDescription.layout);

		var map = Chart.drawMap(
			chartDescription,
			key,
			mapData,
			rows,
			scale,
			stateMachine
		);

		Utilities.applyBorderFilter(chart, map);

		background.on("click", function() {
			Chart.reset(chartDescription, key, map, stateMachine);
		});

		table.classList.add("fm-hidden");

	}

	drawChart();
}

});
define('svg-builder',[
	"renderer",
	"configuration"
],
function(
	renderer,
	Configuration
) {

function attributeToCamelCase(attribute) {
	return attribute.split("-").map(function(part, index) {
		if (index === 0) {
			return part;
		}
		else {
			return part.charAt(0).toUpperCase() + part.substr(1);
		}
	}).join("");
}

if (! (window.addEventListener && window.document.createEvent)) {
	return;
}

function drawPoweredByFactmint(previousSibling, width) {
	var link = document.createElement('div');
	link.className = 'fm-powered-by-factmint';
	link.innerHTML = 'Powered by <a style="color: #527a92" href="http://factmint.com/charts">Factmint</a>';
	link.style.fontSize = '8px';
	link.style.lineHeight = '12px';
	link.style.width = width;
	link.style.textAlign = 'center';
	link.style.fontFamily = 'Lato, sans-serif';

	previousSibling.parentNode.insertBefore(link, previousSibling.nextSibling);
}

var resizeFinishedEvent = window.document.createEvent("Event");
resizeFinishedEvent.initEvent("resizefinished", false, false);

var debounceTimeout = null;

var debounce = function() {
	clearTimeout(debounceTimeout);
	debounceTimeout = setTimeout(function() {
		window.dispatchEvent(resizeFinishedEvent);
	}, Configuration.DEBOUNCE_TIMEOUT);
	return debounceTimeout;
};
window.addEventListener("resize", debounce, false);

return function(table) {

	var drawSVGNode = function(redraw) {
		var configObject = table.getAttribute('data-fm-config');
		var options = (configObject && window[configObject]) ? window[configObject] : {};
		var dataOptions = [].filter.call(table.attributes, function(attribute) {
			if (attribute.name === 'data-fm-config') {
				return false;
			} else {
				return /^data-fm-/.test(attribute.name);	
			}
		}).forEach(function(dataAttribute) {
			var optionKey = dataAttribute.name.replace(/^data-fm-/, '');
			optionKey = attributeToCamelCase(optionKey);
			options[optionKey] = dataAttribute.value;
		});

		var svgNode = document.createElementNS("http://www.w3.org/2000/svg", "svg");
		svgNode.className.baseVal += "fm-unrendered-chart fm-chart";

		table.parentElement.insertBefore(svgNode, table);

		var lengthRegex = /([0-9]+)(px|%|rem|em|ex|ch|vw|vh|vmin|vmax|mm|cm|in|pt|pc)/;

		function setWidth() {
			var width = {};
			if (! options.width) {
				width.value = 100;
				width.units = "%";
			} else {
				options.width.replace(lengthRegex, function(match, length, units) {
					width.value = parseFloat(length);
					width.units = units;
				});
			}
			return width;
		}

		function setHeight() {
			var height = {};
			if (! options.height) {
				var optimalHeight = svgNode.getBoundingClientRect().width / Configuration.ASPECT_RATIO;
				height.value = Math.min(Configuration.MAX_HEIGHT, optimalHeight);
				height.units = "px";
			} else {
				options.height.replace(lengthRegex, function(match, length, units) {
					height.value = parseFloat(length);
					height.units = units;
				});
			}
			return height;
		}

		var width = setWidth();
		svgNode.style.width = (width.value) + width.units;

		var height = setHeight();
		svgNode.style.height = (height.value) + height.units;

		var boundingBox = svgNode.getBoundingClientRect();

		var primaryWidth = boundingBox.width;
		var primaryHeight = boundingBox.height;

		if (! options.disableSpillover) {
			var totalHeight = Configuration.SPILLOVER_TOP + Configuration.SPILLOVER_BOTTOM + primaryHeight;
			var totalWidth = Configuration.SPILLOVER_LEFT + Configuration.SPILLOVER_RIGHT + primaryWidth;

			var verticalSpilloverProportion = totalHeight / primaryHeight;
			var horizontalSpilloverProportion = totalWidth / primaryWidth;

			svgNode.style.height = (height.value * verticalSpilloverProportion) + height.units;
			svgNode.style.width = (width.value * horizontalSpilloverProportion) + width.units;

			svgNode.style.margin = 
				"-" + Configuration.SPILLOVER_TOP + "px " + 
				"-" + Configuration.SPILLOVER_RIGHT + "px " + 
				"-" + Configuration.SPILLOVER_BOTTOM + "px " + 
				"-" + Configuration.SPILLOVER_LEFT + "px";
		}

		boundingBox = svgNode.getBoundingClientRect();
		var nodeWidth = boundingBox.right - boundingBox.left;
		var nodeHeight = boundingBox.bottom - boundingBox.top;

		//svgNode.setAttribute("viewBox", "0 0 " + nodeWidth + " " + nodeHeight);

		var chart = SVG(svgNode);

		// Ensure SVG.js doesn't automatically assign incorrect width/height attributes
		svgNode.removeAttribute("width");
		svgNode.removeAttribute("height");

		renderer(
			Configuration.SPILLOVER_LEFT,
			Configuration.SPILLOVER_TOP,
			primaryWidth,
			primaryHeight,
			options,
			table,
			chart
		);

		svgNode.className.baseVal.replace("fm-unrendered-chart", "");

		drawPoweredByFactmint(svgNode, width.value + width.units);

		return svgNode;
	}

	var svgNode = drawSVGNode();

	window.addEventListener("resizefinished", function() {
		svgNode.parentNode.removeChild(svgNode);
		svgNode = drawSVGNode();
	}, false);

}
	
});
require.config({
	paths: {
		// Vendor
		"classList": "../../node_modules/classList/classList",
		"path": "../../node_modules/paths-js/dist/amd/path",
		"svg-js": "../../node_modules/svg.js/dist/svg",
		// Factmint Charts API
		"center": "../../../factmint-charts/etc/center",
		"circle-segment": "../../../factmint-charts/inventions/circle-segment",
		"color": "../../../factmint-charts/utilities/color",
		"color-scale-key": "../../../factmint-charts/components/color-scale-key",
		"configuration-builder": "../../../factmint-charts/utilities/configuration-builder",
		"doughnut-segment": "../../../factmint-charts/inventions/doughnut-segment",
		"flow": "../../../factmint-charts/inventions/flow",
		"float": "../../../factmint-charts/etc/float",
		"geometry": "../../../factmint-charts/utilities/geometry",
		"grid": "../../../factmint-charts/etc/grid",
		"key": "../../../factmint-charts/components/key",
		"mapper": "../../../factmint-charts/utilities/mapper",
		"multi-measure-tooltip": "../../../factmint-charts/components/multi-measure-tooltip",
		"number": "../../../factmint-charts/utilities/number",
		"scale": "../../../factmint-charts/utilities/scale",
		"state": "../../../factmint-charts/utilities/state",
		"tooltip": "../../../factmint-charts/components/tooltip",
		"tooltip-background": "../../../factmint-charts/inventions/tooltip-background",
		"G.unshift": "../../../factmint-charts/extensions/G.unshift"
	}
});

require(['svg-builder'], function(buildSVG) {
	// This is at the top to distance if from the throw - to make it as harder to reverse engineer
	/**
	 * Check origin is Factmint.io
	 */
	var checkDrm = function() {
		var verified = false;
		var scriptTags = document.querySelectorAll('script');
		
		for (var scriptNumber = 0; scriptNumber < scriptTags.length; scriptNumber++) {
			var src = scriptTags[scriptNumber].getAttribute('src');
			if (src) {
	 			var offset = (src[4] == 's') ? 1 : 0;
				if (src[7 + offset] == 'f' && src[16 + offset] == 'i' && src[9 + offset] == 'c' && src[15 + offset] == '.') {
					verified = true;
					break;
				}
			}
		}
		
		return verified;
	};
	
	/**
	 * Check if the browser supports SVG
	 */
	function supportsSvg() {
		return !! document.createElementNS &&
			!! document.createElementNS("http://www.w3.org/2000/svg","svg").createSVGRect;
	}

	/**
	 * Check the browser returns correct SVG getBoundingClientRect() values (see https://bugzilla.mozilla.org/show_bug.cgi?id=479058)
	 */
	function supportsGetBoundingClientRectForSvg() {
		var testWidth = 500;

		var testSvgNode = document.createElementNS("http://www.w3.org/2000/svg", "svg");
		testSvgNode.style.width = "" + testWidth + "px";
		document.body.appendChild(testSvgNode);

		var testSvgNodeBoundingClientRect = testSvgNode.getBoundingClientRect();
		testSvgNode.parentNode.removeChild(testSvgNode);
		if (testSvgNodeBoundingClientRect.width === testWidth) {
			return true;
		} else {
			return false;
		}
	}

	/**
	 * Check if we are in preview mode
	 */
	function inPreviewMode() {
		return window['factmint'] && window['factmint'].previewVisualizations;
	}
	
	var tables = document.querySelectorAll('table.fm-choropleth-uk-constituencies');

	if (! supportsSvg()) {
		console.log("SVG not supported: visualizations disabled");
	} else if (! supportsGetBoundingClientRectForSvg()) {
		console.log("Your browser does not correctly support getBoundingClientRect() for SVG elements: visualizations disabled");
	} else {
		if(! checkDrm()) throw 'Licence error'; // This check will be un-commented by the grunt release task
		for (var tableIndex = 0; tableIndex < tables.length; tableIndex++) {
			if (inPreviewMode() || ! tables[tableIndex].hasAttribute('data-fm-rendered')) {
				tables[tableIndex].setAttribute('data-fm-rendered', 'true');
				
				try {
					buildSVG(tables[tableIndex]);
				} catch(exception) {
					console.log('ERROR: chart rendering failed');
					if (exception instanceof Error) {
						console.log(exception.stack);
					} else {
						console.log(exception);
					}
				}				
			}
		}
	}
});
define("main", function(){});


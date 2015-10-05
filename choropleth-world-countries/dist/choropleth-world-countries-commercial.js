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
	ASPECT_RATIO: 1.5/1,
	MAX_HEIGHT: 10000,
	SMALL_BREAKPOINT: 500,
	MAP_AREA_PADDING: 0.2,
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
	THUMBNAIL_MAP_SCALE_FACTOR: 0.2,
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
		
	var minValue = Math.min
		.apply(Math, rows.map(function(row) {
			return row.value
		}));

	return Scale()
		.withIncrements(targetNumberOfIncrements)
		.project(new Scale().domains.RealNumbers(minValue, maxValue))
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
		var currentRegionBBox = currentRegion.bbox();
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

	tooltipDescription.arrowPosition = arrowPosition;
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

	if (includeZoomIcon) {
		var zoomIcon = Utilities.drawZoomIcon(chartDescription.chart, "white", 0.14);

		var tooltip = Tooltip(
			chartDescription.chart,
			tooltipDescription.title,
			tooltipDescription.arrowPosition,
			zoomIcon
		)
			.move(
				tooltipDescription.arrowLeftPoint,
				tooltipDescription.arrowTopPoint
			);
	} else {
		var tooltip = Tooltip(
			chartDescription.chart,
			tooltipDescription.title,
			tooltipDescription.arrowPosition
		)
			.move(
				tooltipDescription.arrowLeftPoint,
				tooltipDescription.arrowTopPoint
			);
	}

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

	tooltipDescription.arrowPosition;
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
		tooltipDescription.title,
		tooltipDescription.values,
		chartDescription.colorClasses,
		tooltipDescription.arrowPosition
	)
		.move(
			tooltipDescription.arrowLeftPoint,
			tooltipDescription.arrowTopPoint
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
		var areaPath = chartDescription.chart.path(pathString);
		
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
					area.values = rowItem.values;
						
					if (rowItem.colorOverride) {
						area.attr({
							fill: rowItem.colorOverride
						});
					} else {
						area.addClass(chartDescription.colorGroupMap[rowItem.majority.title]);
					}
				}
			});
		}
	}

	/*
	 * Draw all areas from the paths in the supplied data object
	 */
	function drawMapAreas() {
		var areas = {};
		for (var mapDataKey in mapData) {
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
				for (var groupAreaKey in mapData[mapDataKey]) {
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
						if (rowItem.value >= tickMark.value && rowItem.value < tickMarks[tickMarkIndex + 1].value) {
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

	// Workaround for inaccurate SVG bounding box (if there were no error, these value would be 2)
	var halfWidthDivisorAccountingForBBoxError = 2.2;
	var halfHeightDivisorAccountingForBBoxError = 1.5;

	map.translateX = chartDescription.layout.drawRegions.mapArea.x
		+ chartDescription.layout.drawRegions.mapArea.width / 2
		- map.boundingBox.width / halfWidthDivisorAccountingForBBoxError;

	map.translateY = chartDescription.layout.drawRegions.mapArea.y
		+ chartDescription.layout.drawRegions.mapArea.height / 2
		- map.boundingBox.height / halfHeightDivisorAccountingForBBoxError;

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
			return {
				value: increment
			};
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
		var inaccurateBBoxCompensationFactor = 0.9;
		
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
define('map-data/countries-with-continents',[],function() { return {
"Africa": {
"Algeria": "m 5034.329,2583.6377 -158.9562,6.2958 -137.146,57.9805 24.5301,99.7932 -75.8205,15.6101 7.2476,26.2027 -141.7905,73.2684 0.7884,48.8826 363.4661,264.124 44.9405,-13.4033 172.6661,-130.8794 -47.0303,-34.8796 -24.7168,-58.5493 14.586,-10.6438 -12.6149,-117.0818 -60.3149,-127.3314 27.9893,-21.6818 z",
"Angola": "m 5149.2348,3952.3983 113.5339,-1.5769 29.1719,68.5934 52.8248,-3.9421 5.519,-33.1141 66.2281,14.9802 11.038,118.2645 54.4016,-6.3075 -6.3074,62.286 -56.7669,0.7884 2.3652,100.919 29.4764,49.7329 -320.4069,-18.1957 37.8446,-140.3405 22.8645,-44.9405 -25.2298,-71.7471 10.2496,-9.4612 z m 19.3851,-39.7864 -17.0039,14.4951 -5.2963,14.7738 -10.5925,-23.694 25.3664,-12.265 z",
"Benin": "m 4848.0546,3571.9809 28.3835,-2.7595 0.7884,-80.4198 28.7777,-47.7 -10.2496,-32.7199 -21.3552,-23.633 -53.9398,44.1322 16.557,32.3257 z",
"Botswana": "m 5362.5917,4547.8877 28.4723,70.2455 62.4404,-53.5204 60.2105,18.9552 107.0407,-121.5359 -112.4867,-135.2229 -42.4796,22.5635 -25.2297,-12.2207 -49.2769,5.1248 -0.3942,114.7165 -28.7777,0.3943 z",
"Burkina Faso": "m 4801.5852,3304.2612 72.8142,80.3721 -53.1514,43.8534 -105.6496,-0.3942 1.1827,51.6422 -7.8843,-18.9224 -39.0273,11.0381 -24.8356,-26.8067 36.662,-96.9768 z",
"Burundi": "m 5616.8531,3851.2864 4.4601,11.7076 -2.2301,49.6179 50.4542,-47.1091 -4.7388,-23.4152 -17.5614,0.5575 -6.6901,11.9863 z",
"Cameroon": "m 5042.0083,3620.8636 33.9025,38.2388 1.5769,42.5752 175.0314,9.4612 -46.5174,-130.0909 31.5372,-44.1521 -41.7868,-74.9008 43.3637,-3.9422 -13.4033,-68.5934 -43.3637,-45.7289 28.3835,66.2281 -26.0182,18.1339 -70.1702,145.8595 -26.4124,-29.9603 z",
"Cape Verde": "m 4126.6414,3296.819 0.3942,4.7305 5.519,4.7306 0.3942,-5.519 z m 25.6239,-29.9604 -1.5768,3.9422 3.5479,-0.3942 z m -43.7578,35.4794 -2.7595,2.3653 3.1537,1.5768 z m -21.6818,-68.9876 -4.7306,7.0958 7.0959,-3.1537 z m 1.971,6.7016 -1.5768,1.9711 3.5479,2.7595 z m 11.0381,8.2785 11.8264,1.9711 -7.8843,1.1826 -1.1826,3.1538 z m 52.4305,-0.7884 -2.3652,0 0.7884,3.5479 z",
"Central African Republic": "m 5238.3079,3537.1329 206.834,-106.4833 22.3001,45.1578 -3.345,22.8577 103.6958,110.3858 -141.0486,31.2202 -77.493,-31.2202 -18.119,52.6842 -64.3916,-0.2788 -13.3801,47.3878 -47.3879,-128.2259 z",
"Chad": "m 5220.9819,3048.0694 14.1917,194.7421 -53.6132,99.3422 45.7289,48.8826 13.4033,67.805 -44.152,3.9421 41.7867,74.1124 207.3571,-107.2264 -29.1719,-65.4397 31.5372,-85.1504 28.3834,0 -1.5768,-119.8413 -224.7025,-125.3604 z",
"Comoros": "m 6020.4497,4123.0933 -1.1827,12.2207 4.7306,1.9711 z m 22.2731,14.586 -3.6465,2.6609 5.1248,3.1538 z m -10.9395,7.0959 -5.0262,-2.0697 1.4783,2.8581 z",
"Democratic Republic of the Congo": "m 5149.0376,3951.6098 113.9282,-0.5913 28.5806,67.4108 52.8248,-2.9566 5.519,-33.5083 67.0165,15.3744 10.395,117.3683 54.0779,-6.6901 160.5612,80.8381 -3.345,-45.1578 -12.8226,9.4775 -27.3177,-23.9726 16.7251,-97.5632 43.4853,-8.3626 -41.8128,-73.5905 3.9025,-87.5282 -7.805,-19.5126 22.8576,-39.304 10.0351,-62.1617 37.3528,-39.5828 -16.1676,-8.3626 -0.5575,-35.1227 -31.2202,-30.1053 -41.8128,8.9201 -25.0877,-27.8752 -141.6061,31.2202 -77.493,-31.2202 -93.1032,271.5045 -46.8303,41.2553 -3.3451,-17.8402 -32.8927,12.8226 -4.46,-3.345 -16.1676,13.9376 -6.3297,14.7878 z",
"Djibouti": "m 5978.1157,3405.5619 0.5575,26.7602 31.2203,-3.9025 8.92,-15.6101 -25.6452,-3.9025 30.1053,-16.1677 -10.5926,-17.2826 z",
"Egypt": "m 5500.086,2756.3503 3.1537,323.2563 255.4513,4.7305 47.3058,-37.8446 -97.7653,-219.1835 7.8843,-9.4611 44.152,72.5355 23.279,-50.6881 -15.6101,-56.8654 -7.2475,-3.9025 -60.768,6.1325 -21.7426,-16.7251 -59.653,26.7602 z",
"Equatorial Guinea": "m 5076.6992,3703.2545 -14.9801,37.0562 56.7669,-0.7884 -1.5768,-35.4794 z",
"Eritrea": "m 5886.4166,3208.909 -40.9983,33.1141 -15.7686,85.1504 91.4578,-9.4612 78.843,68.6413 12.6149,-10.2975 -74.1124,-72.5355 -18.9223,-6.3074 z",
"Ethiopia": "m 5828.8612,3325.5966 -65.4396,147.4364 -3.1538,34.6909 -26.8066,-1.5769 -4.7305,21.2877 26.8066,8.6727 68.6098,106.3192 90.653,24.5601 37.0562,-29.9603 11.038,12.6149 103.2843,-31.5372 85.1504,-96.9769 -104.0727,-23.6529 -43.3637,-57.5554 5.5191,-10.2495 -30.7488,2.3653 -0.7884,-27.5951 22.076,-18.1339 -78.843,-68.5934 z",
"Gabon": "m 5170.2924,3708.2866 1.6725,24.5302 23.9727,-7.2476 10.035,20.6277 -12.265,9.4776 -2.7876,20.6276 17.2827,12.2651 -9.4776,56.3079 -32.8927,-2.23 -15.0527,-17.2826 -3.345,18.9551 -21.7426,-2.23 7.2475,38.4678 -20.6276,5.575 -63.5555,-90.3156 22.8577,-54.6354 46.2728,-2.2301 -1.115,-34.5652 z",
"Ghana": "m 4722.6943,3612.9793 18.1339,7.8843 89.4867,-41.3926 -16.557,-23.6529 -15.1772,-127.9227 -81.7996,0.1971 0.3942,53.6132 10.2496,29.5661 -22.0761,43.3637 z",
"Guinea": "m 4374.2083,3428.0925 55.1901,58.3438 21.2876,-25.2297 31.5372,-0.7885 18.9223,52.0364 26.0182,-5.519 4.7306,39.4215 35.4793,-11.8265 -0.7884,-26.8066 16.557,3.9422 -9.9366,-63.1764 -28.7115,-63.8342 -93.9394,4.1813 -21.4639,-10.8713 -18.9552,1.3937 -2.5087,27.3177 -28.7115,4.4601 -5.0175,18.3976 z",
"Guinea-Bissau": "m 4410.8703,3378.8156 -3.5479,27.2009 -28.3835,5.519 -3.9421,15.7686 -13.4033,-12.6149 10.2495,-13.4033 -35.4793,-3.5479 -3.5479,-15.7686 z",
"Ivory Coast": "m 4585.4707,3636.3686 71.3605,-29.5477 63.5554,4.46 -15.6101,-55.7504 22.3002,-45.1578 -18.9552,-49.6179 -38.4677,11.1501 -25.0877,-27.3177 -70.2455,2.7875 9.4775,64.113 -16.1676,-3.345 1.6725,63.5554 22.3002,21.1852 z",
"Kenya": "m 5971.9832,3818.1149 -65.228,93.1032 -148.2961,-113.7308 -1.115,-36.7953 32.8928,-53.5204 -34.0078,-61.8829 13.9376,-18.3977 144.9511,40.6978 36.7952,-30.6627 10.5926,12.8226 13.3801,-3.345 -20.6276,41.8128 1.6725,107.0408 z",
"Lesotho": "m 5604.9472,4671.052 -44.9405,35.0851 28.7777,38.6331 43.3636,-48.8826 z",
"Liberia": "m 4476.1999,3554.973 107.5982,80.2806 7.2476,-42.3703 -21.7426,-20.6277 -2.2301,-37.9102 -34.5652,12.8226 -5.0176,-40.6978 -26.2026,5.575 z",
"Libya": "m 5475.6447,3159.238 -225.4909,-125.3604 -51.2479,26.0182 -64.6513,-29.1719 -46.5173,-33.9025 -25.2298,-58.3438 14.9802,-11.038 -12.6149,-115.8992 23.6529,-20.4991 -6.3074,-24.4414 41.7867,-31.5372 -1.5768,-21.2876 104.0727,28.3835 7.8843,29.1719 105.6496,37.8446 31.5372,-26.0181 -11.8265,-31.5372 50.4595,-29.9604 89.0926,31.5372 3.9421,389.4843 -28.3834,0 z",
"Madagascar": "m 6218.4,4236.8004 -92.5457,317.7773 -57.9804,21.1852 -52.4054,-113.7308 41.2553,-74.7056 -13.3801,-107.0407 90.3157,-33.4503 59.0954,-104.8107 z",
"Malawi": "m 5788.0069,4129.2022 -22.3002,-62.998 -31.7777,-2.7875 10.5925,33.4502 -21.1851,95.3332 23.9727,28.4327 25.0876,-1.6725 -7.2475,43.4853 27.3177,40.6978 1.115,-28.4327 14.4951,-7.805 4.46,-39.5828 -29.5477,-41.2553 z",
"Mali": "m 4478.0357,3386.9392 66.7372,-2.0049 27.8752,63.5554 73.033,-3.345 35.6803,-97.0057 121.5358,-44.6003 104.8108,-13.9376 8.94,-113.8061 -266.4893,-193.9537 -38.633,0.7884 30.7487,305.9107 -166.3586,-3.9421 -19.7108,28.3835 z",
"Mauritania": "m 4315.1717,3101.9135 23.5573,154.3013 52.0364,-3.1537 65.4396,60.7091 18.9223,-29.1719 166.3587,3.1537 -29.9603,-304.3339 37.0562,-0.7884 -96.1884,-70.1703 0.7884,39.4215 -95.4,0 0,82.7852 -31.5372,14.9801 3.1537,52.8248 z",
"Mauritius": "m 6426.0968,4395.4958 -6.8988,11.6294 4.7306,2.5624 3.745,-5.9133 z",
"Morocco": "m 4738.4629,2647.547 -77.2661,-5.519 -18.1339,-18.1339 -12.6149,3.1538 -29.1719,63.8628 -70.1703,35.4793 -4.7305,89.0926 -100.919,81.9967 126.1487,-1.5769 0,-33.9025 141.9174,-72.5355 -7.8843,-26.8066 76.4777,-15.7686 z",
"Mozambique": "m 5725.0089,4615.9032 3.345,-16.1676 -12.8226,-12.2651 83.0681,-62.998 -21.1851,-137.146 164.4637,-137.7035 -2.7875,-154.4286 -151.6411,34.5653 -3.9026,56.3079 30.1052,41.2553 -5.0175,40.1403 -14.4951,7.2475 -0.5575,30.6627 -27.8752,-42.3703 6.69,-44.6003 -25.0876,2.7875 -25.1389,-29.2723 -69.0793,59.3775 76.9355,38.4678 -14.4951,146.6236 -32.8927,34.0077 22.8577,143.2786 z",
"Namibia": "m 5130.3125,4305.6148 376.9312,21.2818 -41.0602,22.0819 -27.595,-11.8265 -47.3058,4.7306 0,115.1107 -29.1719,0.7885 0,208.1454 -24.4413,17.3455 -78.0546,-14.9802 -32.3256,-56.7669 -19.7107,-141.1289 z",
"Niger": "m 4801.2247,3304.6537 95.3332,104.2533 29.5477,-68.0155 145.8631,32.7994 110.3801,-30.7488 52.6141,-101.8439 -13.9376,-192.3388 -21.7427,12.265 -65.7855,-29.5477 -172.2687,132.1285 -44.6003,11.7076 -8.3626,114.8458 z",
"Nigeria": "m 5182,3343.679 28.4327,67.458 -25.0877,15.6101 -70.2455,146.6235 -26.7602,-29.5477 -47.3878,78.6081 -79.1656,12.2651 -30.1052,-59.6529 -55.7504,-4.4601 1.6725,-82.5106 28.9902,-46.2728 -9.4776,-34.0077 28.4327,-66.9005 146.0661,33.4502 z",
"Republic of the Congo": "m 5112.5907,3886.6879 22.5789,31.7777 26.2027,-12.8225 11.7076,11.7075 32.8927,-14.4951 3.9026,17.8402 45.1578,-39.5828 75.5418,-219.6566 -63.8342,-0.5575 -13.3801,50.1753 -84.1831,-3.6237 3.345,24.2514 22.8577,-7.2476 11.1501,22.3002 -13.3801,8.9201 -2.2301,20.0701 17.2827,12.8226 -9.4776,56.3079 -32.3352,-1.6725 -15.6102,-16.7251 -3.345,18.3976 -21.7426,-3.345 7.2475,39.5828 z",
"Rwanda": "m 5657.8874,3803.2697 -22.1915,0.5096 -22.8644,38.2388 3.5479,8.2785 24.4413,4.3364 5.9133,-12.2207 18.1338,-0.3942 z",
"Sao Tome and Principe": "m 4985.3404,3758.3226 -2.23,2.0907 -0.2787,5.0175 3.4844,-3.4844 z m 23.2758,-37.6315 -0.5575,1.9513 0.8363,-0.4182 z",
"Senegal": "m 4338.4964,3256.4296 -28.154,54.0779 22.8577,30.6627 41.2553,-6.1325 35.6802,10.8713 -4.7387,10.0351 -35.1228,-5.8538 -44.3216,13.9376 6.9688,18.1189 96.4482,-3.9026 20.3489,9.4776 27.5965,-1.8638 -21.7427,-71.7267 -65.5067,-60.768 z",
"Seychelles": "m 6403.6265,3901.1504 8.6728,11.038 0.7884,-7.8843 -3.9422,-3.1537 0.7885,-5.9133 -3.1538,4.3364 z m 28.3835,-27.5951 2.7595,5.519 2.7595,0 -0.7884,-2.7595 z m -35.8736,16.5571 -1.971,3.1537 3.5479,1.5768 0.7884,-1.971 z",
"Sierra Leone": "m 4474.8061,3554.1368 -39.8615,-27.3177 -5.8538,-40.1403 21.1851,-25.924 31.8474,-0.2787 19.0249,52.1266 z",
"Somalia": "m 6019.0923,3412.8095 -15.0526,26.4814 44.3992,58.5776 104.0728,24.0471 -86.8678,96.6129 -89.7582,27.8752 -20.6276,41.8128 1.6725,107.0408 15.6101,22.3001 205.719,-228.5766 66.104,-190.8486 -193.1653,49.671 z",
"South Africa": "m 5260.0505,4668.8661 59.653,138.261 -17.2827,10.035 51.8479,68.573 91.9882,-36.2377 72.4755,3.9025 7.2476,-11.7076 26.2027,1.6725 92.5456,-82.5106 45.7154,-80.2805 19.5126,-6.6901 15.0526,-58.5379 -18.9551,-1.6725 -10.0351,17.2826 -28.9902,-20.0702 15.6101,-28.9902 18.3976,6.1326 -18.9551,-117.6334 -61.883,-8.3625 -106.4832,120.9783 -60.2105,-18.3976 -62.4404,54.0779 -28.4327,-68.573 -1.6725,115.4033 -22.3002,17.2827 z m 299.3797,36.2377 45.7153,-34.5652 26.7602,24.5302 -43.4853,49.6178 z",
"South Sudan": "m 5763.4767,3476.3649 -44.6003,-76.9355 -14.4951,0 0,27.8752 -35.6803,45.7153 -10.0351,-10.0351 -112.6158,7.8051 -7.805,-17.8401 -27.8752,8.92 0,13.3801 -43.4854,1.115 -3.345,22.3002 105.9258,110.3858 24.5302,27.8752 41.2553,-10.0351 31.2202,31.2203 89.2006,-12.2651 14.4951,-20.0702 52.4054,14.4952 -67.458,-103.6958 -27.3177,-9.4776 5.5751,-21.1851 26.2027,1.115 z",
"Sudan": "m 5804.4199,3046.4925 42.5752,53.6132 3.9422,81.2083 36.2677,26.0182 -41.7867,35.4793 -14.9802,81.9967 -67.805,148.2248 -44.9405,-74.1124 -13.4033,0 0,27.595 -35.4793,47.3058 -9.4612,-11.038 -112.7454,8.6727 -9.4612,-18.9223 -27.595,8.6728 0,12.6148 -42.5752,1.5769 -49.6711,-110.3802 30.7488,-85.1504 28.3834,-0.7884 0,-135.6099 27.5951,0 -0.7885,-63.0744 255.4513,5.519 z",
"Swaziland": "m 5682.2133,4581.9595 -15.3744,29.5661 27.9893,20.4992 10.6438,-16.9513 -4.3364,-26.8066 z",
"Tanzania": "m 5619.1389,3912.9768 50.4595,-47.3058 -11.038,-62.2859 99.3422,-4.7306 149.0132,112.7455 -1.5769,122.2066 33.1141,60.7091 -149.8017,33.114 -23.6529,-62.2859 -31.5372,-3.1538 -74.9008,-39.4215 -41.7868,-72.5355 z",
"The Gambia": "m 4405.3513,3355.9512 -35.0851,-5.519 -44.1521,13.4033 7.0959,-22.0761 41.7868,-6.3074 35.4793,10.6438 z",
"Togo": "m 4831.8918,3578.2884 15.3744,-5.519 -11.4322,-112.3513 -16.2783,-31.999 -20.3837,-0.5237 14.9801,127.5285 z",
"Tunisia": "m 5034.9125,2583.6842 -3.1538,78.0546 -26.8066,21.2876 59.6933,127.6787 23.6939,-20.0701 -6.4113,-24.8089 41.8128,-30.6628 -1.3126,-22.1766 -44.6815,-32.7375 33.4503,-37.3528 -22.3002,-37.3528 20.6277,-23.4151 -22.3002,9.4775 -14.4951,-20.6276 z",
"Uganda": "m 5756.2291,3645.8462 34.0078,61.3254 -32.8928,54.6354 1.115,35.6803 -122.0933,5.0175 10.035,-61.8829 36.7953,-39.0253 -15.6101,-9.4776 0,-33.4502 z",
"Western Sahara": "m 4552.5779,2897.1183 0.5575,54.6354 -95.3332,0 0,83.0681 -31.7777,15.0526 4.46,51.8478 -114.8458,0 108.6349,-203.8487 z",
"Zambia": "m 5659.2234,4023.2764 75.2631,41.2553 10.5925,32.3352 -21.7426,94.7757 -167.8087,138.8185 -106.9112,-8.6892 -28.0048,-48.7337 -2.23,-99.7932 56.8654,-2.23 7.2475,-62.4405 160.0037,80.2806 -3.9025,-46.2728 -12.8226,10.035 -26.7602,-24.5301 17.2826,-97.0057 z",
"Zimbabwe": "m 5508.3027,4326.7275 47.3676,4.1171 96.901,-79.8706 77.7362,40.0549 -15.7686,145.4653 -31.9314,34.2967 -61.4975,-8.6728 z"
},
"Asia": {
"Afghanistan": "m 6527.41,2629.4132 -23.6529,65.4396 15.7686,78.843 25.2298,0.7884 -28.3835,52.8248 157.6859,-1.5768 12.6149,-54.4017 66.2281,-13.4033 22.8645,-74.1124 31.5372,-1.5768 10.2496,-79.6315 102.4958,-31.5371 -48.0942,-7.0959 -52.0364,26.8066 -17.3454,-63.0744 -85.1504,56.767 -40.9984,-17.3455 -115.8991,78.0546 z",
"Armenia": "m 6065.9226,2431.8812 32.8927,37.6315 -10.8713,7.2476 24.8089,17.0038 -1.115,20.6277 -11.7076,1.115 -10.0351,-24.5302 -58.8166,-20.3489 4.46,-24.2514 -12.2651,-11.1501 z",
"Azerbaijan": "m 6111.6379,2514.3918 41.534,-28.7115 10.3139,9.4776 -9.4776,21.1852 23.1364,17.2826 19.7914,-66.0642 18.6764,-7.2476 -19.5127,-5.575 -26.7602,-44.8791 -21.7426,23.1364 -37.074,-25.3664 -6.9688,5.8538 14.2163,22.8576 -39.8615,-10.8713 -12.2651,6.1325 32.8927,37.9103 -10.5925,7.8051 24.8089,16.7251 z",
"Bahrain": "m 6232.3402,2949.4171 -3.1538,7.9828 -2.5624,-8.6727 z",
"Bangladesh": "m 7313.4745,3078.0297 -26.0182,-87.5157 22.8645,-14.1917 -23.6529,-26.0182 18.1338,-13.4033 33.1141,37.0562 74.9008,9.4611 -38.633,44.1521 7.0958,12.6149 22.8645,-15.7686 11.038,76.4777 -10.2496,4.7305 -19.7107,-55.1901 -17.3455,7.8843 -18.1339,-27.595 2.3653,44.1521 z",
"Bhutan": "m 7340.0981,2874.8181 -36.2378,37.3528 34.0078,18.9551 60.7679,-8.9201 -7.8051,-31.7777 z",
"Brunei": "m 8019.1191,3627.9594 46.1232,-26.8066 -7.4901,35.8736 -15.7686,-9.4612 -5.1248,16.9513 z",
"Burma": "m 7648.9553,3098.9347 -24.5302,31.2202 -60.7679,25.6452 -4.46,60.2105 32.3352,47.9453 -17.8401,36.7953 32.3352,79.1655 -21.7427,84.8479 2.2301,-96.5554 -23.9727,-63.5555 -26.7602,-82.5106 -38.4678,53.5204 -37.9103,-11.1501 13.3801,-39.0253 -31.2202,-82.5106 -37.9103,-37.3527 13.3801,-6.1326 21.1852,-81.9531 17.2826,5.0176 22.3002,-43.4853 7.805,-46.8304 66.343,-54.6354 33.4503,26.2027 -34.0078,116.5183 43.4853,-10.035 5.5751,69.1305 z",
"Cambodia": "m 7703.5907,3398.3144 45.7153,43.4853 49.6179,-8.3626 -13.3801,-32.3352 50.7329,-18.9551 -1.115,-65.7855 -39.5828,4.46 0.5575,17.2826 -23.9727,-13.9376 -60.2104,-0.5575 -21.1852,24.5302 z",
"China": "m 7064.6911,2395.9221 -185.0914,99.2358 165.0212,231.9216 -33.4502,7.8051 73.5905,75.263 233.5942,85.8556 22.8577,-21.7426 50.1753,16.7251 107.0408,-55.7504 86.9707,68.0155 -33.4503,115.9608 43.4853,-8.92 5.5751,68.0155 73.5905,30.1052 -2.23,-45.7153 98.1207,-24.5302 65.7855,56.8654 58.5379,-1.6725 10.5926,37.3527 25.0876,-31.7777 162.2337,-55.1929 148.2961,-217.4266 -75.8206,-182.8613 86.9707,-72.4755 -93.6607,0 -45.7153,-62.4404 114.8458,-69.1305 25.6452,22.3001 -31.2202,57.9804 89.2006,-47.9453 185.0913,-98.1207 -5.575,-71.3605 63.5555,-12.2651 51.2903,-127.1109 -102.5807,36.7952 -158.3312,-209.6215 -114.8458,-11.1501 -113.7308,147.1811 -26.7602,-15.6101 -24.5302,79.1655 70.2455,-11.15 51.2904,52.4053 -178.4013,74.7056 -53.5204,-13.3801 12.2651,47.9453 -202.9315,80.2806 -244.1867,-42.3703 -28.9902,-53.5204 -132.686,-43.4853 12.2651,-49.0603 -98.1207,-90.3157 -68.0155,91.4307 -57.9804,-21.1852 -13.3801,73.5905 -76.9356,6.6901 z m 860.7862,747.0554 -54.6354,17.8402 -4.46,31.2202 33.4502,7.805 25.6452,-39.0252 z",
"Cyprus": "m 5764.8704,2632.0251 -34.5653,7.2476 -4.7388,6.1325 -14.4951,4.7388 17.5614,13.1014 15.0526,-8.0838 6.1326,-6.6901 6.69,0.5575 -4.46,-10.0351 z",
"East Timor": "m 8334.5838,4061.1867 61.4269,-32.3353 -64.2116,11.9694 z",
"Georgia": "m 5969.7531,2424.9124 8.9201,-22.3002 -12.2651,-28.4327 -49.6179,-30.1051 156.1011,31.7776 15.0527,21.7427 22.3001,10.5926 -6.69,5.575 13.9376,22.3002 -39.5828,-10.5926 -11.7076,6.1326 -41.8128,3.9025 -17.2826,-15.0526 z",
"India": "m 7416.4761,3101.1647 21.2535,-84.1339 17.3284,5.2389 22.059,-42.067 8.6386,-47.0776 66.194,-54.962 -53.5204,-42.9278 -107.0407,55.7504 7.805,30.6627 -60.2104,8.9201 -35.6803,-18.9551 15.0526,-15.0526 -30.6627,-12.2651 -5.0175,51.2903 -129.8985,-28.9902 -97.0057,-51.8478 27.3177,-45.7154 -73.033,-74.7055 34.5652,-7.2476 -61.8829,-85.2981 -102.0232,19.5127 47.3878,80.838 -128.6843,156.924 -11.038,-18.1338 -27.5951,36.2677 48.0942,83.5736 -87.5157,21.2876 73.4954,105.3162 60.2105,-57.9804 20.0701,209.6215 109.2708,243.0718 66.9005,-82.5106 13.3801,-162.7912 248.3892,-199.143 -26.0182,-88.3042 23.2587,-13.0091 -23.2587,-26.8066 17.7397,-12.2206 33.5082,36.662 74.5066,9.0669 -37.8446,43.7579 6.3074,13.7975 22.8645,-16.557 z",
"Indonesia": "m 7488.3942,3604.5909 99.1387,111.2767 47.8907,87.6238 51.0444,84.47 87.3122,68.7015 17.8961,-91.1601 -75.8205,-85.8557 10.0351,-12.265 -178.4013,-157.2162 z m 400.2879,103.6957 -18.9552,44.6003 49.0604,111.5009 115.9608,2.23 2.23,31.2202 39.0253,-23.4152 53.5204,-140.491 26.7602,12.2651 -42.3703,-109.2708 -44.6003,-5.575 -33.4503,92.5456 -115.9608,17.8402 z m -104.8108,266.487 73.5905,33.4502 169.4813,27.8752 2.23,-20.0702 -47.9454,-10.035 -7.805,-21.1852 -45.7154,-15.6101 -12.2651,16.7251 -54.6354,-11.15 -37.9102,-18.9552 -30.1052,0 z m 410.323,-229.6917 -41.2553,127.1109 20.0701,4.46 2.23,68.0155 22.3002,-7.805 -2.23,-84.7406 24.5301,-3.3451 -6.69,28.9902 20.0701,18.9552 3.3451,25.6452 31.2202,-25.6452 -42.3703,-74.7056 45.7153,-27.8752 -46.8303,5.5751 -8.9201,15.6101 -27.8752,-27.8752 13.3801,-39.0253 109.2708,8.9201 22.3002,-37.9103 -33.4503,23.4152 -83.6256,-13.3801 z m 587.3364,108.7627 -1.5769,193.9537 -53.6132,-31.5372 -25.2297,-77.2661 -122.9951,-61.4975 -26.8066,23.6529 -17.3454,-50.4595 55.19,-7.8843 25.2298,33.114 72.5355,-61.4975 z m -238.1058,-74.1124 39.4215,22.076 1.5769,28.3835 -56.767,4.7306 -4.7306,-25.2298 -18.9223,1.5769 z m -54.4016,104.8611 -29.1719,-17.3454 -35.4794,5.519 -9.4611,-11.8265 44.9405,-4.7305 37.0562,23.6529 z m -100.1306,-5.519 -18.9223,7.8843 -11.8265,-18.9223 19.3165,-3.1537 z m -56.9023,163.3799 2.7643,18.7542 -41.262,26.7998 5.519,-24.4413 11.038,4.7306 z m -147.301,16.3821 25.2297,23.6529 -13.4033,3.9422 -37.8446,-23.6529 z m 1.5768,-24.4413 32.3257,8.6727 31.5371,-3.9421 -22.076,-3.1537 -26.8066,-11.0381 z m -55.9785,7.8843 -26.8066,-14.1917 -6.3074,21.2876 z m -38.633,-12.6149 -6.3075,12.6149 -10.2496,-3.1537 10.2496,-14.1918 z m -40.9984,6.3075 -18.1339,-14.1918 22.8645,0.7884 8.6727,6.3075 z m 377.6579,-313.7951 -27.5951,29.1719 12.6149,37.8446 -3.9421,-35.4793 25.2297,2.3653 -14.1917,-17.3455 z m -26.0182,13.4033 1.5768,-26.8066 11.0381,9.4612 z m 312.6124,264.124 7.4901,12.6149 -18.1339,15.3743 -14.9802,-1.1826 9.8554,-23.2587 z",
"Iran": "m 6167.0976,2818.6363 44.9405,-8.6727 38.6331,79.6314 100.1305,46.5173 52.0364,-26.8066 15.7686,47.3058 119.0529,23.6529 7.8843,-39.4215 37.8446,-18.1339 -68.5934,-96.1884 30.7488,-53.6132 -26.8066,0 -16.557,-79.6314 24.4413,-63.8628 -3.1537,-37.8447 -126.1488,-55.1901 -71.7471,34.691 -66.2281,27.595 -78.0546,-40.9984 -4.7305,-24.4413 -22.0761,-17.3454 7.8843,-21.2876 -8.6727,-9.4612 -42.5752,29.9603 -10.2496,0.7885 -11.038,-26.0182 -29.1719,-8.6727 -13.4033,18.1338 36.2677,119.0529 23.6529,3.9422 -25.2297,63.0744 66.2281,70.1702 z",
"Iraq": "m 5995.6141,2576.5884 73.2645,-5.5669 13.4627,47.3537 25.2298,4.3364 -25.2298,63.8628 66.2281,70.5644 18.1339,61.4976 -12.2206,3.9421 -21.6819,-8.2785 -17.7396,34.2967 -58.738,-4.7306 -149.4075,-97.7653 -13.8194,-40.2064 67.1792,-40.6978 5.5751,-66.9004 z",
"Israel": "m 5790.9337,2716.3476 -16.4464,48.6423 0.8363,7.3869 -6.5507,10.5926 15.0526,53.9385 15.6101,-52.6842 4.3929,-71.2369 z",
"Japan": "m 8800.7586,2279.9613 -8.92,81.3956 -43.4853,27.8752 5.575,31.2202 25.6452,-14.4951 -13.3801,-22.3002 42.3703,0 30.1052,22.3002 69.1305,-53.5204 z m -11.15,162.7912 20.0701,47.9453 -41.2553,128.2259 -76.9355,43.4854 -33.4503,-13.3801 -25.6452,55.7504 c 0,-11.1501 -14.4951,-46.8304 -14.4951,-46.8304 l -120.4209,25.6452 51.2904,-51.2904 89.2007,-6.69 31.2202,-62.4405 0,32.3353 66.9005,-51.2904 17.8401,-93.6607 z m -194.0114,233.0367 -61.3255,20.0701 14.4951,30.1052 22.3002,-27.8752 15.6101,8.9201 z m -101.4658,11.15 -30.1052,21.1852 24.5302,17.8401 -12.2651,52.4054 32.3352,-7.8051 15.6101,-56.8654 z",
"Jordan": "m 5783.5265,2836.7702 35.0851,8.2785 54.7959,-44.5462 -29.9604,-33.1141 63.4686,-20.4992 -13.7975,-40.6041 -58.738,35.8736 -31.4387,-14.2904 -3.6464,55.6829 z",
"Kazakhstan": "m 6183.8346,2243.1661 85.8557,-31.2202 33.4502,73.5905 -90.3156,31.2202 71.3605,83.6256 49.0603,-7.805 44.6003,39.0253 1.1151,-137.146 81.3955,-22.3002 89.2007,79.1656 89.2006,-8.9201 94.7757,113.7308 79.1656,-82.5106 61.3254,20.0702 15.6101,-42.3703 175.0563,43.4853 -8.9201,-101.4657 75.8206,-7.8051 15.6101,-73.5905 56.8654,20.0701 69.1305,-88.0856 -212.9665,-54.6354 -95.8907,-144.9511 -71.3605,35.6803 -108.1558,-78.0506 -259.7969,51.2904 0,128.2259 -247.5318,-43.4853 -129.3409,53.5204 -36.7953,57.9804 z",
"Kuwait": "m 6154.5657,2822.9703 -13.1014,17.2826 11.1501,1.9513 11.1501,24.8089 -20.0701,0.2787 -6.9688,-16.4463 -21.4639,-2.5088 17.5613,-34.2865 z",
"Kyrgyzstan": "m 6878.4847,2494.0428 186.2064,-98.6782 -175.6138,-44.6003 -15.0526,42.9278 -61.3254,-20.6276 -15.6101,16.7251 13.3801,7.805 -27.8752,25.0877 30.1052,10.0351 11.7076,-12.2651 36.7952,25.6452 -74.148,30.6627 -17.2826,-10.5926 -15.0527,26.2027 z",
"Laos": "m 7674.6005,3063.2545 52.4054,57.9804 14.4951,-9.4776 24.5302,34.5653 -32.8928,20.6276 102.5808,104.2533 0,45.7153 -40.6978,5.0175 0.5575,15.0526 -23.4152,-12.265 10.5926,-37.3528 -59.0954,-95.3332 -71.9181,34.0077 5.5751,-66.3429 -30.6627,-31.7778 22.8576,-30.1052 26.2027,11.1501 z",
"Lebanon": "m 5816.7183,2663.2454 -25.4651,52.8643 12.6425,-3.2465 0,-3.9025 27.3177,-35.1228 z",
"Malaysia": "m 7617.8084,3548.7223 45.7289,134.033 57.1223,40.7244 7.9334,-7.7917 11.2785,2.8008 -23.5094,-42.0409 0.7884,-61.4975 -33.9025,-39.4215 -32.3256,20.4991 3.1537,-18.1338 z m 274.3735,161.6281 49.6711,13.4033 8.6727,-48.8827 44.9405,-6.3074 23.6529,-39.8157 18.1339,16.1628 5.519,-17.3455 14.1917,10.2496 10.2496,-37.8446 36.2678,-51.2479 63.0744,62.2859 -50.4595,26.0182 -47.3058,-3.9422 -33.9025,93.0348 -114.3223,16.557 z",
"Maldives": "m 6887.8873,3810.9438 0.5889,3.0774 -2.5519,2.6041 -2.3556,-1.6571 0,-2.3673 0.9816,1.6571 1.1777,1.1836 1.3741,-1.6571 z m 0.3069,-13.2752 1.5268,3.1805 -2.6373,3.1805 -0.2776,-3.6827 z m -0.1389,2.3435 0.4165,1.1718 -0.8328,0.5022 -0.1388,-1.3392 z m -7.3564,-1.0043 0.5552,-1.8413 -1.9433,-12.2197 -1.6656,-0.837 -0.5552,2.5109 1.9432,12.3871 z m -0.5553,-1.8413 0,-2.6783 -1.8044,-8.3697 -0.4164,2.0087 1.5268,8.2023 z m 7.2177,-4.0175 2.3597,-2.0087 0.8328,-16.2371 -1.6656,-3.1805 -1.8045,3.1805 -0.5552,16.2371 z m 0.5553,-1.8413 0.8328,-1.0044 1.1104,-15.0653 -0.9716,-1.5066 -0.9716,1.0044 -0.6941,15.4002 z m -8.0506,-15.4002 -4.0252,-0.3347 3.0536,-10.7132 z m -1.5268,-6.1935 -1.388,4.8544 1.6656,0.1674 z m 9.4386,-1.5065 -5.8298,-15.735 -2.3596,-0.8369 0,3.6826 5.2745,13.8937 2.2208,1.6739 z m -1.3881,0 -5.1356,-14.3958 -0.5552,-0.3348 0,1.8413 4.5804,12.8893 z",
"Mongolia": "m 7274.3126,2142.8153 97.0057,90.3157 -13.3801,49.0603 133.801,43.4853 28.9902,53.5204 243.0717,40.1403 202.9315,-78.0506 -12.2651,-46.8303 55.7504,11.1501 176.1713,-73.5905 -50.1754,-53.5204 -72.4755,12.2651 25.6452,-81.3956 -161.6762,40.1403 -114.8458,-51.2904 -90.3157,14.4951 -39.0252,-54.6354 -92.5457,-33.4502 -17.8401,89.2006 -158.3312,-45.7153 z",
"Nepal": "m 7083.253,2810.752 -26.8066,44.9405 96.1884,51.2479 129.3025,28.3835 6.3074,-50.4595 z",
"North Korea": "m 8310.1551,2472.8577 36.7953,52.4054 -18.9552,14.4951 49.0604,13.3801 50.1753,-25.6452 -31.2202,-44.6003 64.6705,-43.4853 33.4502,-63.5555 z",
"Oman": "m 6357.1092,3056.7421 29.1719,-74.1124 100.919,84.362 -59.1322,73.3239 1.5768,33.1141 -87.5157,66.2281 -46.9116,7.4901 -31.5371,-81.6025 87.9099,-21.6818 21.2876,-67.805 z",
"Pakistan": "m 6515.5836,2828.0975 69.3818,95.4 -38.6331,16.557 -7.8843,40.2099 134.8215,-16.557 49.6711,58.3438 85.9388,-20.4992 -48.8826,-84.362 28.3835,-36.2677 11.038,18.1338 128.514,-156.8975 -47.3058,-80.4198 103.2843,-19.7108 -51.2479,-70.9586 -13.4033,-1.5769 -102.4959,32.3256 -10.2496,81.2083 -29.9603,0.7884 -22.8645,74.1124 -66.2281,13.4033 -13.4033,54.4017 z",
"Philippines": "m 8203.1143,3197.0554 -2.23,73.0331 -17.8401,-7.8051 16.1676,59.0954 5.575,-15.6101 15.0527,10.5926 -15.6102,15.6101 20.0702,12.8226 16.1676,-11.7076 -13.9376,-43.4853 7.2476,-21.1852 15.6101,-6.69 7.805,-27.3177 -12.2651,-18.3976 8.9201,-22.8577 -20.6276,7.8051 -13.3801,-11.7076 z m 21.7427,157.2162 -26.7602,-3.9026 25.6452,40.1403 6.1325,-13.9376 z m 20.6276,48.5028 -2.23,42.9278 31.7778,-24.5302 -7.2476,-10.035 -8.3626,2.7875 z m 28.4327,27.8752 -6.69,27.3177 -13.3801,3.345 21.1852,30.6628 -0.5576,-30.6628 13.3801,-29.5477 z m -122.6508,40.6978 -40.1403,36.2378 16.1676,-23.4152 23.9727,-21.7427 z m 5.0175,-16.1676 15.0526,-20.6277 7.2476,10.5926 -12.2651,3.9025 -1.6725,7.2476 z m 127.6684,46.2728 -12.8226,17.2826 -22.3001,6.1326 -6.6901,31.2202 18.9552,-28.9902 10.035,7.8051 7.8051,-7.2476 2.23,10.5926 7.2476,-13.3801 21.1851,15.0526 -7.2475,18.9551 2.23,16.1677 20.6276,12.265 11.1501,-8.3625 2.23,18.9551 9.4776,-20.6276 -11.1501,-13.3801 16.1676,-26.7602 8.3626,22.3001 13.3801,-16.7251 -15.0526,-39.0253 5.0175,-10.5925 -24.5302,-27.3177 7.2476,24.5301 -15.6101,0.5575 0.5575,4.4601 -8.3626,-3.9025 -1.115,16.1676 -8.3626,-2.7876 -20.6276,16.7252 1.6725,-7.2476 -4.46,-11.7076 -3.3451,3.3451 z m 13.9376,-74.7055 -14.4951,45.1578 16.1676,-30.6627 z m 12.8226,-42.9278 21.1852,20.0701 -3.3451,8.3626 18.3977,16.1676 -7.8051,-36.2378 -6.1325,-12.2651 z m 13.9376,35.1227 -13.3801,-2.7875 1.6725,10.5926 9.4776,6.1325 1.115,23.4152 2.7875,-11.1501 8.9201,3.9025 z m -13.9376,35.1228 -15.0526,13.3801 5.0175,3.9025 14.4951,-5.575 z m -56.3079,-119.8634 19.5126,12.2651 17.8402,22.3002 11.1501,-4.4601 -8.9201,-1.115 -2.23,-10.035 -6.1326,-8.9201 10.0351,-3.345 -13.3801,-6.6901 -2.23,8.9201 -11.1501,-14.4951 -11.1501,-2.7875 z m 27.3177,45.1578 21.7427,21.1852 -15.6102,-8.9201 -6.69,-0.5575 z m -26.7602,-40.1402 7.2476,19.5126 -15.0526,-21.1852 z",
"Qatar": "m 6231.9716,2973.7343 12.8936,21.0566 16.0555,-37.391 -17.3454,-13.4033 z",
"Russia": "m 5875.3785,2215.4876 34.6909,3.1537 -69.3818,72.5356 77.2661,55.19 157.686,29.9604 9.4611,18.9223 63.0744,37.8446 22.076,-23.6529 -61.4975,-107.2264 75.6893,-58.3438 -72.5356,-96.1885 34.691,-55.19 130.8793,-55.1901 247.5669,45.7289 -0.017,-130.8824 263.1419,-49.0604 104.8108,78.0506 71.3605,-35.6803 95.8907,142.7211 211.8515,53.5204 142.721,-73.5906 158.3312,42.3703 17.8401,-86.9706 93.6607,35.6803 37.9103,53.5204 89.2006,-13.3801 115.9608,49.0603 158.3312,-37.9103 28.9902,15.6101 115.9608,-147.181 115.9609,13.3801 156.1011,207.3915 100.3507,-35.6803 -49.0603,127.1109 -62.4405,11.1501 4.46,84.7406 82.5106,-4.46 173.9413,-216.3116 44.6003,-187.3213 -84.7406,-46.8304 -15.6101,51.2904 -84.7406,-69.1305 225.2316,-180.6313 313.5868,14.4263 86.519,-113.2994 91.2495,42.8097 107.0182,-80.1853 -14.1917,76.4777 -231.7984,205.7801 37.8446,195.5306 141.9174,-152.9554 45.7289,-200.2611 487.2496,-138.7637 -100.919,-81.9967 327.9868,-25.2297 -321.6794,-182.9157 -255.4512,-9.4612 -450.9818,-64.6512 -324.8331,-96.1885 -22.0761,66.2281 -214.65,-1.7739 -44.3491,48.6855 -72.7327,-131.0765 -120.0384,-20.6962 -58.3438,42.5752 -142.7058,-41.7868 -317.7372,35.4793 219.9719,-180.55034 -75.6892,-25.22975 -97.7653,0 -121.4182,-47.30579 -94.6115,80.41984 -335.8711,36.26777 -22.076,89.88097 -179.762,7.8843 47.3057,96.1884 -249.1438,1.5769 37.8447,233.3752 -176.6083,12.6149 119.8413,-94.6116 -31.5372,-214.4529 -69.3818,0 -75.6892,151.3785 56.7669,44.1521 -245.9901,-31.5372 -700.1256,264.9124 -88.3041,-145.0711 182.9157,50.4595 109.5221,-79.8323 -352.4211,-95.5393 -20.0701,35.6803 -7.8051,94.7756 75.8206,178.4013 -102.5808,101.4658 68.0155,25.6452 -66.9005,23.4151 -12.265,31.2202 0,46.8304 17.8401,55.7504 55.7504,11.1501 72.4755,99.2357 -39.0253,5.575 6.6901,36.7953 65.7855,-1.115 11.15,39.0253 167.2512,66.9004 -13.3801,64.6705 z m 536.1323,-991.8447 -69.3818,-88.3041 179.762,-151.37856 223.914,-53.61322 -50.4595,-37.84463 -283.8347,94.61157 -170.3008,198.68434 88.3041,47.3057 z m 1371.8678,-409.98349 -173.4545,31.53719 75.6892,-94.61157 z m -170.3008,-34.69091 3.1537,-56.76694 -69.3818,0 6.3074,-47.30579 -53.6132,-34.69091 -85.1504,37.84463 15.7686,50.45951 -66.2281,-3.15372 157.6859,63.07438 z m 1444.4033,233.3752 -129.3025,-28.38346 59.9207,37.84466 z m -179.762,-34.6909 -167.1471,-34.69091 -47.3058,56.76695 78.843,31.53716 110.3802,-22.076 z m 1065.9571,217.6066 -40.9984,-12.6149 -53.6132,34.691 z m -1094.3405,-94.6116 -50.4595,-37.8446 -34.691,25.2298 z M 6644.886,671.74205 l -85.1504,6.30744 39.4215,-15.7686 23.6529,-11.03801 z m -94.6115,6.30744 -67.805,25.22975 -11.038,-33.11405 z m -91.4579,20.49917 -36.2677,9.46116 -9.4612,-17.34545 z m -44.152,-26.80661 -70.9587,-25.22975 -4.7306,18.92231 z m 53.6132,-61.49752 -29.9604,3.15372 9.4612,7.8843 z m 97.7653,12.61488 26.8066,6.30743 1.5768,-11.03801 z m -321.6794,59.92066 -102.4958,36.26777 42.5752,-36.26777 7.8843,-12.61488 z m 70.9587,22.07603 -17.3455,-6.30744 -20.4991,12.61488 z m 83.5736,-1.57686 -25.2298,14.19174 29.9603,-4.73058 z m 42.5752,-70.95868 -26.8066,-3.15372 9.4611,11.03802 z m 91.4578,20.49918 -36.2678,4.73058 22.0761,12.61487 z m -370.562,23.65289 -61.4975,22.07603 -31.5372,-15.76859 z m 2655.4315,1299.33227 -11.038,290.1421 20.4991,-33.114 28.3835,12.6149 -28.3835,-58.3438 18.9223,-58.3438 31.5372,9.4611 -42.5752,-171.8777 z",
"Saudi Arabia": "m 5786.8919,2838.5803 -7.8051,43.4853 122.6509,163.9062 11.1501,88.0857 41.2553,20.0701 57.1127,104.0784 13.1328,-33.8329 113.7308,11.1501 45.7153,-50.1754 167.2512,-41.2553 21.1852,-68.0154 -15.6101,-17.8402 -78.0506,-10.035 -115.4549,-181.4714 -20.105,0.3942 -7.8843,-17.7396 -79.2372,-5.1248 -148.619,-97.3711 -61.8917,20.4992 28.3834,32.7198 -55.19,45.3347 z",
"Singapore": "m 7741.501,3723.618 -17.2826,3.345 5.575,-6.4113 z",
"South Korea": "m 8377.0556,2553.1383 -7.8051,121.5359 84.7406,-35.6803 0,-62.4405 -26.7602,-49.339 z",
"Sri Lanka": "m 7064.3307,3476.9752 -9.8438,48.9618 6.7461,52.6335 20.9446,2.5894 25.7674,-17.0073 1.7204,-20.161 -22.0084,-49.4333 z",
"State of Palestine": "m 5801.9444,2738.5084 -10.3138,-5.575 -5.0176,24.5302 5.0176,0 -8.3626,14.7738 16.4464,-3.345 z m -27.5965,27.039 -12.265,12.5438 6.69,5.0175 6.1326,-10.5925 z",
"Syria": "m 5995.3983,2577.111 -155.5436,10.5926 -24.5302,34.0077 1.6725,41.8128 14.4951,10.5926 -27.3177,35.1228 -1.0841,18.4623 31.1893,14.4304 125.9959,-76.9356 5.5751,-66.9004 z",
"Taiwan": "m 8221.7456,2977.8991 -32.3256,62.286 21.2876,42.5752 27.595,-83.5736 2.3653,-18.9223 z",
"Tajikistan": "m 6931.4476,2570.9784 -57.9804,-6.69 -52.4054,27.8752 -18.3976,-64.113 -85.2981,56.8654 7.2475,-69.1305 -20.0701,-12.8226 -4.46,-12.8226 33.4502,0.5575 19.5126,-39.5828 34.5653,-11.15 8.9201,10.5925 -8.9201,10.0351 13.9376,10.0351 -14.4951,6.1325 -17.2826,-10.5926 -15.6102,26.2027 124.3234,1.6725 z",
"Thailand": "m 7627.7702,3129.5974 30.1052,31.2203 -6.6901,66.9004 72.4756,-35.1227 59.6529,95.8907 -11.1501,35.6802 -60.7679,0.5576 -21.7427,23.4151 11.7076,47.3879 c 0,0 -51.2904,-20.6277 -51.2904,-22.8577 0,-2.23 1.115,-25.6452 1.115,-25.6452 l -27.3177,1.6725 -24.5301,132.686 16.7251,2.23 17.2826,61.8829 50.243,30.2009 -30.1729,17.7445 1.1151,-15.6101 -80.8381,-70.803 32.8927,-127.6685 -32.3352,-79.723 17.8401,-36.2378 -32.8927,-49.0603 5.0175,-59.653 z",
"Turkey": "m 5548.1802,2420.2822 -11.6294,29.5661 22.8645,3.7451 19.3165,-15.9657 34.2967,2.3653 4.7306,-8.4757 -26.0182,-9.6582 -5.9132,-18.5281 -34.2967,1.3797 -11.6293,9.067 z m 73.3239,39.6186 -74.9008,7.0959 -11.8264,31.5372 22.076,-7.0959 20.4992,89.0926 82.7851,29.9603 6.3074,-26.8066 59.1323,27.595 92.2463,-30.7487 -2.3653,40.9983 25.2297,-33.9025 227.9369,-17.4889 -21.0417,-69.4133 13.3241,-19.7667 -30.2077,-10.0187 4.8987,-24.278 -28.5516,-25.393 -33.1141,3.1537 -104.8611,21.2876 -121.4182,-40.9984 -74.1124,34.6909 -51.2479,-5.519 -2.3653,7.8843 25.2297,8.6728 z",
"Turkmenistan": "m 6317.2934,2395.2496 26.4124,48.8826 -54.4017,3.9422 0.7885,22.8644 36.2677,98.5538 70.9587,-33.1141 126.1488,55.1901 3.9421,37.0562 33.1141,16.557 115.8992,-78.0545 3.9421,-19.7108 -122.2066,-74.1124 -22.076,-43.3636 -40.9984,-1.5769 -4.7306,-35.4793 -48.8826,-15.7686 -33.1141,32.3256 4.7306,22.8645 -35.4793,-0.7885 -44.9405,-39.0272 z",
"United Arab Emirates": "m 6387.0695,2981.447 -0.7884,-34.6909 -53.219,66.2281 -73.324,5.1248 19.3165,29.1719 76.8719,10.2496 z",
"Uzbekistan": "m 6796.3922,2390.626 14.6345,6.9687 -29.5477,26.2027 31.2202,8.9201 11.1501,-12.8226 37.3527,26.7602 -61.8829,22.3001 -11.1501,-8.3625 8.9201,-10.0351 -8.9201,-10.5926 -35.1227,11.1501 -19.5127,40.6978 -33.4502,-1.115 3.9025,12.8226 21.1852,13.3801 -7.8051,66.9004 -40.6978,-16.7251 3.7631,-19.5126 -122.2327,-74.1481 -22.0214,-43.3459 -41.2553,-1.8119 -5.0175,-35.1227 -48.5029,-16.7251 -33.4502,32.8927 5.0175,22.997 -35.6803,-0.6968 1.6726,-137.146 80.2805,-22.3002 90.3157,79.1656 88.6431,-9.4776 95.4726,114.2883 z",
"Vietnam": "m 7839.0642,3096.1472 -60.7679,83.6256 94.2181,115.9608 6.6901,114.2884 -81.3956,40.6978 8.9201,22.3001 -46.2729,31.2202 -9.4775,-61.8829 47.3878,-7.8051 -13.3801,-32.8927 52.4054,-19.5126 -1.6725,-112.0583 -103.1383,-104.2533 34.0078,-20.6276 -25.0877,-34.5653 -14.4951,9.4776 -53.5204,-57.9804 96.4482,-23.9727 z",
"Yemen": "m 6010.9885,3260.157 17.3455,114.3223 245.2016,-93.0347 -1.5768,-18.1339 23.6529,-15.7686 -31.5372,-81.9967 -79.6314,18.9223 -45.729,52.0364 -115.1107,-12.6149 z"
},
"Europe": {
"Albania": "m 5343.5827,2405.8934 8.2785,11.038 -2.3653,47.7 19.3166,25.2297 23.2586,-42.9694 -15.7686,-19.7107 5.1248,-20.4992 -16.557,-24.8355 -4.7478,5.0164 -8.2232,-4.1812 z",
"Andorra": "m 4842.48,2379.197 -5.0175,4.1813 0.2787,6.1325 11.9864,-4.46 z",
"Austria": "m 5189.4446,2156.7496 23.6529,7.0958 9.067,-18.9223 55.5843,13.7975 3.9421,27.2009 -26.0182,40.6041 -52.7892,16.0713 -63.8984,-22.7729 -37.4504,11.4322 -28.824,-8.2281 -2.5061,-14.7976 95.5871,-10.0884 -6.3074,-17.7396 z",
"Belarus": "m 5463.0298,2044.3983 197.8958,13.4033 29.9604,-33.9024 -7.0959,-40.21 38.6331,-5.519 -72.5356,-99.3421 -55.1901,-8.6727 -44.152,18.1338 -23.6529,57.5554 -65.4397,11.8265 15.7686,47.3057 -22.8645,15.7686 z",
"Belgium": "m 4925.2693,2055.566 -24.2514,9.1988 -11.7076,-5.2963 -35.6803,13.3801 106.2046,45.9941 1.6725,-15.8889 13.3801,-0.2787 -4.1813,-22.3002 -9.4776,1.3938 -0.8362,-17.2827 z",
"Bosnia and Herzegovina": "m 5317.9587,2382.2405 33.5083,-53.6132 -10.2497,-29.172 -96.1884,-15.3743 -2.3652,17.3454 z",
"Bulgaria": "m 5600.6854,2342.9593 -29.5477,44.6003 14.69,15.5743 -34.4938,1.1826 -11.4322,8.8698 -4.5335,-3.3508 -0.9855,15.7686 -49.474,-6.7016 -36.662,8.4756 -15.7686,-35.2822 14.7831,-30.7488 -17.3455,-21.2876 8.6727,-14.9802 10.2496,11.8265 z",
"Croatia": "m 5180.8849,2280.5189 10.5926,21.1851 13.9376,-18.3976 28.9902,37.9103 -11.1501,2.23 94.7757,59.0954 -75.263,-80.8381 2.23,-17.2826 95.5699,12.9182 -10.6322,-34.6271 -26.9573,4.4263 -40.4669,-28.8269 -30.3361,41.092 z",
"Czech Republic": "m 5277.9459,2158.3264 48.2913,-31.9314 -105.2554,-49.8682 -75.8863,23.6529 44.152,56.3728 23.85,7.0958 8.8699,-18.7252 z",
"Denmark": "m 5040.6726,1918.6987 2.7876,-16.7251 -15.3314,-18.3976 10.3138,-5.0175 -11.9863,-13.3801 3.6238,-17.5614 34.2865,7.805 -6.1326,-18.9551 27.039,0.5575 0.2787,18.3976 19.5127,1.6725 -6.9688,8.3626 -11.9864,-1.6725 -19.2339,42.0916 8.9201,19.5126 z m 34.8441,-22.0214 13.6588,-1.9512 11.7076,6.9688 -3.9025,10.5925 -12.8226,-1.3937 z m 35.4015,-9.4775 13.9376,-8.0838 9.4775,12.265 6.4113,-19.2338 10.8714,2.5087 -10.5926,24.809 6.1325,3.9025 -9.1988,7.5263 -22.5789,-8.3626 z m 1.6725,32.3352 17.2826,4.7388 0.2787,3.345 -18.9551,-4.46 z m 20.3489,-1.3938 5.575,3.3451 -3.345,5.8538 z m -42.4429,-110.666 -31.5372,23.6529 28.7777,0.3942 z m -39.8157,23.6529 -15.7686,14.1917 3.1537,-12.6149 z",
"Estonia": "m 5486.9546,1795.4904 -26.2027,-28.9903 3.3451,-25.0876 126.5534,-5.5751 -16.7252,29.5477 1.6726,47.9454 -69.1305,-23.9727 z m -37.6315,-21.7427 -18.1189,-2.5087 -5.5751,4.7388 -6.9688,-0.2788 6.1326,14.2164 5.2963,-6.6901 10.5925,-0.2787 z m -5.0176,-17.5613 -7.5263,6.9688 -7.2475,-7.5263 7.2475,-4.1813 z",
"Finland": "m 5475.8045,1455.4129 45.1579,47.9453 -126.5534,89.7582 13.9376,91.9882 62.4404,26.7602 117.6334,-23.9727 102.0232,-103.1383 -76.3781,-176.7287 8.2271,-126.4326 -84.7562,-8.6727 -32.3256,55.9785 -126.1488,-17.7396 68.5934,33.5082 z",
"France": "m 5027.8501,2148.9479 -174.7776,-75.5418 -8.3625,4.7388 -1.6725,22.8577 -76.9356,36.7952 -7.805,-15.6101 -18.3977,1.6725 21.7427,39.0253 -98.1207,0.5575 9.4775,22.8577 98.1208,64.1129 -16.7252,112.6159 82.6499,21.0457 5.1571,-5.1568 8.2231,5.9931 33.8684,5.4357 -2.7876,-30.1053 29.5478,-13.3801 64.6704,16.7252 36.7953,-30.6628 -25.0877,-91.4306 -23.4152,13.3801 46.8304,-55.7504 z m 33.7289,224.6741 -19.5126,15.0526 12.2651,35.1228 11.7076,-27.3177 z",
"Germany": "m 5009.6827,2199.719 18.9223,-50.4595 -48.8827,-20.4992 -17.3454,-93.0347 23.6529,0 22.076,-67.8049 29.9603,9.4611 1.5769,-11.038 12.6149,-3.1537 28.3834,15.7686 -39.4215,-59.9207 34.691,6.3074 39.4214,37.8447 45.729,-22.0761 37.8446,36.2678 22.076,99.3422 -75.6892,23.6529 44.152,56.7669 -29.9603,23.6529 6.3074,17.3454 0,0 -93.0347,9.4612 -36.2677,-14.1917 z",
"Greece": "m 5369.2066,2490.2554 29.9604,39.4214 36.2677,1.5769 39.8157,22.0761 -0.3942,-12.6149 -39.4215,-24.4413 11.8265,-21.2877 -14.1918,-35.0851 13.0091,-5.9132 19.7108,16.557 3.9421,-23.2587 37.4504,-7.0958 29.1719,9.0669 12.2207,-28.7777 -13.0091,-9.8553 -1.1826,15.3743 -49.2769,-7.0958 -37.8446,8.6727 -55.5843,18.9223 z m 46.1232,45.7289 -20.8934,14.9801 17.3454,15.7686 0,20.105 11.4323,-11.8264 8.2785,17.7396 6.3074,-7.4901 12.2207,8.6728 -11.4323,-37.0562 19.3166,9.0669 -11.8265,-14.5859 z m 52.0363,96.5826 21.6818,6.7017 33.1141,1.9711 0.3942,3.9421 14.1917,-1.5769 0.3943,3.1538 -35.0852,5.1248 -13.4033,-8.2786 -25.2297,-4.3363 z m -15.3744,-118.6586 16.1629,14.5859 12.2206,1.9711 -3.5479,-7.4901 -13.4033,-2.7595 -8.6727,-10.2496 z m 89.4868,-12.2207 -11.8264,0.7884 10.2496,3.1537 -1.1827,4.3364 7.4901,-3.5479 z m 2.7595,23.6529 0.7885,15.7686 4.7305,-5.1248 z m -13.0091,1.1826 1.1827,12.2207 2.3653,-8.2785 z m -38.2388,-77.2661 -0.3942,7.0959 4.3363,-7.4901 z",
"Hungary": "m 5422.4256,2169.3644 23.6529,15.7686 -72.5355,70.5645 -70.5645,11.4322 -40.0128,-28.1863 -7.293,-12.812 26.0182,-40.2099 48.4885,5.519 52.0363,-27.9893 z",
"Iceland": "m 4380.8667,1522.8708 -118.1909,46.8304 -105.9257,-25.6452 37.9102,-18.9552 -69.1305,-26.7602 55.7504,-2.23 1.115,-18.9551 -69.1305,-4.46 36.7953,-13.3801 2.23,-39.0253 42.3703,35.6802 16.7252,23.4152 10.035,-33.4502 24.5302,27.8752 17.8401,-35.6803 17.8402,34.5653 27.8752,-27.8752 20.0701,7.805 7.8051,-32.3352 70.2455,59.0954 z",
"Italy": "m 5012.6392,2333.3578 34.8881,-16.9512 37.8446,15.7686 12.6149,42.5752 146.6479,102.4959 11.038,40.9983 -15.7686,34.6909 39.4215,-48.8826 -15.7686,-17.3455 14.1918,-33.114 39.4215,23.6529 -3.1538,-11.038 -70.9586,-47.3058 9.4611,-7.8843 -39.4215,-9.4612 -31.5372,-47.3058 -42.5752,-40.9983 7.8843,-42.5752 26.8066,-7.8843 6.3075,-28.3835 -40.9984,-14.1917 -39.3239,11.8559 -15.4806,10.2486 -1.5431,8.0186 -21.2049,-10.7231 -11.7274,26.9086 -14.8532,-23.937 -15.9681,17.8759 -25.167,4.4958 z m 47.503,102.8901 -28.3835,14.1918 14.1917,64.6512 18.9223,-11.038 4.7306,-52.0364 z m 88.5747,116.1466 16.2372,-12.0342 68.6426,-1.9991 -12.6149,50.8421 z",
"Kosovo": "m 5387.9318,2358.9818 -22.8644,22.076 16.7541,25.8211 18.1339,-5.3219 7.8843,-17.1483 z",
"Latvia": "m 5394.3378,1869.7611 11.5308,-52.0363 28.3835,-13.7975 28.7777,35.0851 27.595,-16.1628 -3.5479,-25.2298 19.3165,-7.4901 68.1992,24.4414 20.8934,56.3727 -45.729,16.9512 -49.2768,-29.5661 z",
"Liechtenstein": "m 5070.4295,2211.3187 -2.7179,10.3834 5.4357,1.3937 z",
"Lithuania": "m 5405.559,1904.7611 35.1228,15.0527 -1.6725,20.6276 16.1676,1.6725 6.1325,15.6101 64.113,-12.2651 23.9727,-57.4229 -49.0604,-29.5477 -105.9257,11.7076 z",
"Luxembourg": "m 4974.2033,2102.9392 -12.2206,0.3943 -2.0668,15.6985 19.7248,8.0896 z",
"Malta": "m 5208.367,2619.5578 -5.9132,-4.7306 4.3363,8.2785 z",
"Moldova": "m 5595.0918,2280.533 -3.1538,-54.7958 -41.7867,-55.5843 59.9206,8.2785 40.2099,65.8339 -28.7777,-2.7595 z",
"Montenegro": "m 5318.3529,2382.6347 18.9223,-31.5372 33.9025,22.8645 -11.038,12.6148 -8.2785,-3.9421 -8.2785,22.8645 z",
"Netherlands": "m 5000.8787,1989.7327 -22.3678,-14.1685 -52.4053,25.6451 -13.3801,37.9103 23.4151,3.345 -20.0701,10.0351 44.7397,11.9863 0.2788,17.2827 9.1988,-1.6725 -8.108,-44.7648 24.047,0.1971 z",
"Norway": "m 5378.7988,1311.0194 -238.6117,253.1068 -10.0351,191.7814 -37.9102,-26.7602 -75.9095,64.5912 -43.7544,-15.1217 -16.9479,-15.1216 23.6546,-18.5988 -14.9784,-24.9063 28.3852,-25.6947 -40.8009,8.9507 -3.7446,-32.0477 5.7166,-21.798 -7.6868,-13.9138 26.6618,-10.4232 3.7974,-14.3653 29.8156,-6.4811 14.5135,-21.7686 41.3202,-7.5769 10.8047,-24.2876 22.6312,-21.1339 13.17,-12.4612 65.0616,-57.5753 -6.5407,-10.8843 33.6692,-14.038 -27.04,-3 16.3238,-13.2496 -3.387,-9.3075 47.8609,-10.0958 10.0163,-19.5571 -20.9226,-13.8768 37.4213,-2.8389 10.5563,-29.0157 24.8064,-9.9347 16.922,-26.4917 19.2874,-2.0505 3.5709,-19.7895 48.9743,-1.8918 38.2617,3.8634 -9.8324,-22.1548 50.0882,11.7477 35.8965,-47.3845 20.9163,6.2287 -17.7168,35.4006 42.9923,-34.7696 1.994,22.7857 39.8387,-31.6159 3.5708,26.7278 76.1064,-13.482 -46.8303,80.2806 2.23,-28.9902 -85.8556,-8.9201 -32.3353,55.7504 z",
"Poland": "m 5198.1675,1973.3341 112.6158,-51.2903 26.7602,21.1851 117.0759,-1.115 23.4152,61.3255 -24.5302,17.8401 26.7602,68.0155 -42.3703,32.3352 7.805,25.6452 -119.3058,-21.1852 -105.9258,-50.1753 z",
"Portugal": "m 4550.2803,2408.9757 2.8271,41.4186 -22.4026,69.4079 20.1725,4.7566 -3.8745,50.8797 39.0253,-2.23 34.5653,-152.7561 z",
"Republic of Ireland": "m 4621.7752,1951.3636 -7.8843,70.1703 -84.362,29.1719 -3.9421,-13.4033 -26.0182,1.5768 47.3058,-37.0562 -15.7686,2.3653 18.9223,-23.6529 -36.2678,-2.3653 14.1918,-22.8644 -13.4033,-11.8265 44.152,1.5769 7.8843,-18.9223 -5.519,-14.9802 31.5372,-6.3074 -1.5768,13.4033 -19.7108,18.9223 14.9802,14.1917 12.6149,-11.8264 z",
"Republic of Macedonia": "m 5381.6244,2407.076 50.8537,-14.9801 15.1773,35.2822 -54.5988,18.7252 -16.3599,-19.5136 z",
"Romania": "m 5370.7835,2255.6975 78.0545,80.4198 151.3785,5.5191 31.5372,-59.9207 -37.0562,1.5769 -3.1537,-56.767 -42.5752,-56.7669 -46.5173,24.4413 -56.767,-9.4612 z",
"Slovakia": "m 5281.7931,2186.3007 49.0604,5.0175 51.2904,-27.3177 40.1403,5.0176 13.939,-23.5037 -109.986,-19.7107 -48.6855,32.9169 z",
"Slovenia": "m 5173.4789,2262.5963 16.9513,6.8987 -9.2641,11.2351 51.248,-0.9855 29.9603,-41.7868 -6.7017,-11.4322 -52.8247,15.9657 -23.0616,-8.2785 z",
"Spain": "m 4883.7353,2390.3472 -32.3352,-5.2963 -14.2163,4.7388 -1e-4,-5.575 -82.7893,-21.7427 -216.3116,-14.4952 11.15,60.2105 72.4756,12.2651 -35.6803,152.7561 16.6739,-0.4967 37.9615,42.867 14.297,-17.5334 84.4673,-13.5912 11.5375,-19.1102 25.7292,-8.8606 4.9581,-21.7789 17.1788,-14.683 -13.1758,-27.2979 34.5242,-53.3161 61.3254,-26.7602 z m -0.2014,89.2644 -16.1629,11.038 17.7397,7.8843 9.4612,-12.6149 -7.4901,0 z m 25.2297,-5.519 7.4901,0 0.3942,7.4901 z m -68.1992,32.7198 -7.8843,6.3075 5.519,1.1826 z",
"Svalbard": "m 5336.0926,818.38999 -72.5355,115.11074 -72.5355,-61.49752 80.4198,-18.92231 -93.0347,0 94.6116,-45.72893 -118.2645,31.53719 -74.1124,-107.22645 93.0347,17.34546 47.3058,-6.30744 40.9983,42.57521 -7.8843,-67.80496 148.2248,81.99669 z m 40.9984,1.57686 25.2297,29.96033 -14.1917,23.65289 47.3058,-6.30744 -9.4612,22.07604 66.2281,-31.53719 -45.7289,-11.03802 6.3074,-12.61488 -42.5752,-3.15372 12.6149,-18.92231 z m -11.038,-69.38182 99.3421,26.80661 100.919,-50.45951 -93.0347,-23.65289 -22.076,18.92232 1.5768,-28.38348 -23.6529,25.22976 -74.1123,-22.07604 -37.8447,31.53719 107.2265,4.73058 z",
"Sweden": "m 5131.267,1755.9076 33.4503,141.606 43.4853,4.46 2.23,-36.7952 50.1754,-2.2301 7.805,-110.3857 63.5555,-33.4503 -52.4054,-47.9453 31.2202,-92.5457 166.1362,-122.6509 -28.9902,-111.5008 -69.2657,-33.1236 -238.347,252.6507 z m 200.9802,42.9278 -7.2475,17.0039 3.0662,1.6725 -12.8226,12.2651 -4.7387,-18.6764 z",
"Switzerland": "m 5071.5744,2207.012 -4.1393,14.783 34.0996,9.2641 -17.4336,11.039 -1.8235,8.2514 -20.7786,-10.7037 -11.8586,26.6491 -15.099,-23.3021 -15.6565,17.3957 -24.5766,4.5731 -6.7017,-23.4558 -23.2587,13.0091 46.1232,-55.1901 26.0182,-5.9132 z",
"Ukraine": "m 5690.4436,2024.067 66.343,-4.46 9.4775,40.6978 166.6937,65.2279 -11.7075,65.228 -44.6004,24.5302 -118.7933,36.0901 29.4315,29.7827 38.3639,-2.7205 -1.8461,15.4133 -27.0758,-1.1437 -48.3825,24.5971 -27.095,-37.6888 24.9414,-25.8624 -45.1578,-9.4776 18.3976,-8.3626 -47.9453,-0.5575 -13.3801,16.7252 -25.529,27.3313 -36.1729,2.1015 25.3247,-39.6853 29.8107,4.2045 -41.9364,-67.5426 -58.5379,-8.92 -48.5029,23.4151 -56.8654,-8.92 -23.4151,-16.1677 12.8225,-22.3001 11.7076,3.345 -8.92,-27.8752 41.8128,-32.3352 -16.1677,-45.1579 197.3565,14.4952 z",
"United Kingdom": "m 4812.3747,2077.0299 -112.6158,6.69 -55.7504,23.4152 41.2553,-42.3703 27.8752,2.23 17.8402,-26.7602 -33.4503,14.4951 -44.6003,-17.8401 32.3352,-23.4152 -6.69,-18.9551 -8.9201,1.115 20.0702,-11.1501 24.5301,-1.115 -12.2651,-70.2455 -47.9453,6.6901 8.9201,-46.8304 -21.1852,12.2651 11.1501,-44.6003 -25.6452,18.9551 30.1052,-89.2006 50.1754,1.115 -30.1052,42.3703 65.7854,-5.575 -46.8303,65.7854 46.8303,10.0351 21.1852,50.1754 27.8752,25.6451 -18.9551,5.5751 36.7952,16.7251 -15.6101,15.6101 15.6101,5.5751 16.7252,-8.9201 17.8401,15.6101 -23.4152,35.6803 -12.2651,6.69 25.6452,6.6901 z m -219.3772,-168.6357 30.7488,-0.3942 12.6149,33.114 -13.7976,11.0381 -22.8644,-12.6149 -13.7975,12.6149 -13.7976,-14.9802 20.105,-19.7108 z",
"Vatican City": "m 5146.041,2401.9153 0.6968,-0.4181 0.5575,0.8362 -0.5575,0.2788 z",
"San Marino": "m 5153.3582,2340.2414 -4.8085,-4.1813 -2.7875,3.3451 5.4357,4.3903 z",
"Serbia": "m 5330.5736,2263.5818 20.4991,64.257 -13.7975,23.2587 35.0851,22.8645 15.7686,-14.9802 19.7108,25.6239 -7.4902,16.5572 32.3257,-9.067 14.586,-30.3546 -17.7397,-20.8934 9.0669,-14.5859 -68.1991,-70.1703 z"
},
"North America": {
"Antigua and Barbuda": "m 3055.1653,3240.052 4.7306,3.1537 3.9422,-4.3363 -5.1248,-1.5769 z m 4.7306,-33.9025 11.038,11.8265 -9.0669,-1.1827 1.9711,-2.7595 z",
"Barbados": "m 3115.8744,3350.4322 -2.7595,7.4901 2.3653,5.1248 5.1248,-5.5191 z",
"Belize": "m 2276.8465,3210.4355 -1.115,67.458 25.6451,-27.8752 8.9201,-65.228 z",
"Canada": "m 1327.7157,2144.5288 785.2761,0 326.4099,107.2265 31.5372,116.6876 -23.6529,34.6909 113.5339,-29.9603 4.7305,-28.3835 83.5736,-25.2297 25.2298,-23.6529 99.3421,0 72.5355,-93.0347 34.691,11.038 15.7685,81.9967 78.843,-33.1141 17.3455,23.6529 -69.3818,36.2678 17.3454,33.114 124.5719,-72.5355 -94.6116,-44.1521 -18.9223,-45.7289 26.8066,-40.9984 -70.9586,-11.038 -88.3042,63.0744 94.6116,-107.2264 182.9157,3.1537 122.9951,-69.3818 -9.4612,-61.4976 -44.1521,-23.6529 -88.3041,47.3058 85.1504,-61.4975 -134.0331,-78.843 31.5372,-17.3454 -100.919,-134.0331 -77.2661,97.7653 -52.0364,-63.0744 -14.1917,-69.3818 -99.3421,-55.1901 -132.4562,-4.7305 20.4991,107.2264 -26.8066,56.7669 61.4975,64.6513 -91.4578,96.1884 22.076,124.5719 -55.1901,7.8843 -45.7289,-77.2661 3.1537,-80.4198 -253.8743,-86.7273 -45.729,22.076 -11.038,-78.843 -50.4595,-3.1537 40.9984,-138.7636 86.7272,-47.3058 -104.0727,-36.2678 111.957,17.3455 93.0347,-58.3438 -138.7636,-42.5752 132.4562,23.6529 26.8066,-28.3835 -29.9603,-39.4215 135.6099,42.5752 31.5372,-56.7669 -39.4215,-56.767 47.3058,-9.4611 -107.2265,-61.4975 -53.6132,121.4181 -42.5752,-12.6148 6.3074,-40.9984 -39.4214,-44.1521 -18.9224,59.9207 -74.1124,-72.5355 11.0381,-39.4215 -55.1901,-58.3438 -58.3438,12.6149 -9.4612,67.8049 91.4579,31.5372 -3.1537,48.8826 -52.0364,22.0761 -1.5769,59.9206 -28.3834,-69.3818 -39.4215,-18.9223 15.7686,39.4215 -236.529,-31.5372 -66.2281,20.4992 23.6529,75.6892 -86.7272,-77.2661 -146.648,7.8843 40.9984,-33.114 -52.0364,-22.0761 -7.8843,6.3075 -197.1074,-47.3058 -28.3835,25.2297 -17.3455,-31.5371 -17.3454,25.2297 -78.843,-50.4595 -227.06777,83.5736 -138.76364,-42.5752 -1.57685,405.2528 118.26446,56.7669 39.42149,-28.3834 156.10911,159.2629 -4.7306,61.4974 z m -25.2297,3.1538 -75.6893,-56.767 -56.7669,-12.6149 91.4578,78.843 53.6132,15.7686 z m 1906.4231,-96.1885 -91.4578,151.3786 132.4562,-6.3075 -34.6909,36.2678 66.2281,-31.5372 14.1917,45.7289 12.6149,-59.9206 -42.5752,-14.1918 11.038,-47.3058 -50.4595,22.0761 -7.8843,-36.2678 -22.076,12.6149 z m -698.5487,-506.1719 -141.9174,-88.3041 -11.038,86.7273 -26.8066,12.6148 47.3058,-1.5768 4.7305,40.9983 64.6513,-61.4975 z m 414.714,88.3042 -258.6049,-122.9951 -70.9587,25.2298 -6.3075,-50.4595 122.9951,-4.7306 -22.076,-64.6513 81.9966,-4.7305 -209.7223,-173.4546 -124.5719,23.6529 -178.1851,-28.3835 1.5769,-122.995 121.4181,-37.8446 -58.3438,75.6892 156.1091,-75.6892 26.8066,34.6909 6.3075,70.9587 99.3421,-52.0364 168.724,111.957 81.9967,-6.3074 37.8446,77.2661 -74.1124,7.8843 223.9141,104.0727 -48.8827,75.6893 -113.5338,-72.5356 -22.0761,28.3835 104.0727,104.0727 -22.076,34.691 -100.919,-40.9984 z M 1526.4,1084.8792 l -89.881,-34.6909 -18.9223,12.6149 -148.2248,-23.6529 -12.6149,124.5719 61.4976,50.4595 z m 44.1521,15.7686 -141.9174,72.5356 107.2265,14.1917 -86.7273,33.1141 198.6843,23.6529 -165.5702,22.076 107.2264,47.3058 6.3074,23.6529 192.3769,-44.1521 135.6099,34.6909 -52.0363,-42.5752 c 7.8843,-3.1537 75.6892,-9.4612 75.6892,-9.4612 l -107.2264,-58.3438 -20.4992,-89.8809 -75.6893,-26.8067 9.4612,89.881 -64.6512,-70.9586 -59.9207,42.5752 15.7686,-31.5372 -55.1901,-11.038 -23.6529,18.9223 z m 436.7901,100.9191 -134.0331,-85.1505 85.1504,15.7686 -9.4611,-45.7289 97.7653,-20.4992 -34.6909,64.6513 55.19,6.3074 -17.3454,45.7289 z m -190.8,-219.18352 -257.0281,56.76692 67.8049,-36.2677 -152.9553,-3.15377 48.8826,-34.69091 -17.3455,-18.92231 33.1141,-20.49918 113.5339,50.45951 63.0744,15.76859 -9.4612,-83.57355 25.2298,50.4595 70.9586,1.57686 z m -302.7571,-102.49587 -67.8049,1.57686 -129.3025,74.1124 94.6116,14.19173 50.4595,-66.2281 17.3454,37.84463 44.1521,-22.07603 z m 1013.9207,149.80169 -335.8711,4.7305 -7.8843,-86.72723 -115.1107,-18.92232 0,-28.38347 170.3008,26.80661 -18.9223,37.84463 72.5356,25.22976 195.5305,-23.6529 56.767,22.07604 z m -299.6033,45.7289 -31.5372,55.1901 -66.2281,-4.7306 9.4612,34.6909 -20.4992,6.3074 -36.2678,-59.9206 26.8066,-47.3058 z m -197.1074,-140.34051 -7.8843,80.41981 -69.3818,-3.1537 40.9983,-44.15206 -102.4959,20.49918 -58.3438,-74.1124 77.2661,64.65124 6.3075,-45.72893 45.7289,28.38347 -6.3074,-50.4595 z m 544.0165,-7.8843 -324.8331,-9.46115 108.8034,-18.92232 -64.6513,-58.3438 115.1108,39.42149 -72.5356,-63.07438 -122.995,12.61487 -197.1075,-113.53388 157.686,-78.84298 104.0727,72.53554 -78.843,-102.49587 268.0662,-33.11405 288.5653,-44.15207 305.9107,47.30579 -457.2893,181.33885 -26.8066,42.5752 100.919,-7.8843 -96.1884,86.72728 -110.3802,-11.03802 z m -585.0149,-93.03471 -85.1504,-58.3438 -4.7306,17.34545 -94.6115,-39.42148 58.3438,52.03636 -31.5372,7.8843 102.4958,23.65289 48.8827,23.65289 z m 159.2628,173.45452 -58.3438,-33.11402 -25.2297,39.42152 72.5355,17.3454 z M 1706.162,813.65941 c -6.3074,-3.15372 -119.8413,11.03802 -119.8413,11.03802 l 72.5355,15.76859 -70.9587,14.19174 52.0364,47.30578 37.8446,-28.38347 z m 383.1769,504.59509 -70.9587,-55.1901 1.5769,31.5372 -31.5372,15.7686 80.4198,25.2297 z m 561.362,26.8066 -44.1521,31.5372 22.076,22.076 44.1521,-9.4612 z m -633.8976,-548.74715 52.0364,64.65124 26.8066,-4.73057 -12.6149,22.07603 78.843,-11.03802 -59.9207,-17.34545 11.0381,-29.96033 z",
"Costa Rica": "m 2432.1113,3435.1096 23.694,34.844 0,43.2066 -15.0526,-17.0039 c 0,0 0.8362,13.3801 -0.2788,12.2651 -1.115,-1.115 -5.8538,-22.3001 -5.8538,-22.3001 l -47.9453,-35.959 10.3138,19.5126 -25.9239,-18.9551 5.2962,-30.384 z",
"Cuba": "m 2417.3257,3081.9718 60.709,-26.0181 13.4034,7.0958 -10.2496,7.8843 86.7272,17.3455 20.4992,38.633 22.8645,-7.0958 8.6727,11.038 -18.9223,16.557 100.919,-7.8843 -49.6711,-22.076 7.8843,-6.3075 -145.8595,-66.2281 -38.633,-1.5768 -54.4017,11.8264 -7.8843,18.1339 z",
"Dominica": "m 3061.2757,3286.1752 3.3508,7.6871 1.1826,-4.9276 -2.7595,-3.1538 z",
"Dominican Republic": "m 2770.148,3148.5941 -3.9422,57.1612 12.6149,13.4033 20.8934,-27.595 6.7016,9.4611 18.1339,-11.4322 37.4504,7.8843 2.3653,-7.4901 -13.7975,-16.1628 -22.076,-1.1826 -11.038,-17.3455 -26.4124,-7.0959 z",
"El Salvador": "m 2250.0863,3340.334 40.9765,16.7251 24.5302,1.9512 3.6238,-22.3001 -20.9064,0 -27.8752,-18.1189 z",
"Gaudeloupe": "m 3060.093,3258.9743 -1.9711,4.5335 -5.3219,-0.5913 0.9856,8.2785 4.1392,-1.1827 -0.1971,-3.745 3.7451,-2.9566 5.519,0.1971 z",
"Greenland": "m 3552.4157,1697.9271 -182.8613,-95.8907 -93.6607,-227.4617 100.3507,-15.6101 -22.3001,-109.2708 -60.2105,57.9805 -60.2104,-66.9005 111.5008,-22.3002 -122.6509,-35.6802 -20.0701,-156.1012 -129.341,-82.51057 -238.6117,15.61012 -109.2708,-138.261 236.3817,-60.21044 -82.5106,-60.21043 245.3018,-111.50081 267.6019,28.99021 -44.6003,-62.44045 140.491,26.76019 -4.46,-66.90048 216.3116,11.15008 379.1027,-24.53018 -20.0701,22.30016 133.8009,24.53018 -138.261,46.83034 104.8108,4.46003 -15.6101,46.83034 323.3523,-26.76019 -142.721,80.28058 -140.491,153.87111 111.5008,37.91027 -78.0506,66.90049 31.2202,53.52035 -91.4306,122.6509 8.92,115.9609 -78.0505,-51.2904 -8.9201,42.3703 78.0506,26.7602 -289.9021,102.5807 -40.1403,73.5906 -162.7912,26.7602 z",
"Grenada": "m 3053.5885,3382.7578 -4.7306,5.9132 1.9711,5.1248 3.9421,-5.1248 z",
"Guatemala": "m 2276.8465,3210.7142 -49.0604,2.5088 -18.3976,15.6102 34.0077,45.7153 -39.0253,-8.3626 -12.265,50.7329 57.9804,22.8577 54.0779,-57.423 -28.4327,-5.0175 z",
"Haiti": "m 2769.7538,3148.9884 -3.1538,56.7669 -60.7091,-3.1537 -14.9801,-14.9802 63.0744,3.1537 -29.9604,-44.152 z",
"Honduras": "m 2305.0004,3281.796 103.417,-7.2475 32.614,26.7602 -35.4015,14.2163 -7.2476,-9.7563 -24.8089,33.729 -8.6413,-5.2963 -20.3489,8.0838 -7.5263,24.8089 -19.7914,-18.9551 2.5088,-11.9863 -20.9064,0.5575 -28.154,-18.6764 z",
"Jamaica": "m 2638.8744,3206.5437 -24.4413,-12.6148 -31.5372,2.3653 17.3455,15.7685 24.4413,-3.9421 z",
"Martinique": "m 3069.7513,3308.6454 3.745,9.4612 3.3508,0.1971 -2.7595,-6.5046 z",
"Mexico": "m 1484.0757,2734.8846 43.4853,88.0856 47.9454,49.0604 3.345,32.3352 -27.8752,-13.3801 74.7056,56.8654 5.575,40.1403 65.7855,63.5555 4.46,-16.7251 -34.5652,-40.1403 -26.7602,-68.0155 -84.7407,-117.0759 -7.805,-55.7504 57.9804,27.8752 41.2553,100.3507 168.3662,188.4364 0,61.3255 17.8402,36.7952 235.2667,112.6158 47.9453,-24.5301 75.8206,59.0954 12.265,-49.0604 37.9103,6.6901 -32.3352,-44.6003 17.8401,-15.6102 46.8304,-2.23 36.7952,-26.7602 31.2202,-88.0856 -99.2357,13.3801 -30.1052,82.5106 -123.7659,-4.46 -63.5554,-117.0759 25.6451,-110.9433 -50.7328,-22.8577 -66.343,-109.8283 -32.8927,-6.1325 -24.5302,35.6803 -88.0857,-96.4482 -47.9453,1.6725 -3.345,13.9376 -76.9356,-1.115 -109.8283,-43.4853 z",
"Nicaragua": "m 2439.9164,3301.8662 -7.8051,132.9647 -29.5477,-7.5263 -26.4814,-36.5165 -8.6413,2.5087 8.6413,28.154 -54.9142,-54.3567 16.7252,2.2301 6.9688,-27.039 19.7914,-8.0838 9.1988,6.4113 24.5301,-35.4015 6.9688,10.8713 z",
"Panama": "m 2456.084,3469.6749 41.8128,29.269 57.1442,-27.8752 56.8654,32.6139 4.46,18.1189 -18.1189,24.8089 -17.2826,-28.1539 21.7427,-1.9513 -41.5341,-28.7114 -39.8615,26.7602 15.8889,25.0876 -25.0877,6.9688 -4.4601,-24.5301 -6.9688,9.1988 -23.4151,-18.1189 -21.4639,2.5088 z",
"Puerto Rico": "m 2897.8736,3191.9578 42.181,4.7306 -5.1248,10.6438 -36.2678,0 3.1537,-7.0959 z",
"Saint Kitts and Nevis": "m 3020.6715,3239.0665 0.3942,-1.774 -1.7739,0 -0.9856,-1.3797 0.3943,-1.5769 -2.7596,-0.7884 -0.9855,3.745 2.9566,-0.3942 z",
"Saint Lucia": "m 3075.4674,3333.4809 -4.1393,6.5046 3.9422,1.3797 z",
"Saint Vincent and the Grenadines": "m 3068.9628,3350.4322 -6.3074,6.3074 3.1537,8.6727 4.7306,-7.8843 z",
"The Bahamas": "m 2589.9918,2978.6875 -1.1827,25.2298 12.2207,-8.6727 z m 11.8264,21.2876 -8.6727,6.7017 9.0669,14.586 z m -26.4124,-66.6223 13.7975,-3.9421 -10.6438,-1.9711 z m 51.248,0.7885 -3.548,5.9132 3.548,0 -7.0959,6.3074 5.1248,4.3364 5.9132,-13.0091 1.5769,-0.7884 -14.586,-15.3744 -10.2496,0.7884 8.6727,1.1827 z m -10.2496,39.8157 9.8553,-2.7595 -5.1248,6.3074 z m 100.5248,137.1867 4.7305,-5.1247 9.4612,2.3652 -4.3364,3.548 z m -58.3438,-143.4942 26.8066,22.0761 -2.3653,33.9024 -2.3653,-1.1826 3.1537,-32.3256 z",
"Trinidad and Tobago": "m 3072.3137,3435.1884 -2.1682,10.8409 2.5624,7.0959 -16.3599,1.7739 6.5045,-9.0669 -3.745,-9.4612 z m 6.3074,-7.4901 6.5046,-3.3508 -4.3364,0 z",
"United States": "m 2114.0553,2143.9303 -787.1957,0 17.8401,63.5555 -30.1052,11.15 12.2651,-27.8752 -55.7504,-15.6101 32.3352,79.1656 -27.8752,118.1909 30.0705,141.007 85.1504,151.3785 80.4198,29.9603 14.1918,39.4215 66.0368,-2.9624 109.298,43.8583 76.9627,0.373 3.1537,-14.4623 48.8827,0 86.7272,94.6116 25.2298,-34.6909 33.114,6.3074 66.2281,108.8033 48.8827,22.0761 -14.1918,-61.4976 86.7273,-74.1124 160.8397,26.8067 -40.9984,-42.5753 130.8794,-3.1537 25.2297,26.8066 18.9224,-14.1917 36.2677,25.2298 18.9223,78.8429 48.8827,61.4976 14.1917,-67.805 -44.152,-129.3025 151.3785,-163.9934 0,-33.114 -33.1141,-25.2298 31.5372,3.1537 -22.076,-42.5752 14.1917,6.3075 3.1537,-37.8447 17.3455,0 -11.038,36.2678 20.4991,15.7686 -14.1917,36.2678 29.9603,-47.3058 -11.038,-31.5372 15.7686,7.8843 22.076,-77.2662 96.1885,-15.7685 7.8843,-78.843 87.5157,-40.2099 -17.3455,-83.5736 -33.9025,-10.2496 -73.3239,92.2463 -98.5537,0 -26.0182,25.2298 -82.7851,23.6529 -4.7306,29.1719 -115.8992,30.7487 25.2297,-36.2677 -31.5371,-116.6876 z m 595.7778,304.144 49.6711,-10.2496 -22.0761,10.2496 z m -1593.4166,-511.6909 -91.4578,-113.5339 39.4215,99.3422 -55.1901,-99.3422 -23.6529,42.5752 -15.76859,-86.7273 -45.72893,0 -145.07107,-72.5355 -182.91571,-39.4215 4.73058,42.5752 -100.91901,33.1141 23.65289,-80.4199 -85.15041,77.2662 25.22975,14.1917 -99.34215,72.5355 -324.833062,167.1471 312.218182,-193.9537 3.15372,-42.5752 -48.88264,-9.4612 0,31.5372 -77.26612,-20.4991 -15.76859,-81.9967 -37.84463,48.8826 -67.80496,-86.7273 149.80165,-99.3421 -18.92231,-36.2678 -134.03306,17.3455 -53.613225,-55.1901 96.188435,-34.6909 102.49587,18.9223 20.49917,-18.9223 -201.83802,-96.1884 216.02975,-108.8034 102.49587,-26.8066 424.17522,83.5736 -2.36529,405.2529 119.05289,58.3438 38.63306,-29.1719 155.32064,159.2628 z m -697.17347,1222.2042 -22.30016,-22.3001 -6.69005,40.1403 z m -31.22022,-40.1402 -22.30017,-4.4601 15.61012,15.6101 z m -51.29037,-20.0702 -6.69005,-8.9201 -4.46004,8.9201 z m -46.83034,-26.7602 -13.3801,11.1501 11.15008,0 z"
},
"South America": {
"Argentina": "m 3274.2212,4572.4179 5.575,54.0779 -108.7133,100.3507 -29.5477,132.6859 38.4678,41.2553 -5.575,31.2203 18.3976,5.575 -26.2027,64.113 -105.3683,24.5302 -27.8752,-8.9201 5.0176,70.803 -27.8752,15.6101 -51.2904,-17.8401 7.2476,60.2104 -26.7602,92.5457 -59.653,51.8479 33.4503,32.3352 24.5302,-2.23 -7.8051,40.1403 -45.7153,28.4327 -6.6901,45.7153 -23.9727,-17.2826 6.1326,17.2826 -22.8577,34.0078 23.9727,46.2728 -90.5944,-13.3801 -20.6277,-54.3567 -20.6276,6.4113 -7.2476,-51.8478 34.844,-43.4853 23.1365,-142.9998 -14.2164,-102.302 61.6042,-275.9645 -23.6939,-80.0018 66.343,-147.7386 -6.4113,-71.6393 30.3839,-10.5926 8.0838,-53.2416 23.1365,-21.7427 55.7504,35.6803 8.3625,-29.8265 37.074,4.4601 46.2729,53.7991 99.2357,49.0604 -34.2865,70.5242 77.7718,0 38.189,-29.2689 4.4601,-28.9902 z m -414.783,961.1369 -1.6725,81.3956 57.9804,5.5751 42.9278,-7.8051 -37.9103,-7.8051 -49.0603,-39.0252 z",
"Bolivia": "m 2833.2355,4310.391 50.7329,180.6313 41.2553,-39.0253 56.3079,36.2378 7.805,-30.1053 37.3528,4.4601 26.7602,-81.3956 68.0155,-11.7076 34.5652,23.4152 -5.0175,-117.0759 -53.5204,0 -10.0351,-76.9355 -128.7834,-57.9805 -8.9201,-75.263 -116.5183,44.6003 23.4152,48.5029 -18.3977,90.3156 15.0526,28.4327 z",
"Brazil": "m 2798.1372,4111.6611 35.3742,-1.5769 116.3986,-43.3636 9.0669,74.9008 128.9083,57.5554 10.2496,77.2661 53.6132,0 7.4901,183.3099 60.7091,12.2207 11.8264,50.4595 34.6909,-1.5768 -8.4814,57.2765 16.3657,-4.4518 4.7306,52.8248 -107.2265,100.9191 123.7835,81.9966 -8.6727,47.3058 66.2281,-131.6677 14.9801,0.7884 -14.9801,45.7289 67.0165,-108.0149 2.3653,-100.1305 112.7455,-73.324 75.6892,-3.9422 88.5885,-208.1095 -4.4601,-118.1908 c 0,0 115.9609,-115.9608 115.9609,-124.8809 0,-8.9201 -15.6102,-107.0408 -15.6102,-107.0408 l -227.4616,-86.9706 -35.6803,37.9103 2.2301,-62.4405 -91.4307,-24.5302 -44.6003,49.0604 30.1052,-61.3254 -53.5204,-5.5751 -28.4327,15.0526 42.9278,-73.033 -49.0603,-80.2806 -37.9103,69.1305 -107.0408,-2.23 -57.9804,28.9902 -42.3703,-51.2904 17.8401,-35.6802 -31.2202,-35.6803 -66.9005,49.0604 -49.0604,-20.0702 42.3704,64.6705 -62.4405,44.6003 -40.1403,-16.7251 -11.7076,-26.7602 -72.4755,10.0351 19.5126,96.4482 -17.8401,92.5456 -87.5281,16.1676 -30.6627,91.4307 56.8654,73.5905 43.4853,-23.4151 z",
"Chile": "m 2809.9637,4342.671 -1.5769,264.9124 -34.6909,124.5719 0,115.1108 -53.6132,127.7256 -17.3455,220.7603 26.8066,-80.4198 17.3455,4.7306 -26.8066,173.4545 -34.6909,-22.076 -28.3835,42.5752 44.1521,-4.7306 3.1537,18.9223 -11.038,18.9223 22.076,14.1918 -39.4215,50.4595 28.3835,9.4611 6.3074,70.9587 39.4215,17.3455 -22.076,33.114 37.8446,3.1537 -25.2297,37.8447 45.7289,-7.8843 6.3074,-45.7289 50.4595,-15.7686 -72.5355,-12.6149 -20.4992,-53.6132 -20.4992,6.3074 -7.8843,-52.0364 34.691,-42.5752 23.6528,-143.4942 -14.1917,-102.4959 20.4992,-100.919 40.9983,-175.0314 -23.6529,-80.4198 66.2281,-146.648 -6.3074,-72.5355 29.9603,-11.038 8.6728,-53.6132 -18.1339,16.9512 -51.6422,-180.9446 z m 49.7532,1192.2776 -23.1364,-8.3626 -31.499,23.6939 4.7388,8.0839 28.7115,-3.3451 -23.4152,23.6939 35.1228,23.1365 -50.7329,-6.6901 7.5263,17.0039 39.5828,6.4113 11.1501,-3.6238 z",
"Colombia": "m 2616.01,3521.1272 12.6148,4.7306 -0.7884,-25.2298 33.1141,-22.8644 6.3074,-52.0364 119.0529,-39.4215 -61.4975,99.3422 29.9603,29.9603 3.9421,38.6331 134.0331,24.4413 14.1917,153.7438 -12.6148,-28.3835 -72.5356,10.2496 18.9223,96.9769 -18.9223,91.4578 -24.4413,-18.9223 21.2876,-34.6909 -84.362,-5.519 -62.2859,-74.9008 -105.6496,-40.9984 52.0363,-81.2083 -20.4991,-100.919 z",
"Ecuador": "m 2566.3389,3727.6958 -30.7488,17.3455 -22.8644,106.438 32.3256,-22.076 -22.0761,78.0545 45.729,19.7107 29.9603,-65.4396 55.1901,-30.7488 18.9223,-63.0744 z",
"Falkland Islands": "m 3119.2351,5485.8882 -32.8928,28.4327 6.1326,-15.0526 6.9688,-0.8362 1.9512,-8.3626 -10.8713,-5.2963 z m 16.7251,-6.1325 -3.6238,16.1676 9.7563,4.7388 20.9064,-7.2476 -15.0526,-5.0175 -1.9512,-7.2476 z m -8.0838,16.7251 11.4288,9.1988 -15.8889,-1.6725 4.1813,7.5263 -6.1325,-1.3937 -5.0176,3.6237 0,-10.8713 z",
"French Guiana": "m 3340.5642,3633.0236 -68.573,-43.4853 -17.2827,35.1227 16.7252,35.6803 -16.7252,42.9278 47.9454,1.6725 z",
"Guyana": "m 3184.463,3585.0782 -35.6802,-27.5964 -12.5439,17.8401 9.7564,-32.3352 -38.7466,-33.1715 -26.2027,27.3177 11.7076,12.5438 -25.9239,13.9376 -4.1813,23.1364 51.0116,57.9805 -18.1189,34.844 41.8128,51.5691 57.423,-28.7115 -17.8402,-36.7952 -9.1988,-1.9513 -10.5926,-45.4366 22.3002,-4.46 z",
"Paraguay": "m 3026.7819,4463.3008 45.7289,52.8248 100.1306,49.671 -34.6909,70.1703 77.2661,0 37.8446,-29.1719 14.1917,-86.7273 -35.4793,1.5769 -12.6149,-50.4595 -60.7091,-12.6149 -2.3653,-66.2281 -34.6909,-23.6529 -68.5934,12.6149 z",
"Peru": "m 2822.5786,3903.5156 -86.7273,15.7686 -31.5372,92.2463 57.5554,73.324 42.5752,-23.6529 -7.0959,51.2479 36.2678,-2.3653 22.8644,48.8827 -18.9223,90.6694 15.7686,27.5951 -42.5752,63.8628 -171.8777,-134.0331 -104.8611,-235.7405 -29.9604,-16.557 8.6728,-5.519 -15.7686,-48.0942 34.6909,-27.5951 -9.4612,33.1141 46.5174,19.7107 30.7487,-64.6512 54.4017,-31.5372 19.7107,-60.7091 60.7091,74.1124 85.1504,4.7306 -22.8644,34.6909 z",
"Suriname": "m 3272.5487,3588.7021 -88.6432,-4.1814 -3.9025,29.5477 -22.8577,4.4601 10.732,45.5759 9.5473,1.6028 17.3523,36.7256 59.9316,0.8363 16.1677,-43.4853 -16.7252,-35.6803 z",
"Uruguay": "m 3172.1979,4727.6828 -29.5477,130.7346 76.9356,25.0877 43.4853,-3.345 25.0877,-25.0877 7.2475,-46.2728 z",
"Venezuela": "m 3107.2017,3508.9065 -54.7959,-4.3363 26.0182,-26.4124 -61.1033,-21.2876 3.1537,-19.3165 -63.4686,22.076 -34.2967,-19.3165 -52.4305,5.9132 -11.4323,-36.662 -78.4487,20.4992 -1.5769,14.5859 14.1917,31.5372 -13.0091,16.557 -22.076,-29.1719 12.2207,-20.1049 -4.7306,-23.2587 -40.2099,65.0455 29.5661,30.3545 3.9421,38.2388 133.6389,24.8356 14.1917,151.3785 39.4215,16.9512 61.8917,-44.5462 -42.1809,-65.0455 48.8826,20.4992 67.4107,-49.2769 -18.9223,-22.4702 4.3364,-22.8645 24.8355,-14.1917 -11.4322,-12.6149 z"
},
"Oceania": {
"Australia": "m 8822.529,4112.4495 107.2265,253.8744 187.6463,206.5686 -1.5769,214.4529 -97.7653,189.2232 -97.7653,42.5752 -33.114,-37.8447 -29.9603,36.2678 -111.9571,-33.114 -56.7669,-179.762 -58.3438,80.4198 -55.1901,-100.919 -137.1868,-12.6149 -151.3785,75.6893 -184.4926,42.5752 -61.4975,-39.4215 25.2298,-12.6149 -59.9207,-234.952 25.2298,1.5768 -25.2298,-132.4562 227.0678,-107.2264 37.8446,-75.6893 15.7686,31.5372 94.6116,-121.4182 36.2677,44.1521 42.5753,-6.3075 23.6528,-80.4198 69.3819,-23.6529 110.3801,14.1917 -47.3058,81.9967 148.2248,97.7653 z m 61.8553,979.5621 51.2903,101.4658 52.4054,-63.5555 -4.46,-37.9103 -43.4853,15.6101 z",
"Federated states of Micronesia": "m 9700.2911,3680.4115 -1.6725,-0.8362 -1.3938,1.6725 1.115,0.5575 z m -390.1134,-1.6725 -0.2788,0.6969 1.3938,0.1394 z m -22.4396,-56.0291 -2.23,2.23 1.3938,0.8363 2.5087,-1.1151 z m -0.43,1.0119 -0.7884,0.8869 0.887,0.4928 0.887,-0.6899 z m -207.357,7.7857 -3.1537,2.3653 5.519,2.3653 z m -271.3877,-227.6179 -4.46,6.69 6.69,0 z m 564.0922,41.5485 -1.5768,1.774 0.9855,0.7884 1.9711,-1.774 z",
"Fiji": "m 9830.1423,4311.1338 -17.3455,4.7306 -6.3074,18.9223 39.4215,-1.5768 z m 45.7289,-37.8446 -33.114,17.3455 7.8843,7.8843 8.6727,-9.4612 11.8264,4.7306 z",
"Marshall Islands": "m 9813.7296,3324.8883 3.8457,3.5478 0,6.1397 -6.0586,3.4971 8.0136,-2.1465 0,-7.6895 -5.8007,-3.3486 z m 14.9804,51.248 2.4053,8.9786 -7.8604,-7.8604 14.2901,17.9365 -8.835,-19.0547 z m 28.4073,31.0469 -4.1807,1.9512 2.5088,-0.2783 0,3.0664 1.6719,-4.7393 z m -7.5254,6.1328 0.2783,1.1153 4.7392,0 -2.788,-0.5577 -2.2295,-0.5576 z m 42.0908,11.4287 3.0664,7.2481 6.1328,-2.5088 0,-4.7393 -0.9062,4.042 -4.669,1.8116 -2.1601,-4.1807 -1.4639,-1.6729 z m -19.2334,20.0704 4.7383,6.1328 -2.2295,3.623 -2.5088,0.5576 3.0664,0.5576 3.0664,-5.0175 -6.1328,-5.8535 z",
"Nauru": "m 9481.5269,3747.2911 -2.7695,-3.1636 -2.5145,4.1829 2.6639,2.8272 z",
"New Caledonia": "m 9435.9274,4408.1107 36.2678,40.2099 40.2099,22.076 -30.7488,-32.3256 -39.4215,-35.4793 z",
"New Zealand": "m 9669.3499,5078.6315 -55.7504,102.5808 -111.5008,89.2006 73.5905,37.9103 57.9805,-86.9706 37.9102,-31.2203 42.3703,-84.7406 z m 42.3703,-42.3703 40.1403,40.1403 -4.46,49.0604 95.8907,-144.9511 -55.7504,6.6901 -30.1052,-34.0078 -25.6452,-12.8226 -41.8128,-58.5379 41.534,78.3293 -1.3938,63.8343 z",
"Niue": "m 10141.556,4328.2311 -6.69,-5.0175 0,5.575 2.787,2.23 z",
"Palau": "m 8580.4052,3531.2791 -0.8363,4.1813 -4.0419,4.3206 3.0663,-4.7388 z m -11.7076,19.9308 1.6725,-1.5332 -1.2544,-0.4181 z m 5.9932,-9.0595 -2.6482,5.5751 0.6969,-4.7388 z",
"Papua New Guinea": "m 8781.1563,3853.6136 136.7728,66.4591 -4.7306,17.3454 63.0744,32.3257 -32.3257,12.6148 104.8612,114.3223 -80.4198,-18.9223 -86.7273,-81.2082 -62.286,28.3834 29.1719,15.7686 -18.9223,16.5571 -49.3445,-8.4418 z m 209.1537,87.1522 70.803,0.5575 10.0351,-17.5614 11.4288,-0.5575 -2.5087,-25.9239 23.4152,8.6413 -15.0527,19.2339 4.1813,11.9863 -18.3976,1.6725 -6.4113,15.3314 -43.2066,8.9201 z m 127.6685,-26.7602 4.1812,-13.6588 -49.8966,-42.9279 40.9766,42.6491 -0.8363,13.1013 z m 49.3391,30.1052 16.1676,21.7427 1.3937,11.7076 18.9552,0.5575 -9.7563,-16.4464 -6.1326,-1.6725 -17.5614,-20.9064 z",
"Samoa": "m 10097.42,4187.3504 4.731,8.6727 -5.519,1.5768 -7.096,-6.3074 z",
"Solomon Islands": "m 9308.9902,4058.0479 10.6438,5.9132 12.6149,-0.3942 10.2496,13.7975 -27.9893,-5.1248 z m 51.248,29.9603 11.4322,14.586 11.038,0 z m -24.0472,-59.5264 7.0959,22.8644 12.2207,11.8265 -11.038,-22.8645 0.3942,-4.3364 z m -58.738,-25.2298 33.1141,23.2587 -24.0471,-10.2496 z m -58.3438,-28.3835 15.3744,9.8554 6.3074,13.4033 z m 26.8066,43.3637 13.0091,15.7686 -6.3074,-3.548 -3.9422,-5.9132 -6.7016,-0.3942 z",
"Tonga": "m 10044.201,4408.5049 -8.279,-0.3942 5.519,3.9422 z m 1.971,3.548 -1.971,2.7595 3.154,2.3652 z",
"Tuvalu": "m 9850.2472,3978.8107 2.7595,3.1537 -3.1537,-0.3942 z m 25.2298,42.5752 3.5479,6.3074 -5.519,6.7017 3.5479,-6.7017 z m -27.2008,-13.4033 -7.0959,14.1917 3.1537,-11.038 z",
"Vanuatu": "m 9502.1555,4231.5024 7.8843,27.5951 11.038,-11.038 -4.7306,-11.8265 -3.9421,5.519 z m 19.7108,35.4794 8.6727,16.557 8.6727,-3.1537 z m 15.7685,-19.7108 7.8843,29.9604 5.5191,-3.9422 z m 18.1339,64.6513 -5.519,10.2496 7.8843,3.1537 z m 15.7686,33.9024 0.7885,11.8265 7.0958,2.3653 z"
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
	"map-data/countries-with-continents",
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
	var dataTableMapper = function(rowObject, rowIndex, currentRow, headerRowObject, colorClasses, attributes) {
		var value = parseFloat(rowObject[1].replace(/,([0-9]{3})/g, "$1"));

		var row = {
			title: rowObject[0],
			value: value
		};
		
		var colorOverride = attributes.getNamedItem("data-fm-color");
		if (colorOverride) {
			row.colorOverride = colorOverride.value;
		}
		
		return row;
	}

	var multiMeasureDataTableMapper = function(rowObject, rowIndex, currentRow, headerRowObject) {
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
			chartDescription.colorClasses = Color.harmonious(chartDescription.groups.length);
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

		svgNode.className.baseVal = svgNode.className.baseVal.replace("fm-unrendered-chart", "");

		drawPoweredByFactmint(svgNode, width.value + width.units);

		return svgNode;
	}

	var svgNode = drawSVGNode();

	window.addEventListener("resizefinished", function() {
		svgNode.parentNode.removeChild(svgNode);
		var poweredByFactmintLink = document.querySelector(".fm-powered-by-factmint");
		poweredByFactmintLink.parentNode.removeChild(poweredByFactmintLink);
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
	
	var tables = document.querySelectorAll('table.fm-choropleth-world-countries');

	if (! supportsSvg()) {
		console.log("SVG not supported: visualizations disabled");
	} else if (! supportsGetBoundingClientRectForSvg()) {
		console.log("Your browser does not correctly support getBoundingClientRect() for SVG elements: visualizations disabled");
	} else {
		//NODRM if(! checkDrm()) throw 'Licence error'; // This check will be un-commented by the grunt release task
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


;(function (name, factory) {
	if (typeof define === 'function') {
		// A system that provides a define method that takes a name and a factory, e.g. AMD
		define(name, factory);
	} else if (typeof exports === 'object') {
		// Node. Does not work with strict CommonJS, but
		// only CommonJS-like enviroments that support module.exports,
		// like Node.
		module.exports = factory();
	} else {
		var global = Function("return this")();
		global[name] = factory();
	}
})
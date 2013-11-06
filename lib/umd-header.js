(function (name, factory) {
	if (typeof define === 'function' && define.amd) {
		// AMD. Register as a named module.
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
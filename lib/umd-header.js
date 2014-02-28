;(function (name, factory) {
	if (typeof module === 'object') {
		// Does not work with strict CommonJS, but only CommonJS-like environments
		// that support module.exports - like Node.
		module.exports = factory();
	} else if (typeof define === 'function') {
		define(factory);
	} else {
		// For an environment with no require/define framework loaded - e.g. a browser.
		var global = Function("return this")();
		global[name] = factory();
	}
})

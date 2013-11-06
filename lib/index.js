"use strict";

var mdeps = require('module-deps');
var browserBuiltins = require('browser-builtins');
var path = require('path');
var es = require('event-stream');
var fs = require('fs');
var browserResolve = require('browser-resolve');
var WrapJSStream = require('./WrapJSStream');

function matchPath(filepath, relativeBit) {
	var relativeParts = path.normalize(relativeBit).split(path.sep);
	while (relativeParts[relativeParts.length - 1] === "." || path.basename(filepath) === relativeParts[relativeParts.length - 1]) {
		if (relativeParts.pop() !== '.') {
			filepath = path.dirname(filepath);
		}
	}
	return relativeParts.length === 0 ? filepath : null;
}

//////////////////////////////////////////////////////////////////////////

var moduleSystemContent = fs.readFileSync(path.join(__dirname, "minimal-browser-modules.js"), { encoding: 'utf8' });
var umdHeaderContent = fs.readFileSync(path.join(__dirname, "umd-header.js"), { encoding: 'utf8' });

function createBundle(initialModule, options) {
	initialModule = path.resolve(process.cwd(), initialModule);
	options = options || {};
	if (options.o !== undefined && options.out === undefined) {
		options.out = options.o;
	}

	var out = options.out ? options.out : process.stdout;
	if (typeof out === 'string') {
		out = fs.createWriteStream(out);
	}
	var prefixString = options.prefix || "";
	var withDependencies = typeof options.withDependencies !== 'undefined' ? (options.withDependencies === true) : false;
	var includeSystem = !(options.includeSystem === false || options.includeSystem === 'false');
	var moduleName = path.basename(initialModule);

	var dontBundle = options.dontBundle || [];
	if (typeof dontBundle === 'string') {
		dontBundle = dontBundle.split(",");
	}

	var onlyBundle = options.onlyBundle || [];
	if (typeof onlyBundle === 'string') {
		onlyBundle = onlyBundle.split(",");
	}

	var defineString = includeSystem ? "_define" : "define";

	var wrap = es.map(function(data, callback) {
		callback(null, defineString + "(" +
				JSON.stringify(data.modRel) +
				", function(require, exports, module) {\n\t" +
				data.source.replace(/\n/g, "\n\t") +
				"\n});\n");
	});

	var packagePaths = {};
	function resolve(id, options, callback) {
		browserResolve(id, options, function(err, pth, pckage) {
			if (pckage !== undefined) {
				var main = "./" + path.normalize(pckage.main || "index.js");
				var match = matchPath(pth, main);
				if (match !== null && packagePaths[match] === undefined) {
					var name = pckage.name || path.basename(match);
					packagePaths[match] = name;
					wrap.write({
						modRel: name,
						source: "module.exports = require(" + JSON.stringify(main.split(path.sep).join("/").replace(/\.js$/, "")) + ");"
					});
				}
			}
			callback(err, pth, pckage);
		});
	}

	var addModuleRelativeName = es.mapSync(function(data) {
		var matchingPackagePath = Object.keys(packagePaths).sort(function(a, b) {
			return b.length - a.length;
		}).filter(function(checkPath) {
					return data.id.substring(0, checkPath.length) === checkPath;
				})[0];

		if (matchingPackagePath !== undefined) {
			data.modRel = packagePaths[matchingPackagePath] + data.id.substring(matchingPackagePath.length);
		} else {
			data.modRel = data.id;
		}
		data.modRel = data.modRel.split(path.sep).join("/").replace(/\.js$/, "");
		return data;
	});

	var wrapJS = new WrapJSStream(
			umdHeaderContent + "( "+JSON.stringify(moduleName) +", function() {\n" +
			"\t" + moduleSystemContent.replace(/\n/g, "\n\t") + "\n\n\t", includeSystem ? "\n" +
			"\n\treturn require(" + JSON.stringify(moduleName) + ");\n" +
			"});" : "");

	var pipeline = es.pipeline(mdeps(initialModule, {
		modules: browserBuiltins,
		resolve: resolve,
		filter: function(moduleId) {
			if (moduleId.substring(0, 1) === '.') {
				return true;
			}
			if (withDependencies && dontBundle.indexOf(moduleId) < 0) {
				if (onlyBundle.length === 0 || onlyBundle.indexOf(moduleId) >= 0) {
					return true;
				}
			}
			return false;
		}
	}), addModuleRelativeName, wrap);
	if (includeSystem) {
		pipeline = pipeline.pipe(wrapJS);
	}
	out.write(prefixString);
	pipeline.pipe(out);
}

if (require.main === module) {
	var args = process.argv.slice(2);

	var options = {};

	for (var i = 0; i < args.length; ++i) {
		var arg = args[i];
		if (arg.substring(0, 1) === '-') {
			var flags = /^-+([^=]+)(=.*)?/.exec(arg);
			options[flags[1]] = flags[2] === undefined ? true : flags[2].substring(1);
		} else {
			createBundle(arg, options);
		}
	}
}

module.exports = createBundle;
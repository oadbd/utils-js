(function (component, f) {
	f.is = component();
}(function () {
	/*
	 * Lifted from Angus Croll
	 * http://javascriptweblog.wordpress.com/2011/08/08/fixing-the-javascript-typeof-operator/
	 */
	function type(obj) {
	  return ({}).toString.call(obj).match(/\s([a-zA-Z]+)/)[1].toLowerCase()
	}

	function func(func) {
		return func && typeof(func) === "function";
	}

	function arr(arr) {
		return type(arr) === "array";
	}

	return {
		arr: arr,
		func: func,
		type: type
	};
}, forkoff));

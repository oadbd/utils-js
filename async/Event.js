(function (component, f) {
	f.async = f.async || {};
	var comps = component(); 
	f.async.Event = comps.Event;
	f.async.EventEmitter = comps.EventEmitter;
}(function () {
	var execEventCallback = function (evt, callback, fireArgs) {
		var args = Array.prototype.slice.call(fireArgs);
		args.unshift(evt);
		callback.apply(evt.scope, args);
	};

	function Event(eventName, opts) {
		this.name = eventName;
		opts = opts || {};
		this.fireOnce = opts.fireOnce || false;
		this.data = opts.data || null;
		this.scope = opts.scope || this;
	
		this.subscribers = [];
	
		this.fireCount = 0;
	}

	Event.prototype.on = function (callback) {
		var i, cb, sub;
		for (i = 0; i < this.subscribers.length; i++) {
			sub = this.subscribers[i];
			if (sub !== callback) {
				sub = null;
			} else {
				break;
			}
		}
		if (!sub) {
			this.subscribers.push(callback);
			if (this.fireOnce && this.fireCount > 0) {
				execEventCallback(this, callback);
			}
		}
	};

	Event.prototype.fire = function () {
		var i;
		if (!this.fireOnce || (this.fireOnce && this.fireCount === 0)) {
			this.fireCount++;
			for (i = 0; i < this.subscribers.length; i++) {
				execEventCallback(this, this.subscribers[i], arguments);
			}
		}
	};

	var getEvent = function (events, eventName) {
		if (!events[eventName]) {
			events[eventName] = new Event(eventName);
		}
		return events[eventName];
	};

	function EventEmitter() {
		this.__events = {};
	}

	EventEmitter.prototype.on = function (eventName, callback) {
		var event = getEvent(this.__events, eventName);
		event.on(callback);
		return this;
	};
	EventEmitter.prototype.emit = function (eventName) {
		var event = getEvent(this.__events, eventName);
		event.fire.apply(event, Array.prototype.splice.call(arguments, 1));
		return this;
	};
	EventEmitter.mixin = function (obj) {
		var emitter = new EventEmitter();
		obj.on = function () { emitter.on.apply(emitter, arguments); return obj;};
		obj.emit = function () { emitter.emit.apply(emitter, arguments); return obj;};
		return obj;
	};


	return { 
		Event: Event,
		EventEmitter: EventEmitter
	};

}, forkoff));

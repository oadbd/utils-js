(function() {
	f = forkoff = {};
}());
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

	function EventEmitter(options) {
        this.cfg = options || {};
        this.cfg.timeout = this.cfg.timeout || 0;
		this.__events = {};
	}

	EventEmitter.prototype.on = function (eventName, callback) {
		var event = getEvent(this.__events, eventName);
		event.on(callback);
		return this;
	};
    
	EventEmitter.prototype.emit = function (eventName) {
		var event = getEvent(this.__events, eventName),
            args = Array.prototype.splice.call(arguments, 1);
        if (this.cfg.timeout > 0) {
            //break the event loop
            setTimeout(function () {
		        event.fire.apply(event, args);
            }, this.cfg.timeout);
        } else {
            event.fire.apply(event, args);
        }

		return this;
	};
    
	EventEmitter.mixin = function (obj, options) {
		var emitter = new EventEmitter(options);
        
		obj.on = function () { emitter.on.apply(emitter, arguments); return obj;};
		obj.emit = function () { emitter.emit.apply(emitter, arguments); return obj;};
		return obj;
	};


	return { 
		Event: Event,
		EventEmitter: EventEmitter
	};

}, forkoff));
//depends on Event.js
(function (component, f) {
    //since this depends on Event.js, the f.async namespace will already be set up.
    f.async.RequestQueue = component(f.async.EventEmitter);
}(function (EventEmitter) {
    
    function Request(method, endpoint, headers, data) {
        this.method = (method || 'GET').toUpperCase();
        this.endpoint = endpoint;
        this.headers = headers || [];
        this.data = data;
    }
    EventEmitter.mixin(Request, {timeout: 20});
    
    function submitRequest(request, queue) {
        var xhr = new XMLHttpRequest(), 
            queryStringData = [], 
            endpoint = request.endpoint,
            event, 
            key;
                
        xhr.onreadystatechange = function () {
            if (this.readyState == this.DONE) {
                //we'll treat anything above the 200 codes a failure
                event = this.status > 300 ? 'failure' : 'success';
                queue.emit('completed', request);
                request.emit(event, request, this.status, this.responseXML || this.responseText, request);
            } 
        };
        if (request.method === 'GET') {
              if (request.data && typeof request.data === 'object') {
                  for (key in request.data) {
                        if (request.data.hasOwnProperty(key)) {
                            queryStringData.push("key=" + encodeURIComponent(request.data[key]));
                        }
                  }
              }
        }
        xhr.open(request.method, endpoint);
        request.emit("send", request);
        xhr.send(request.data);
    }

    function RequestQueue(baseEndpoint) {
        var idle = true;
        
        this.__pendingRequests = [];

        this.baseEndpoint = baseEndpoint;
        this.defaultContentType = "application/json";
        
        //a new request was submitted. If the queue is idle,
        //then send the request;
        this.on('new', function (request) {
            if (idle && this.__pendingRequests.length > 0) {
                idle = false;
                submitRequest(this.__pendingRequests.shift());    
            }
        });
        
        //when a request completes, send the next one, or change
        //to idle if there aren't any more
        this.on('complete', function () {
            if (this.__pendingRequests.length > 0) {
                submitRequest(this.__pendingRequests.shift());    
            } else {
                idle = true;
            }
        });
        
    }
    
    /**
     * Queue up a new request, which will be submitted when it's turn
     * comes up.
     * 
     * @param method The HTTP Method to use (GET, PUT, POST, DELETE...)
     * @param endpoint Appended to the RequestQueue's baseEndpoint
     * @param data Data to be sent with the request
     * @param opts Extra options such as contentType for setting headers
     */
    RequestQueue.prototype.submit = function (method, endpoint, data, opts) {
        opts = opts || {};
        endpoint = endpoint || {};
        var contentType = opts.contentType || this.defaultContentType,
            headers = [],
            request = null;
        headers.push(["Content-Type", contentType]);
        
        request = new Request(method, this.baseEndpoint + endpoint, headers, data);
        this.__pendingRequests.push(request);
        this.emit("new", request);
        return request;
    };
    
    EventEmitter.mixin(RequestQueue);
    
    return RequestQueue;
}, forkoff));(function (component, f) {
	f.is = component();
}(function () {
	/*
	 * Lifted from Angus Croll
	 * http://javascriptweblog.wordpress.com/2011/08/08/fixing-the-javascript-typeof-operator/
	 */
	function type(obj) {
	  return ({}).toString.call(obj).match(/\s([a-zA-Z]+)/)[1].toLowerCase();
	}

	function func(funct) {
		return funct && typeof(funct) === "function";
	}

	function arr(array) {
		return type(array) === "array";
	}

	return {
		arr: arr,
		func: func,
		type: type
	};
}, forkoff));
//depends on Event.js
(function (component, f) {
    f.ds = f.ds || {};
    f.ds.LinkedList = component(f.async.EventEmitter);
}(function (EventEmitter) {

    function insertNode(nodeA, nodeB) {
        if (nodeA === null) {
            //we're inserting a new head
            if (nodeB._list.head) {
                nodeB.next = nodeB._list.head;
                nodeB._list.head.prev = nodeB;
            }
            nodeB._list.head = nodeB; //set the new head
        } else {
            nodeB.next = nodeA.next;
            nodeA.next = nodeB;
            nodeB.prev = nodeA;
        }
        
        if (!nodeB.next) {
            //this node happens to be a new tail
            node._list.tail = node;    
        }
        node.next = next;
        
        nodeB.emit('attached', nodeB);
        nodeB._list.emit('attached', nodeB);
        return nodeB;
    }

    function removeNode(node) {
        if (node.prev) {
            node.prev.next = node.next;   
        }
        
        if (node.next) {
            node.next.prev = node.prev;    
        }
        
        if (node === node._list.head) {
            node._list.head = node.next;
        }
        if (node === node._list.tail) {
            node._list.tail = node.prev;   
        }
        
        var data = node.data,
            list = node._list;

        node.data = node._list = node.next = node.prev = null;
        
        node.emit('removed', data, list);
        list.emit('removed', data, list); 
        return data;
    }
    
    function Node(data, list) {
        this.data = data;
        this._list = list;
        
        this.prev = null;
        this.next = null;
    }
    Node.prototype.remove = function () {
        removeNode(this);        
    };

    Node.prototype.insertAfter = function (data) {
        data = createNode(data);
        insertNode(this, data);
        return data;
    };
    Node.prototype.insertBefore = function (data) {
        data = createNode(data);
        insertNode(this.prev, data);
        return data;
    };
    
    EventEmitter.mixin(Node, {timeout: 20});

    function createNode(data) {
        if (!(data instanceof Node)) {
            data = new Node(data, this._list);
        }
        return data;
    }

    function LinkedList() {
        this.head = null;
        this.tail = null;
    }

    LinkedList.prototype.append = function (data) {
        data = createNode(data);
        insertNode(this.tail, data);
        return data;
    };
    LinkedList.prototype.prepend = function (data) {
        data = createNode(data);
        insertNode(null, data);
        return data;
    };
    
    
    LinkedList.prototype.createNode = createNode;

    LinkedList.prototype.each = function (callback, startNode, reverse) {
        reverse = reverse || false;
        var node = startNode && startNode instanceof Node ? startNode
                   : reverse ? this.tail : this.head;
        while (node !== null) {
            callback(node);
            node = reverse ? node.prev : node.next;
        }
    };
    
    EventEmitter.mixin(LinkedList, {timeout: 20});
    
    return LinkedList;
}, forkoff));(function (component, f) {
	f.dom = f.dom || {};
	f.dom.Fragment = component();
}(function () {
	var replaceRegex = /(\{[a-zA-Z][a-zA-Z0-9_]*\})/g;

	/**
	 * A very basic TreeWalker for finding text nodes.
	 *
	 * This is used when a real tree walker can't be created.
	 * I'm looking at you I.E.!!!
	 *
	 * @param el {HTMLElement} The element to start searching under
	 */
	var FauxTreeWalker = function (el, type, nodeFilter) {
		this._index = [0]; //index level to remember where we are at each level
		this.currentNode = el; //the current element we're digging through.

		this.type = type || 0; // defaults to SHOW_ALL
		this.filter = nodeFilter || {};
		if (!this.filter.acceptNode) {
			throw "a NodeFilter is required";
		}
	};

	/**
	 * The nextNode method returns the next Text node in the dom hiearchy or null if none is found
	 * 
	 * This tree walker nextNode implementation is a bit messy. 
	 * It should use nextSibling, but I don't think that works as expected when looking for text nodes.
	 *
	 * @returns the next Text node in a depth first search of the dom hiearcy, 
	 *  or null if none are found.
	 */
	FauxTreeWalker.prototype.nextNode = function () {
		//When all nodes have been exhausted the last index level will be popped off
		if (this._index.length > 0) {
			var top = this._index.length - 1,
				children = this.currentNode.childNodes,
				node = null, action, i;

			if (children && children.length > 0) {
				for (i = this._index[top]; i < children.length; ) {
					node = children[i++];
					this._index[top] = i;
					action = this.filter.acceptNode(node);
					if (action === 1) {
						//node accepted, assume we have to recurse deeper the next time in
						this.currentNode = node;
						this._index.push(0);
						return node;
					} else if (action === 2) {
						continue; //node has been rejected
					}

					// This node has not been accepted or rejected, so we keep going
					if (node.childNodes && node.childNodes.length > 0) {
						this.currentNode = node;
					
						this._index.push(0);
						node = this.nextNode();
						// a text node was found, so we need to return it up the stack
						if (node) {
							return node;
						}
					}
				}
			}
			// done with this node, so we no longer need the index, 
			// and we move back up to the parent and try again.
			this._index.pop();
			this.currentNode = this.currentNode.parentNode;
			return this.nextNode();
		}
		return null;
	};

	/**
	 * Creates a TreeWalker which can be used to find all "Text" nodes.
	 * If TreeWalker's are not supported, a TextNodeTreeWalker is returned
	 *
	 * @param startingEl {HTMLElement} the element to start walking the dom tree from.
	 * @returns a TreeWalker configured to find only Text nodes
	 */
	function createTreeWalker(startingEl, attributeName) {
		var walker = null;
		var filter = {
			acceptNode: function (node) {
				return (node && (node.nodeType === 3 || node.hasAttribute(attributeName))) ? 1 : 3;
			}
		};
		if (document.createTreeWalker) {
			walker = document.createTreeWalker(startingEl, NodeFilter.SHOW_ALL, filter, false);
		} else {
			walker = new FauxTreeWalker(startingEl, 1, filter);
		}
		return walker;
	}

	var DomFragment = function (htmlString, attributeName) {
		var containerDiv = document.createElement('div');
		containerDiv.innerHTML = htmlString;

		this.attributeName = attributeName || 'as';
		this._html = htmlString;
		this.fragment = containerDiv.childNodes;
		this.nodes = {};
	
		var walker = createTreeWalker(containerDiv, this.attributeName), 
			node = null, 
			matches = null, 
			i = 0;
		node = walker.nextNode();
		while (node) {
			//cases:
			// 1) "{foo}"
			// 2) "abc {foo} bcd {bar} ..."
		
			if (node.nodeType === 3) {
				matches = node.nodeValue.match(replaceRegex);
				if (matches) {
					if (matches.length === 1 && matches[0].length == node.nodeValue.length) {
						//case 1
						this.nodes[matches[0].substring(1, matches[0].length - 1)] = node;
					} else {
						//case 2
						// We want to split the nodes up so that when walker.nextNode is called, we only get case 1
						for (i = 0; i < matches.length; i++) {
							node = node.splitText(node.nodeValue.indexOf(matches[i])).splitText(matches[i].length);
						}
					}
				}
			} else if (node.hasAttribute(this.attributeName)) {
				this.nodes[node.getAttribute(this.attributeName)] = node;
			}
			node = walker.nextNode();
		}
	};

	/**
	 * For each fragmemt created it is appended to the supplied element
	 * @param el {HTMLElement} The element to append the fragment to
	 * @returns this DomFragment
	 */
	DomFragment.prototype.render = function (el) {
		//the size of the fragment array shrinks as elements are appended
		while (this.fragment.length > 0) {
			el.appendChild(this.fragment[0]);
		}
		return this;
	};

	/**
	 * Replaces the {key} text node with the element provided
	 * @param key {string} the key to replace
	 * @param el {HTMLElement} the element to replace the {key} node with
	 * @returns this DomFragment
	 */
	DomFragment.prototype.set = function (key, el) {
		if (this.nodes.hasOwnProperty(key)) {
			this.nodes[key].parentNode.replaceChild(el, this.nodes[key]);
			this.nodes[key] = el;
		}
		return this;
	};

	/**
	 * Maps all elements provided to the correct {key} nodes
	 * @param elMap {object} { key1: HTMLElement, key2: HTMLElement }
	 * @returns this DomFragment
	 */
	DomFragment.prototype.map = function (elMap) {
		var key = null;
		for (key in elMap) {
			if (elMap.hasOwnProperty(key)) {
				this.set(key, elMap[key]);
			}
		}
		return this;
	};

	return DomFragment;
}, forkoff));

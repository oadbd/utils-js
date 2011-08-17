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
	for (var i = 0; i < this.fragment.length; i++) {
		el.appendChild(this.fragment[i]);
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

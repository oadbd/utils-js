var containerDiv = document.createElement('div'),
	replaceRegex = /(\{[a-zA-Z][a-zA-Z0-9_]*\})/g;

var TextNodeTreeWalker = function (el) {
	this._index = [0];
	this._current = el;
};

// needs implementing to work on IE or any other browser that doesn't support TreeWalkers
TextNodeTreeWalker.prototype.nextNode = function () {
	var result = null;
	while (this._index.length > 0) {
	}
};

function createTextNodeWalker(startingEl) {
	var walker = null;
	if (document.createTreeWalker) {
		walker = document.createTreeWalker(startingEl, NodeFilter.SHOW_TEXT, null, false);
	} else {
		walker = new TextNodeTreeWalker(startingEl);
	}
	return walker;
}

var DomFragment = function (htmlString) {
	containerDiv.innerHTML = htmlString;

	this._html = htmlString;
	this.fragment = containerDiv.childNodes;
	this.nodes = {};
	
	var walker = createTextNodeWalker(containerDiv), 
		node = null, 
		matches = null, 
		i = 0;
    node = walker.nextNode();
	while (node) {
		//cases:
		// 1) "{foo}"
		// 2) "abc {foo} bcd {bar} ..."
		
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
        node = walker.nextNode();
	}
};

DomFragment.prototype.render = function (el) {
	for (var i = 0; i < this.fragment.length; i++) {
		el.appendChild(this.fragment[i]);
	}
	return this;
};

DomFragment.prototype.set = function (key, el) {
	if (this.nodes.hasOwnProperty(key)) {
		this.nodes[key].parentNode.replaceChild(el, this.nodes[key]);
        this.nodes[key] = el;
	}
	return this;
};

DomFragment.prototype.map = function (elMap) {
	var key = null;
	for (key in elMap) {
		if (elMap.hasOwnProperty(key)) {
			this.set(key, elMap[key]);
		}
	}
	return this;
};

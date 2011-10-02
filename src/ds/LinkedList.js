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
}, forkoff));
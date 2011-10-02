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
}, forkoff));
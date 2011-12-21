//node.js script to combine and minimize the files

var fs = require('fs'),
    spawn = require('child_process').spawn,
    flow = new (require('events').EventEmitter)();

var cfg = {
    buildDir:  __dirname + '/build',
    outputFile: 'f.all.js',
    
    srcDir: __dirname + '/src'
};

//eventually I will set up a better way of defining dependencies.
//For now, it's just a list of all the files to build.

var files = [
    'f.js',
    
    'async/Event.js',
    'async/RequestQueue.js',
    
    'util/is.js',
    
    'ds/LinkedList.js',
    'dom/DomFragment.js'
];

var cleanup = function () {
    var rm = spawn('/usr/bin/rm', ['-rf', cfg.buildDir]);
    rm.stdout.on('data', console.log);
    rm.stderr.on('data', console.log);
    rm.on('exit', function (code) {
        if (code === 0) {
            flow.emit('clean');    
        }
    });
};

var processFile = function (i, out) {
    if (files.length > i) {
        console.log('Concatenating ' + files[i]);
        var inStream = fs.createReadStream(cfg.srcDir + '/' + files[i]);
        
        inStream.pipe(out, {end : false});
        inStream.on('end', function (){
            processFile(i + 1, out);    
        });
    } else {
        out.end();
        flow.emit('built');
    }
};

flow.on('ready', function () {
    cleanup();    
}).on('clean', function () {
    var outFile = cfg.buildDir + '/' + cfg.outputFile;
    
    console.log('building ' + outFile);
    var out = fs.createWriteStream(cfg.buildDir + '/' + cfg.outputFile);
    processFile(0, out);
}).on('built', function () {
    console.log('Build complete');    
});


//flow.emit('clean');
flow.emit('ready');

var Firebase = require('firebase');
var Queue = require('firebase-queue');

var http = require('http');
http.createServer(function (req, res) {
  res.writeHead(200, {'Content-Type': 'text/plain'});
  res.end('Hello World\n');
}).listen(3000, "127.0.0.1");
var queueRef = new Firebase('https://deft-return-187306.firebaseio.com/queue');

console.log('Server running at http://127.0.0.1:3000/');



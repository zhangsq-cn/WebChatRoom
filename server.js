var http = require('http'),
	fs = require('fs'),
	path = require('path'),
	mime = require('mime'),
	cache = {},					//cache是用来缓存文件内容的对象
	chatServer = require('./lib/chat_server');

function send404(res) {
	res.writeHead(404, {'Content-Type' : 'text/plain'});
	res.write('Error 404: resource not found.');
	res.end();
}

function sendFile(res, filePath, fileContents) {
	res.writeHead(200, {
		'Content-Type' : mime.lookup(path.basename(filePath))
	});
	res.end(fileContents);
}

function staticServer(res, cache, absPath) {
	if (cache[absPath]) {	//检查文件是否缓存在内存中
		sendFile(res, absPath, cache[absPath]);	//从内存中返回文件
	} else {
		fs.exists(absPath, function (exists) {
			if (exists) {
				fs.readFile(absPath, function (err, data) {
					if (err) {
						send404(res);
					} else {
						cache[absPath] = data;
						sendFile(res, absPath, data);
					}
				});
			} else {
				send404(res);
			}
		});
	}
}

var server = http.createServer(function (req, res) {
	var filePath = false;
	if (req.url === '/') {
		filePath = 'public/index.html';
	} else {
		filePath = 'public' + req.url;
	}

	var absPath = './' + filePath;
	staticServer(res, cache, absPath);
});
server.listen(3000, function () {
	console.log('Server listening on port 3000.');
});

chatServer.listen(server);
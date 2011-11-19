/* Timecard Server 
 * Copyright 2011 Jaakko-Heikki Heusala <jheusala@iki.fi>
 * Licensed under the AGPL -- see LICENSE.txt
 */

//var json = require('json-object').setup(global);
var json = JSON;

// Setup HTTP
var app = require('http').createServer(function (req, res) {
	
	function serve_file(file, type, content_file) {
		if(req.url == '/' + file) {
			content_file = 'client/' + (content_file || file);
			require('fs').readFile(content_file, function(err, data) {
				res.writeHead(200, {'Content-Type': ''+type});
				res.end(data);
			});
			return true;
		}
	}
	
	//if(serve_file('socket.io/socket.io.js', 'text/javascript', 'node_modules/socket.io/node_modules/socket.io-client/dist/socket.io.min.js')) return;
	if(serve_file('client.html', 'text/html')) return;
	if(serve_file('client.css', 'text/css')) return;
	if(serve_file('client.js', 'text/javascript')) return;
	if(serve_file('', 'text/html', 'client.html')) return;
	
	res.writeHead(404, {'Content-Type': 'text/plain'});
	res.end('URL not found: ' + req.url);
	
}), io = require('socket.io').listen(app);

io.configure('development', function(){
	io.set('log level', 1);
	//io.set('transports', ['websocket', 'htmlfile', 'xhr-polling']);
	//io.set('transports', ['xhr-polling']);
});

io.configure('production', function(){
	io.set('log level', 1);
	//io.set('transports', ['xhr-polling']);
	//io.set('transports', ['websocket', 'htmlfile', 'xhr-polling']);
});

app.listen(3000);
console.log('Server running at port 3000');

io.sockets.on('connection', function (socket) {
	
	var data_file = 'db/data.json';
	
	/* Save data */
	/*
	socket.on('save', function(data, callback) {
		var buf;
		//console.log('Saving data...');
		try {
			buf = json.stringify(data);
			require('fs').writeFile(data_file, buf, 'utf8', function(err) {
				if(err) {
					console.log('Failed to save: ' + data_file + ' (' + err + ')');
					callback && callback('Failed to save');
				} else {
					console.log('Saved succesfully to: ' + data_file);
					callback && callback(undefined);
				}
			});
		} catch(e) {
			callback && callback('Failed to stringify');
		}
	});
	*/
	
	/* Load data */
	/*
	socket.on('load', function(callback) {
		//console.log('Loading data...');
		require('fs').readFile(data_file, 'utf8', function(err, data) {
			var buf;
			if(err) {
				console.log('Failed to load: ' + data_file + ' (' + err + ')');
				callback && callback('Failed to load');
			} else {
				try {
					buf = json.parse(data);
					console.log('Loaded succesfully from: ' + data_file);
					callback && callback(undefined, buf);
				} catch(e) {
					callback && callback('Failed to parse data');
				}
			}
		});
	});
	*/
});
//console.log('IO service running at port 3001');

/* EOF */

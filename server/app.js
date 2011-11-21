/* Timecard Server 
 * Copyright 2011 Jaakko-Heikki Heusala <jheusala@iki.fi>
 * Licensed under the AGPL -- see LICENSE.txt
 */

// Setup HTTP
var app = module.exports = require('http').createServer(function (req, res) {
	
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
	
});

/* EOF */

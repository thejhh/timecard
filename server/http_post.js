
var mod = module.exports = {};

var _queue = [];

/* Post to remote site */
function http_post_real(options, values) {
	console.log('Posting to external server...');
	var data = require('querystring').stringify(values);
	options = options || {};
	if(!options.method) options.method = 'POST';
	if(!options.port) options.port = 80;
	if(!options.headers) {
		options.headers = {
			'Content-Type':'application/x-www-form-urlencoded', 
			'Content-Length': data.length};
	}
	console.log('data = ' + data);
	var req = require('http').request(options, function(res) {
		res.setEncoding('utf8');
		console.log('Response status was ' + res.statusCode);
		res.on('data', function(chunk) {
			console.log('Data: ' + chunk);
		});
		res.on('end', function() {
			console.log('Request ended.');
		});
	});
	req.on('error', function(e) {
		console.log('problem with request: ' + e.message);
	});
	req.write(data);
	req.end();
}

/* Post to remote site */
function http_post(options, values) {
	console.log('Adding to queue...');
	_queue.push({'options':options, 'values':values});
}

/* Initialize module */
mod.init = function(data) {
	function f(t) {
		function ff(n) { return (n <= 9) ? '0'+n : n; };
		return ff(t.getHours()) + ':' + ff(t.getMinutes());
	}
	
	var key = require('./config.js').post_key;
	var options = {
		host: 'fizban.sendanor.net',
		path: '/~jheusala/timecard.php',
	};
	
	data.on('start', function(time) {
		console.log('start event');
		var msg = '[' + time.project.name + '] ' + f(time.started) + ' - ';
		http_post(options, {'key':key, 'msg':msg });
	});
	
	data.on('stop', function(time) {
		console.log('stop event');
		var msg = '[' + time.project.name + '] ' + f(time.started) + ' - ' + f(time.stopped);
		http_post(options, {'key':key, 'msg':msg });
	});
	
	// 
	setInterval(function() {
		if(_queue.length != 0) {
			var post = _queue.shift();
			if(!post) return;
			console.log('Interval...');
			http_post_real(post.options, post.values);
		}
	}, 5000);
};

/* EOF */

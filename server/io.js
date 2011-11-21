/* Timecard Server 
 * Copyright 2011 Jaakko-Heikki Heusala <jheusala@iki.fi>
 * Licensed under the AGPL -- see LICENSE.txt
 */

var app = require('./app.js'),
    foreach = require('snippets').foreach,
    io = module.exports = require('socket.io').listen(app),
    data = require('./data.js'),
    initfn = require('./fn.js').init,
    _loaded = {};


/* Configure Socket.IO */
// See https://github.com/LearnBoost/Socket.IO/wiki/Configuring-Socket.IO
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

/* Connection IO Event */
io.sockets.on('connection', function (socket) {
	
	/* Initialize client */
	socket.on('client:init', function(fn) {
		fn = initfn(fn);
		
		function prepare_reply(d) {
			var reply = {'projects':[]};
			foreach(d.projects).each(function(o) {
				reply.projects.push({'id':o.id,'name':o.name});
			});
			if(d.countdown) {
				reply.countdown = {
					'started':d.countdown.started,
					'project':{
						'id':d.countdown.project.id,
						'name':d.countdown.project.name }};
			}
			return reply;
		}
		
		if(_loaded.data) {
			fn(undefined, prepare_reply(_loaded.data));
			return;
		}
		
		data.load('./db/data.json', function(err, d) {
			if(err) {
				console.log('Error: ' + err);
				if(err.stack) console.log('stack:\n' + err.stack);
				fn(''+err);
				return;
			}
			
			_loaded.data = d;
			fn(undefined, prepare_reply(_loaded.data) );
		});
	});
	
	/* Add new project */
	socket.on('client:project:add', function(name, fn) {
		fn = initfn(fn);
		var p;
		if(!_loaded.data) {
			fn("not initialized");
			return;
		}
		p = new data.Project({'name':name});
		_loaded.data.projects.push(p);
		io.sockets.emit('project:add', {'id':p.id,'name':p.name});
		fn();
	});
	
	/* Start project */
	function do_data_start(p, fn) {
		fn = initfn(fn);
		_loaded.data.start(p, function(err) {
			if(err) {
				fn(''+err);
				return;
			}
			io.sockets.emit('project:start', {'id':p.id, 'name':p.name} );
			fn();
		});
	}
	
	/* Stop project */
	function do_data_stop(fn) {
		fn = initfn(fn);
		_loaded.data.stop(function(err, countdown) {
			var reply;
			if(err) {
				fn(''+err);
				return;
			}
			
			reply = {'started': countdown.started.getTime(),
			         'stopped': countdown.stopped.getTime(),
			         'project': {'id':countdown.project.id, 'name':countdown.project.name}};
			
			io.sockets.emit('project:stop', reply);
			fn();
		});
	}
	
	/* Start project */
	socket.on('client:project:start', function(id, fn) {
		fn = initfn(fn);
		_loaded.data.getProjectByID(id, function(err, project) {
			if(err) {
				fn(''+err);
				return;
			}
			if(!project) {
				fn('project not found for ID: ' + id);
				return;
			}
			_loaded.data.started(function(running) {
				if(running) {
					// Stop
					do_data_stop(function(err) {
						if(err) {
							fn(''+err);
							return;
						}
						
						// Start 
						do_data_start(project, function(err) {
							if(err) fn(''+err);
							else fn();
						});
					});
				} else {
					// Start 
					do_data_start(project, function(err) {
						if(err) fn(''+err);
						else fn();
					});
				}
			});
		});
	});
		
	/* Stop project */
	socket.on('client:project:stop', function(fn) {
		fn = initfn(fn);
		_loaded.data.started(function(running) {
			if(!running) return;
			// Stop
			do_data_stop(function(err) {
				if(err) {
					fn(''+err);
					return;
				}
				fn();
			});
		});
	});
	
	
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

/* EOF */

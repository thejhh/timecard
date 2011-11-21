/* Timecard Server 
 * Copyright 2011 Jaakko-Heikki Heusala <jheusala@iki.fi>
 * Licensed under the AGPL -- see LICENSE.txt
 */

var json = require('json-object').setup(global),
    foreach = require('snippets').foreach,
    initfn = require('./fn.js').init,
    EventEmitter = require('events').EventEmitter,
    next_id = 1;

/* To int */
function to_int(n) {
	if(typeof n === 'number') {
		return n;
	}
	return parseInt(n, 10);
}

/* To date */
function to_date(d) {
	if(d && (d instanceof Date)) {
		return d;
	}
	var ret = new Date();
	ret.setTime(to_int(d));
	return ret;
}

/* Create Project object */
function Project(args) {
	args = args || {};
	if(args.id) {
		this.id = to_int(args.id);
	} else {
		this.id = next_id;
		next_id += 1;
	}
	this.name = ''+args.name;
}

/* Create pair of time */
function TimePair(args) {
	args = args || {};
	this.started = to_date(args.started);
	this.stopped = to_date(args.stopped);
	this.project = args.project;
}

/* Load file */
function load_file(data_filename, load_fn) {
	load_fn = initfn(load_fn);
	var obj = new EventEmitter();
	obj.projects = [];
	obj.times = [];
	require('fs').readFile(data_filename, 'utf8', function(err, data) {
		var buf, _changed_data = false;
		
		if(err) {
			load_fn(err);
			return;
		}
		
		// Parse data
		try {
			buf = json.parse(data);
		} catch(e) {
			console.log('Error while parsing data: ' + e);
			if(e.stack) console.log('stack:\n' + e.stack);
			load_fn("Failed to parse data");
			return;
		}
		
		// Prepare next ID
		if(buf.next_id) {
			next_id = to_int(buf.next_id);
		}
		
		// Prepare projects
		foreach(buf.projects).each(function(d) {
			obj.projects.push( new Project({'id':to_int(d.id),'name':''+d.name}) );
		});
		
		// Prepare methods
		
		// Get project by ID
		function get_project_by_id(id) {
			var p;
			foreach(obj.projects).each(function(o) {
				if(o.id === id) {
					p = o;
				}
			});
			return p;
		}
		
		// Get project by ID
		obj.getProjectByID = function(id, fn) {
			fn = initfn(fn);
			fn(undefined, get_project_by_id(id) );
		};
		
		// Prepare countdown
		if(buf.countdown) {
			obj.countdown = {'started':to_date(buf.countdown.started), 'project':get_project_by_id(to_int(buf.countdown.project.id)) };
		}
		
		// Prepare times
		if(buf.times) {
			foreach(buf.times).each(function(t) {
				obj.times.push( new TimePair({'started':t.started, 'stopped':t.stopped, 'project':get_project_by_id(t.project.id) }) );
			});
		}
		
		// Returns true if countdown is started
		obj.started = function(fn) {
			fn = initfn(fn);
			fn(obj.countdown ? true : false);
		};
		
		// Returns or sets if data is changed
		obj.changed = function(new_value) {
			if(new_value !== undefined) {
				_changed_data = new_value;
				if(new_value) obj.emit('changed');
			}
			return _changed_data;
		};
		
		// Start countdown
		obj.start = function(project, fn) {
			fn = initfn(fn);
			if(project && (project instanceof Project)) {
				obj.countdown = { 'started':new Date(), 'project':project };
				obj.changed(true);
				obj.emit('start', obj.countdown);
				fn();
			} else {
				fn("invalid argument");
			}
		};
		
		// Handle stop events
		obj.on('stop', function(buf) {
			obj.times.push( new TimePair({'started':buf.started, 'stopped':buf.stopped, 'project':buf.project}) );
		});
		
		// Stop countdown
		obj.stop = function(fn) {
			fn = initfn(fn);
			var buf;
			if(obj.countdown) {
				buf = obj.countdown;
				delete obj.countdown;
				obj.changed(true);
				buf.stopped = new Date();
				obj.emit('stop', buf);
				fn(undefined, buf);
			} else {
				fn("nothing to stop");
			}
		};
		
		// Get data as serialized object
		obj.getSerializedObject = function() {
			var buf = {'projects':[], 'times':[]}, source;
			
			// next_id
			buf.next_id = to_int(next_id);
			
			// projects
			foreach(obj.projects).each(function(o) {
				buf.projects.push({'id':to_int(o.id), 'name':''+o.name});
			});
			
			// countdown
			if(obj.countdown) {
				buf.countdown = {
					'started':to_int(obj.countdown.started.getTime()),
					'project':{
						'id':to_int(obj.countdown.project.id),
						'name':''+obj.countdown.project.name}};
			}
			
			// Times
			foreach(obj.times).each(function(o) {
				buf.times.push( {
					'started':to_int(o.started.getTime()), 
					'stopped':to_int(o.stopped.getTime()),
					'project':{
						'id':to_int(o.project.id),
						'name':''+o.project.name }} );
			});
			
			return buf;
		};
		
		// Get data as serialized string
		obj.getSerializedString = function() {
			var source, buf=obj.getSerializedObject();
			try {
				source = JSON.stringify(buf, null, 2) + '\n';
			} catch(e) {
				return;
			}
			return source;
		};
		
		// Save data
		obj.save = function(fn) {
			fn = initfn(fn);
			
			if(!obj.changed()) {
				fn();
				return;
			}
			
			console.log('Saving data to ' + data_filename + '...');
			var source = obj.getSerializedString();
			if(!source) {
				fn('Failed to serialize data!');
				return;
			}
			var fs = require('fs');
			fs.writeFile(data_filename+'.tmp', source, 'utf8', function(err) {
				if(err) {
					fn(err);
					return;
				}
				fs.rename(data_filename, data_filename+'.bak', function(err) {
					if(err) {
						fn(err);
						return;
					}
					fs.rename(data_filename+'.tmp', data_filename, function(err) {
						if(err) {
							fn(err);
							return;
						}
						obj.changed(false);
						fn();
					});
				});
			});
		};
		
		/* Save data if process ends */
		require('./app.js').once('close', function() {
			obj.save(function(err) {
				if(err) {
					console.log('Error: Failed to save data on exit: ' + err);
				} else {
					console.log('Data saved successfully on exit');
				}
			});
		});
		
		/* Save changed data periodically */
		setInterval(function() {
			if(!obj.changed()) return;
			obj.save(function(err) {
				if(err) {
					console.log('Error: Failed to save data: ' + err);
				} else {
					console.log('Data saved successfully.');
				}
			});
		}, 2000);
		
		load_fn(undefined, obj);
	});
}

var data = module.exports = {};
data.load = load_file;
data.Project = Project;

/* EOF */

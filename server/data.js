/* Timecard Server 
 * Copyright 2011 Jaakko-Heikki Heusala <jheusala@iki.fi>
 * Licensed under the AGPL -- see LICENSE.txt
 */

var json = require('json-object').setup(global),
    foreach = require('snippets').foreach,
    initfn = require('./fn.js').init,
    utils = require('./utils.js'),
    EventEmitter = require('events').EventEmitter,
    next_id = 1;

/* Create Project object */
function Project(args) {
	args = args || {};
	if(args.id) {
		this.id = utils.to_int(args.id);
	} else {
		this.id = next_id;
		next_id += 1;
	}
	this.name = ''+args.name;
}

/* Create pair of time */
function TimePair(args) {
	args = args || {};
	if(args.id) {
		this.id = utils.to_int(args.id);
	} else {
		this.id = next_id;
		next_id += 1;
	}
	this.started = utils.to_date(args.started);
	if(args.stopped) {
		this.stopped = utils.to_date(args.stopped);
	}
	if(args.project && (args.project instanceof Project) ) {
		this.project = args.project;
	}
	if(!this.project) {
		console.log("Warning! TimePair created without project!");
	}
}

/* */
TimePair.prototype.getHours = function() {
	var self = this,
	    now = new Date(),
		started = self.started.getTime(),
		stopped = self.stopped ? self.stopped.getTime() : now.getTime();
	return (stopped - started)/1000/3600;
};

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
			next_id = utils.to_int(buf.next_id);
		}
		
		// Prepare projects
		foreach(buf.projects).each(function(d) {
			obj.projects.push( new Project({'id':utils.to_int(d.id),'name':''+d.name}) );
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
			obj.countdown = {'started':utils.to_date(buf.countdown.started), 'project':get_project_by_id(utils.to_int(buf.countdown.project.id)) };
		}
		
		// Prepare times
		if(buf.times) {
			foreach(buf.times).each(function(t) {
				obj.times.push( new TimePair({'id':t.id,'started':t.started, 'stopped':t.stopped, 'project':get_project_by_id(t.project.id) }) );
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
		obj.on('start', function(countdown) {
			var time = new TimePair({'started':countdown.started, 'project':countdown.project});
			obj.times.push(time);
			countdown.time = time;
			obj.changed(true);
			obj.emit('new:TimePair', time);
		});
		
		// Handle stop events
		obj.on('stop', function(countdown) {
			console.log('Stop event');
			var time;
			if(countdown.time) {
				console.log('Original time');
				time = countdown.time;
				time.stopped = utils.to_date(countdown.stopped);
				obj.changed(true);
				obj.emit('update:TimePair', time);
			} else {
				console.log('New time');
				time = new TimePair({'started':countdown.started, 'stopped':countdown.stopped, 'project':countdown.project});
				obj.times.push(time);
				obj.changed(true);
				obj.emit('new:TimePair', time);
			}
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
			buf.next_id = utils.to_int(next_id);
			
			// projects
			foreach(obj.projects).each(function(o) {
				buf.projects.push({'id':utils.to_int(o.id), 'name':''+o.name});
			});
			
			// countdown
			if(obj.countdown) {
				buf.countdown = {
					'started':utils.to_int(obj.countdown.started.getTime()),
					'project':{
						'id':utils.to_int(obj.countdown.project.id),
						'name':''+obj.countdown.project.name}};
			}
			
			// Times
			foreach(obj.times).each(function(o) {
				buf.times.push( {
					'id':utils.to_int(o.id),
					'started':utils.to_int(o.started.getTime()), 
					'stopped':o.stopped ? utils.to_int(o.stopped.getTime()) : undefined,
					'project':{
						'id':utils.to_int(o.project.id),
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

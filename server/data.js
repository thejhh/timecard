/* Timecard Server 
 * Copyright 2011 Jaakko-Heikki Heusala <jheusala@iki.fi>
 * Licensed under the AGPL -- see LICENSE.txt
 */

var json = require('json-object').setup(global),
    foreach = require('snippets').foreach,
    initfn = require('./fn.js').init,
    next_id = 1;

/* Create Project object */
function Project(args) {
	args = args || {};
	if(args.id) {
		this.id = parseInt(''+args.id, 10);
	} else {
		this.id = next_id;
		next_id += 1;
	}
	this.name = ''+args.name;
}

/* Load file */
function load_file(file, load_fn) {
	load_fn = initfn(load_fn);
	var obj = {'projects':[], 'log':[]};
	require('fs').readFile(file, 'utf8', function(err, data) {
		var buf;
		
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
			next_id = parseInt(buf.next_id, 10);
		}
		
		// Prepare projects
		foreach(buf.projects).each(function(d) {
			obj.projects.push( new Project({'id':d.id,'name':d.name}) );
		});
		
		// Prepare log messages
		foreach(buf.log).each(function(o) {
		});
		
		// Prepare methods
		
		// Returns true if countdown is started
		obj.started = function(fn) {
			fn = initfn(fn);
			fn(obj.countdown ? true : false);
		};
		
		// Start countdown
		obj.start = function(project, fn) {
			fn = initfn(fn);
			if(project && (project instanceof Project)) {
				obj.countdown = { 'started':new Date(), 'project':project };
				fn();
			} else {
				fn("invalid argument");
			}
		};
		
		// Stop countdown
		obj.stop = function(fn) {
			fn = initfn(fn);
			var buf;
			if(obj.countdown) {
				buf = obj.countdown;
				delete obj.countdown;
				buf.stopped = new Date();
				fn(undefined, buf);
			} else {
				fn("nothing to stop");
			}
		};
		
		// Get project by ID
		obj.getProjectByID = function(id, fn) {
			fn = initfn(fn);
			var p;
			foreach(obj.projects).each(function(o) {
				if(o.id === id) {
					p = o;
				}
			});
			fn(undefined, p);
		};
		
		// Save data
		obj.save = function(fn) {
			fn = initfn(fn);
		};
		
		load_fn(undefined, obj);
	});
}

var data = module.exports = {};
data.load = load_file;
data.Project = Project;

/* EOF */

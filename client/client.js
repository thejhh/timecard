
var TIMECARD = {};

/* Our local namespace scope */
(function() {
	
	var timecard = TIMECARD;
	timecard.data = {'projects': [], 'log':[]};
	
	/* Prepare callback */
	function initfn(fn) {
		function noop(){};
		return (fn && (typeof fn === 'function')) ? fn : noop;
	}
	
	/* */
	function get_project_by_id(id) {
		var ret, i, list = timecard.data.projects, length=list.length;
		for(i=0; i<length; i=i+1) {
			if(list[i].id === id) {
				ret = list[i];
				break;
			}
		}
		return ret;
	}
	
	/* Create socket object */
	function Socket(io) {
		var socket = this;
		socket.io = io;
		
		/* Setup events callbacks */
		socket.onProjectAdd = function() {};
		socket.onProjectStart = function() {};
		socket.onProjectStop = function() {};
		
		/* Notifications of new projects */
		timecard.io.on('project:add', function(p) {
			socket.onProjectAdd(p);
		});
		
		/* Notifications of stopping project */
		timecard.io.on('project:stop', function(reply) {
			socket.onProjectStop({
				'started':reply.started,
				'stopped':reply.stopped,
				'project':get_project_by_id(reply.project.id) });
		});
		
		/* Notifications of startting project */
		timecard.io.on('project:start', function(reply) {
			var project = get_project_by_id(reply.id);
			socket.onProjectStart(project);
		});
		
	}
	
	/* Add project to server */
	Socket.prototype.addProject = function(name, fn) {
		fn = initfn(fn);
		var socket = this;
		socket.io.emit('client:project:add', name, function(err) {
			fn(err);
		});
	};
	
	/* Start project */
	Socket.prototype.start = function(project, fn) {
		fn = initfn(fn);
		var socket = this;
		socket.io.emit('client:project:start', project.id, function(err) {
			fn(err);
		});
	};
	
	/* Stop (any running) project */
	Socket.prototype.stop = function(fn) {
		fn = initfn(fn);
		var socket = this;
		socket.io.emit('client:project:stop', function(err) {
			fn(err);
		});
	};
	
	
	/* Initialize socket */
	Socket.prototype.init = function(fn) {
		fn = initfn(fn);
		var socket = this;
		socket.io.emit('client:init', function(err, data) {
			fn(err, data);
		});
	};
	
	
	/* Trim */
	function trim(value) {
		return (value || '').replace(/^ +/, '').replace(/ +$/, '');
	}
	
	/* */
	function create_button(name, onclick) {
		var e = document.createElement("button");
		e.appendChild( document.createTextNode(''+name) );
		e.onclick = initfn(onclick);
		return e;
	}
	
	/* Create Project Object */
	function Project(args) {
		args = args || {};
		var m = this,
		    div = document.getElementById('projects_div');
		m.id = args.id;
		m.name = args.name || '';
		m.button = create_button(m.name, function() { timecard.start(m); });
		div.appendChild(m.button);
	}
	
	/* Format time */
	function format_time(d) {
		function f(n) { return (n <= 9) ? '0'+n : n; }
		return f(d.getDate()) + '.' + f(d.getMonth()+1) + '.' + d.getFullYear() + ' ' + f(d.getHours()) + ':' + f(d.getMinutes());
	}
	
	/* Setup status line */
	function set_status(msg, classname) {
		var div = document.getElementById('status_div'),
		    span = document.createElement('span');
		if(classname) {
			span.className = ''+classname;
		}
		span.appendChild( document.createTextNode(''+msg) );
		
		while(div.hasChildNodes()) {
			div.removeChild(div.firstChild);
		}
		div.appendChild( span );
	}
	
	/* Enable or disable stop button */
	function disable_stop_button(value) {
		document.getElementById('stop_button').disabled = value ? true : false;
	}
	
	/* Write log message */
	function write_log(msg, date) {
		var now = date || new Date(),
		    log_div = document.getElementById('log_div'),
		    p = document.createElement("p");
		p.appendChild( document.createTextNode( format_time(now) + ' - ' + msg ) );
		log_div.appendChild(p);
	}
	
	/* Add new project */
	timecard.addProject = function(form) {
		set_status('Adding project...');
		var name = trim(form.elements[0].value);
		
		if(name.length === 0) {
			set_status('Project name missing', 'error');
			return;
		}
		
		timecard.socket.addProject(name, function(err) {
			if(err) {
				set_status('Failed to add project: ' + name, 'error');
			} else {
				set_status('Added project: ' + name);
				form.elements[0].value = '';
			}
		});
	};
	
	/* Start counting on project */
	timecard.start = function(project) {
		set_status('Starting...');
		timecard.socket.start(project, function(err) {
			if(err) {
				set_status('Failed to start project: ' + project.name + ': ' + err, 'error');
			} else {
				set_status('Started project: ' + project.name);
			}
		});
	};
	
	/* Stop counting */
	timecard.stop = function() {
		set_status('Stopping...');
		timecard.socket.stop(function(err) {
			if(err) {
				set_status('Failed to stop project: ' + err, 'error');
			} else {
				set_status('Stopped project');
			}
		});
	};
	
	/* Load initial state from server */
	timecard.load = function() {
		set_status('Loading...');
		timecard.socket.init(function(err, data) {
			var i, table, project;
			
			if(err) {
				set_status('Error: ' + err, 'error');
				return;
			}
			
			table = data.projects;
			for(i=0; i<table.length; i+=1) {
				timecard.data.projects.push( new Project(table[i]) );
			}
			
			if(data.countdown && data.countdown.project) {
				disable_stop_button(false);
				project = get_project_by_id(data.countdown.project.id);
				project.button.disabled = true;
			} else {
				disable_stop_button(true);
			}
			
			set_status('Load successful.');
		});
	};
	
	/* Initialize everything */
	function init_window() {
		timecard.io = io.connect()
		timecard.socket = new Socket(timecard.io);
		
		timecard.socket.onProjectAdd = function(obj) {
			timecard.data.projects.push( new Project({'id':obj.id,'name': obj.name}) );
			write_log('New project: ' + obj.name)
		};
		
		timecard.socket.onProjectStart = function(obj) {
			write_log('Project started: ' + obj.name)
			obj.button.disabled = true;
			disable_stop_button(false);
		};
		
		timecard.socket.onProjectStop = function(obj) {
			write_log('Project stopped: ' + obj.project.name)
			obj.project.button.disabled = false;
			disable_stop_button(true);
		};
		
		timecard.load();
	}
	
	window.onload = init_window;
	
})();

/* EOF */

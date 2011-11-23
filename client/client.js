
var TIMECARD = {};

/* Our local namespace scope */
(function() {
	
	/* Dynamic document manipulations */
	function require_html() {
		var html = {};
		html.$ = function(id) {
			return document.getElementById(id);
		};
		
		html.text = function(str) {
			return document.createTextNode(''+str);
		};
		
		html.element = function(tag) {
			return document.createElement(''+tag);
		};
		
		html.table = function(headers, id) {
			var headers = headers || [],
			    table = html.element('table'),
			    caption = table.createCaption(),
			    thead = table.createTHead(),
			    tbody = table.appendChild(html.element('tbody')),
			    tr = thead.insertRow(),
			    i;
			if(id) table.id = id;
			table.className = 'zebra-striped bordered-table';
			for(i=0; i< headers.length; i=i+1) {
				tr.insertCell(-1).appendChild(headers[i]);
			}
			return table;
		};
		
		/* */
		html.button = function(name, onclick) {
			var e = html.element("button");
			e.className = 'btn';
			e.appendChild( html.text(''+name) );
			e.onclick = utils.initfn(onclick);
			return e;
		};
		
		return html;
	}
	
	/* Utils */
	function require_utils() {
		var utils = {};
		
		/* To int */
		utils.to_int = function(n) {
			if(typeof n === 'number') {
				return n;
			}
			return parseInt(n, 10);
		};
		
		/* To date */
		utils.to_date = function(d) {
			if(d && (d instanceof Date)) {
				return d;
			}
			var ret = new Date();
			ret.setTime(utils.to_int(d));
			return ret;
		};
		
		/* Prepare callback */
		utils.initfn = function(fn) {
			function noop(){};
			return (fn && (typeof fn === 'function')) ? fn : noop;
		};
		
		/* Trim */
		utils.trim = function(value) {
			return (value || '').replace(/^ +/, '').replace(/ +$/, '');
		};
		
		return utils;
	}
	
	var html = require_html(),
	    utils = require_utils();
	
	var elements = {'TimePair': {}, 'Project': {}};
	
	var timecard = TIMECARD;
	timecard.data = {'projects': [], 'log':[], 'times':[], 'dates':[]};
	
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
		fn = utils.initfn(fn);
		var socket = this;
		socket.io.emit('client:project:add', name, function(err) {
			fn(err);
		});
	};
	
	/* Start project */
	Socket.prototype.start = function(project, fn) {
		fn = utils.initfn(fn);
		var socket = this;
		socket.io.emit('client:project:start', project.id, function(err) {
			fn(err);
		});
	};
	
	/* Stop (any running) project */
	Socket.prototype.stop = function(fn) {
		fn = utils.initfn(fn);
		var socket = this;
		socket.io.emit('client:project:stop', function(err) {
			fn(err);
		});
	};
	
	/* Initialize socket */
	Socket.prototype.init = function(fn) {
		fn = utils.initfn(fn);
		var socket = this;
		socket.io.emit('client:init', function(err, data) {
			fn(err, data);
		});
	};
	
	
	/* */
	function create_times_date_element(d) {
		var parent_div = html.$('times_div'),
			table_id = 'table_date_' + d.date.getFullYear() + '_' + d.date.getMonth() + '_' + d.date.getDate(),
		    parent_table = html.$(table_id) || html.table([html.text('Start'), html.text('End'), html.text('Project'), html.text('Time')], table_id),
		    caption = parent_table.createCaption(),
		    tbody = parent_table.tBodies[0],
		    tr = tbody.insertRow(-1);
		caption.appendChild(html.text(format.date(d.date) + ' (total ' + format.hours(d.hours) + ')'));
		parent_div.appendChild(parent_table);
		return parent_table;
	}
	
	/* */
	function create_times_element(timepair) {
		function f(n) { return (n <= 9) ? '0'+n : ''+n; }
		function get_date(d) {
			return f(d.getDate()) + '.' + f(d.getMonth()+1) + '.' + f(d.getFullYear());
		}
		function get_hour(d) {
			return f(d.getHours()) + ':' + f(d.getMinutes());
		}
		var parent_div = html.$('times_div'),
			table_id = 'table_date_' + timepair.started.getFullYear() + '_' + timepair.started.getMonth() + '_' + timepair.started.getDate(),
		    parent_table = html.$(table_id) || html.table([html.text('Start'), html.text('End'), html.text('Project'), html.text('Time')], table_id),
		    tbody = parent_table.tBodies[0],
		    tr = tbody.insertRow(-1),
			start, end, project, time;
		
		parent_div.appendChild(parent_table);
		
		start = tr.insertCell(-1);
		end = tr.insertCell(-1);
		project = tr.insertCell(-1);
		time = tr.insertCell(-1);
		
		start.appendChild( html.text(get_hour(timepair.started)) );
		end.appendChild( html.text(get_hour(timepair.stopped)) );
		project.appendChild( html.text(''+timepair.project.name) );
		time.appendChild( html.text(''+format.hours(timepair.getHours())) );
		
		return tr;
	}
	
	/* Create Project Object */
	function Project(args) {
		args = args || {};
		var m = this,
		    div = html.$('projects_div');
		m.id = args.id;
		m.name = args.name || '';
		m.button = html.button(m.name, function() { timecard.start(m); });
		div.appendChild(m.button);
	}
	
	/* Create timepair Object */
	function TimePair(args) {
		args = args || {};
		var self = this;
		self.id = utils.to_int(args.id);
		self.started = utils.to_date(args.started);
		self.stopped = utils.to_date(args.stopped);
		if(args.project && (args.project instanceof Project) ) {
			self.project = args.project;
		}
		if(!self.project) {
			write_log("Warning! TimePair created without project!");
		}
		
		if(elements.TimePair[self.id] === undefined) {
			// Create new element
			self.element = create_times_element(self);
			elements.TimePair[self.id] = self.element;
		} else {
			self.element = elements.TimePair[self.id];
		}
		
		// Update element data?
	}
	
	/* Create date object for timecards */
	function TimecardDate(args) {
		args = args || {};
		var self = this;
		self.date = utils.to_date(args.date);
		self.hours = args.hours; // FIXME: parse utils.to_float?
		self.element = create_times_date_element(self);
	}
	
	/* */
	TimePair.prototype.getHours = function() {
		var self = this,
			started = self.started.getTime(),
			stopped = self.stopped.getTime();
		return (stopped - started)/1000/3600;
	};
	
	function require_format() {
		var format = {};
		
		function f(n) { return (n <= 9) ? '0'+n : ''+n; }
		
		/* Format time */
		format.date = function(d) {
			function f(n) { return (n <= 9) ? '0'+n : n; }
			return f(d.getDate()) + '.' + f(d.getMonth()+1) + '.' + d.getFullYear();
		};
		
		/* Format time */
		format.time = function(d) {
			function f(n) { return (n <= 9) ? '0'+n : n; }
			return f(d.getDate()) + '.' + f(d.getMonth()+1) + '.' + d.getFullYear() + ' ' + f(d.getHours()) + ':' + f(d.getMinutes());
		};
		
		format.hours = function(hours) {
			var h = Math.floor(hours),
			    m = Math.round((hours-h)*60);
			return f(h) + ':' + f(m);
		};
		
		return format;
	}
	
	var format = require_format();
	
	/* Setup status line */
	function set_status(msg, classname) {
		var div = html.$('status_div'),
		    span = html.element('span');
		if(classname) {
			span.className = ''+classname;
		}
		span.appendChild( html.text(msg) );
		
		while(div.hasChildNodes()) {
			div.removeChild(div.firstChild);
		}
		div.appendChild( span );
	}
	
	/* Enable or disable stop button */
	function disable_stop_button(value) {
		html.$('stop_button').disabled = value ? true : false;
	}
	
	/* Write log message */
	function write_log(msg, date) {
		var now = date || new Date(),
		    log_div = html.$('log_div'),
		    p = html.element("p");
		p.appendChild( html.text( format.time(now) + ' - ' + msg ) );
		log_div.appendChild(p);
	}
	
	/* Add new project */
	timecard.addProject = function(form) {
		set_status('Adding project...');
		var name = utils.trim(form.elements[0].value);
		
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
			
			if(data.dates && (data.dates.length != 0)) {
				table = data.dates;
				for(i=0; i<table.length; i+=1) {
					timecard.data.dates.push( new TimecardDate(table[i]) );
				}
			}
			
			if(data.times && (data.times.length != 0)) {
				table = data.times;
				for(i=0; i<table.length; i+=1) {
					timecard.data.times.push( new TimePair({
						'id':table[i].id,
						'started':table[i].started,
						'stopped':table[i].stopped,
						'project':get_project_by_id(table[i].project.id)} ));
				}
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

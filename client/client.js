
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
		
		html.replace = function(e, n) {
			while(e.hasChildNodes()) {
				e.removeChild(e.firstChild);
			}
			e.appendChild( n );
			return e;
		};
		
		return html;
	}
	
	/* Utils */
	function require_utils() {
		var utils = {};
		
		/* To int */
		utils.to_bool = function(n) {
			return (n) ? true : false;
		};
		
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
		socket.onTimepairAdd = function() {};
		socket.onTimepairUpdate = function() {};
		
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
		
		/* Notifications of new timepairs */
		timecard.io.on('timepair:add', function(p) {
			socket.onTimepairAdd(p);
		});
		
		/* Notifications of new timepairs */
		timecard.io.on('timepair:update', function(p) {
			socket.onTimepairUpdate(p);
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
	function update_pagination() {
		
		function create_li(href, label, className) {
			var li = html.element('li'),
			    a = html.element('a');
			if(className) {
			    li.className = className;
			}
			a.href = href;
			a.appendChild( html.text(label) );
			li.appendChild(a);
			return li;
		}
		
		var parent_div = html.$('pagination_div'),
		    ul = parent_div.childNodes[0] || html.element('ul'),
		    table, i;
		
		while(ul.hasChildNodes()) {
			ul.removeChild(ul.firstChild);
		}
		
		ul.appendChild( create_li("#", '← Previous', 'prev disabled') );
		table = timecard.data.dates;
		for(i=0; i<table.length; i=i+1) {
			if(table[i].folded === false) {
				ul.appendChild( create_li("#", table[i].date.getDate(), 'active') );
			} else {
				ul.appendChild( create_li("#", table[i].date.getDate()) );
			}
		}
		ul.appendChild( create_li("#", 'Next →', 'next disabled') );
		parent_div.appendChild(ul);
		return ul;
	}
	
	/* */
	function create_times_element(timepair) {
		function f(n) { return (n <= 9) ? '0'+n : ''+n; }
		function get_date(d) {
			return f(d.getDate()) + '.' + f(d.getMonth()+1) + '.' + f(d.getFullYear());
		}
		function get_hour(d) {
			if(d) {
				return f(d.getHours()) + ':' + f(d.getMinutes());
			} else {
				return '';
			}
		}
		var parent_div = html.$('times_div'),
			table_id = 'table_date_' + timepair.started.getFullYear() + '_' + timepair.started.getMonth() + '_' + timepair.started.getDate(),
			search_table = html.$(table_id),
		    parent_table = search_table || html.table([html.text('Start'), html.text('End'), html.text('Project'), html.text('Time')], table_id),
		    tbody = parent_table.tBodies[0],
		    tr = tbody.insertRow(-1),
			start, end, project, time, caption;
		
		//caption.appendChild(html.text('Date ' + format.date(d.date) + ' - Total ' + format.hours(d.hours)));
		
		if(!search_table) {
			caption = parent_table.createCaption();
			caption.appendChild(html.text('Date ' + format.date(timepair.started) ));
			parent_div.appendChild(parent_table);
		}
		
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
		self.stopped = args.stopped ? utils.to_date(args.stopped) : undefined;
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
		
		// Update element data
		self.update = function() {
			function f(n) { return (n <= 9) ? '0'+n : ''+n; }
			function get_hour(d) {
				if(d) {
					return f(d.getHours()) + ':' + f(d.getMinutes());
				} else {
					return '';
				}
			}
			var e = self.element;
			html.replace(e.cells[0], html.text(get_hour(self.started)) );
			html.replace(e.cells[1], html.text(get_hour(self.stopped)) );
			html.replace(e.cells[2], html.text(''+self.project.name) );
			html.replace(e.cells[3], html.text(''+format.hours(self.getHours())) );
		};
	}
	
	/* Create date object for timecards */
	function TimecardDate(args) {
		args = args || {};
		var self = this;
		self.folded = utils.to_bool(args.folded);
		self.date = utils.to_date(args.date);
		self.hours = args.hours; // FIXME: parse utils.to_float?
	}
	
	/* */
	TimePair.prototype.getHours = function() {
		var self = this,
		    now = new Date(),
			started = self.started.getTime(),
			stopped = self.stopped ? self.stopped.getTime() : now.getTime();
		return Math.ceil(stopped - started)/1000/3600;
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
			var h = utils.to_int(Math.floor(hours)),
			    m = utils.to_int(Math.round((hours-h)*60));
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
				update_pagination();
			}
			
			if(data.times && (data.times.length != 0)) {
				table = data.times;
				for(i=0; i<table.length; i+=1) {
					timecard.data.times.push( new TimePair({
						'id':table[i].id,
						'started':table[i].started,
						'stopped':table[i].stopped ? table[i].stopped : undefined,
						'project':get_project_by_id(table[i].project.id)} ));
				}
			}
			
			set_status('Load successful.');
		});
	};
	
	/* */
	timecard.getTimePairById = function(id) {
		var table = timecard.data.times, i;
		for(i=0; i<table.length; i=i+1) {
			if(table[i].id === id) {
				return table[i];
			}
		}
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
		
		timecard.socket.onTimepairAdd = function(obj) {
			timecard.data.times.push( new TimePair({
				'id':obj.id,
				'started':obj.started,
				'stopped':obj.stopped,
				'project':get_project_by_id(obj.project.id)}) );
		};
		
		timecard.socket.onTimepairUpdate = function(obj) {
			var time = timecard.getTimePairById(obj.id);
			if(!time) {
				write_log('Could not find TimePair for #' + obj.id);
				return;
			}
			time.started = utils.to_date(obj.started);
			if(obj.stopped) {
				time.stopped = utils.to_date(obj.stopped);
			}
			if(time.project.id !== obj.project.id) {
				time.project = get_project_by_id(obj.project.id);
			}
			time.update();
			write_log('Updated TimePair for #' + obj.id);
		};
		
		timecard.load();
	}
	
	window.onload = init_window;
	
})();

/* EOF */

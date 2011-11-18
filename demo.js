
var TIMECARD = {};

/* Our local namespace scope */
(function() {
	
	TIMECARD.start = function() {};
	TIMECARD.stop = function() {};
	
	var our = {};
	our.projects = [];
	
	our.log = [];
	
	/* Create project */
	function Project(args) {
		args = args || {};
		var m = this,
		    projects_div = document.getElementById('projects_div');
		m.name = args.name || '';
		
		// Add button
		
		m.element = document.createElement("button");
		m.element.appendChild( document.createTextNode(m.name) );
		m.element.onclick = function() { TIMECARD.start(m); };
		projects_div.appendChild(m.element);
	}
	
	/* Format time */
	function format_time(d) {
		function f(n) { return (n <= 9) ? '0'+n : n; }
		return f(d.getDate()) + '.' + f(d.getMonth()+1) + '.' + d.getFullYear() + ' ' + f(d.getHours()) + ':' + f(d.getMinutes());
	}
	
	/* Write log */
	TIMECARD.write_log = function(msg, date) {
		var now = date || new Date(),
		    log_div = document.getElementById('log_div'),
		    p = document.createElement("p");
		p.innerHTML = format_time(now) + ' - ' + msg;
		log_div.appendChild(p);
		our.log.push({'date':now, 'msg':msg});
		TIMECARD.save();
	};
	
	/* Add new project */
	TIMECARD.add_project = function(form) {
		var name = (form.elements[0].value || '').replace(/^ +/, '').replace(/ +$/, '');
		if(name != '') {
			our.projects.push( new Project({'name': name}) );
			form.elements[0].value = '';
			TIMECARD.write_log('New project: ' + name);
		}
	};
	
	/* Start counting on project */
	TIMECARD.start = function(project) {
		if(!(project instanceof Project)) {
			return;
		}
		
		// Stop running project
		if(our.countdown) {
			TIMECARD.stop();
		}
		
		// Start project if now project running
		if(!our.countdown) {
			our.countdown = { 'started':new Date(), 'project':project };
			document.getElementById('stop_button').disabled = false;
			project.element.disabled = true;
			TIMECARD.write_log('Started project: ' + project.name);
		}
	};
	
	/* Stop counting */
	TIMECARD.stop = function() {
		var c;
		if(our.countdown) {
			c = our.countdown;
			delete our.countdown;
			document.getElementById('stop_button').disabled = true;
			c.project.element.disabled = false;
			TIMECARD.write_log('Stopped project: ' + c.project.name);
		}
	};
	
	/* Setup status line */
	TIMECARD.status = function(msg) {
		document.getElementById('status_div').innerHTML = ''+msg;
	};
	
	/* Load data from server */
	TIMECARD.load = function() {
		var i, item, items, d, log_div = document.getElementById('log_div'), log_items = [], matches;
		TIMECARD.status('Loading...');
		if(our.io_socket) {
			our.io_socket.emit('load', function(err, data) {
				if(err) {
					TIMECARD.status('Loading... failed!');
				} else {
					try {
						items = data.log || [];
						for(i=0; i<items.length; ++i) {
							item = items[i];
							
							function d(n) {
								return parseInt((''+n).replace(/^0+/, '').replace(/^$/, '0'), 10);
							}
							//alert(item.date);
							matches = (''+item.date).match(/^([0-9]{4})\-([0-9]{2})\-([0-9]{2})T([0-9]{2}):([0-9]{2}):([0-9]{2})\.([0-9]+)Z$/);
							if(matches) {
								item.date = new Date( d(matches[1]), d(matches[2])-1, d(matches[3]), d(matches[4]), d(matches[5]), d(matches[6]), d(matches[7]) );
							}
							
							if(!(item.date instanceof Date)) {
								throw TypeError("Failed to parse date: " + item.date);
							}
							
							p = document.createElement("p");
							p.innerHTML = format_time(item.date) + ' - ' + item.msg;
							log_div.appendChild(p);
							log_items.push({'date':item.date, 'msg':item.msg});
						}
						
						our.log = log_items;
						TIMECARD.status('Loaded.');
					} catch(e) {
						TIMECARD.status('Loading... failed! ('+e+')');
					}
				}
			});
		} else {
			TIMECARD.status('Loading... failed! No IO-service!');
		}
	};
	
	/* Save data to server */
	TIMECARD.save = function() {
		var buf;
		TIMECARD.status('Saving...');
		if(our.io_socket) {
			buf = {'log':our.log};
			our.io_socket.emit('save', buf, function(err) {
				if(err) {
					TIMECARD.status('Saving... failed!');
				} else {
					TIMECARD.status('Saved.');
				}
			});
		} else {
			TIMECARD.status('Saving... failed! No IO-service!');
		}
	};
	
	/* Initialize everything */
	function init_window() {
		
		// Setup IO service
		our.io_socket = io.connect();
		
		// Load data from server
		TIMECARD.load();
	}
	
	window.onload = init_window;
	
})();

/* EOF */

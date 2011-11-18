
var TIMECARD = {};

/* Our local namespace scope */
(function() {
	
	TIMECARD.start = function() {};
	TIMECARD.stop = function() {};
	
	var our = {};
	our.projects = [];
	
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
	TIMECARD.write_log = function(msg) {
		var now = new Date(),
		    log_div = document.getElementById('log_div'),
		    p = document.createElement("p");
		p.innerHTML = format_time(now) + ' - ' + msg;
		log_div.appendChild(p);
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
	
})();

/* EOF */

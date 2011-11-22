/* Timecard Server 
 * Copyright 2011 Jaakko-Heikki Heusala <jheusala@iki.fi>
 * Licensed under the AGPL -- see LICENSE.txt
 */

var utils = module.exports = {};

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

/* EOF */

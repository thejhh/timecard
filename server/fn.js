/* Timecard Server 
 * Copyright 2011 Jaakko-Heikki Heusala <jheusala@iki.fi>
 * Licensed under the AGPL -- see LICENSE.txt
 */

var fn = module.exports = {};

/* Prepare callback */
fn.init = function(fn) {
	function noop(){};
	return (fn && (typeof fn === 'function')) ? fn : noop;
};

/* EOF */

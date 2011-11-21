/* Timecard Server 
 * Copyright 2011 Jaakko-Heikki Heusala <jheusala@iki.fi>
 * Licensed under the AGPL -- see LICENSE.txt
 */

// Setup HTTP
var app = require('./app.js'),
    io = require('./io.js');

app.listen(3000);
console.log('Server running at port 3000');

/* EOF */

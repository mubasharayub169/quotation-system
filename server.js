const path = require('node:path');

process.chdir(path.join(__dirname, 'backend'));
require('./backend/server');

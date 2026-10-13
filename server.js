/**
 * Root entry file for Hostinger deployment.
 *
 * Hostinger runs this file (via "npm start" or "node server.js") after
 * running the build script. It simply forwards control to the actual
 * backend server located in ./backend/server.js, which serves both the
 * API and the built frontend (frontend/dist).
 */

const path = require('path');

// Change working directory to backend so all relative paths (.env,
// uploads, templates, etc.) resolve correctly.
process.chdir(path.join(__dirname, 'backend'));

// Load the backend server
require('./backend/server.js');
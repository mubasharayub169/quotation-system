const express = require('express');
const fs = require('node:fs');
const path = require('node:path');

function mountFrontend(app, directory, required = false) {
    const indexPath = path.join(directory, 'index.html');
    if (!fs.existsSync(indexPath)) {
        if (required) {
            throw new Error('Frontend build is missing. Run npm run build from the repository root before starting production.');
        }
        return;
    }

    app.use(express.static(directory, { index: false }));
    app.get('*', (req, res, next) => {
        if (/^\/(?:api|uploads|assets)(?:\/|$)/.test(req.path) || path.extname(req.path)) {
            return next();
        }
        if (!req.accepts('html')) return next();
        res.set('Cache-Control', 'no-cache');
        res.sendFile(indexPath);
    });
}

module.exports = { mountFrontend };

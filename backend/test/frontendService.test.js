const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const express = require('express');
const { mountFrontend } = require('../src/services/frontendService');

test('production deployment serves frontend routes without swallowing API or file errors', async (t) => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'quotation-frontend-'));
    t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
    fs.writeFileSync(path.join(directory, 'index.html'), '<html>Quotation application</html>');
    fs.mkdirSync(path.join(directory, 'assets'));
    fs.writeFileSync(path.join(directory, 'assets', 'app.js'), 'console.log("app");');

    const app = express();
    app.get('/api/health', (req, res) => res.json({ status: 'ok' }));
    mountFrontend(app, directory, true);
    app.use((req, res) => res.status(404).json({ error: 'Route not found' }));
    const server = app.listen(0, '127.0.0.1');
    await new Promise((resolve) => server.once('listening', resolve));
    t.after(() => new Promise((resolve, reject) => {
        server.close((error) => error ? reject(error) : resolve());
        server.closeAllConnections();
    }));
    const base = `http://127.0.0.1:${server.address().port}`;

    for (const route of ['/', '/login', '/quotations/7', '/settings/activity-log']) {
        const response = await fetch(`${base}${route}`, { headers: { Accept: 'text/html' } });
        assert.equal(response.status, 200);
        assert.match(response.headers.get('content-type'), /text\/html/);
        assert.equal(response.headers.get('cache-control'), 'no-cache');
        assert.match(await response.text(), /Quotation application/);
    }
    assert.deepEqual(await (await fetch(`${base}/api/health`)).json(), { status: 'ok' });
    assert.equal((await fetch(`${base}/assets/app.js`)).status, 200);
    for (const route of ['/api/missing', '/api', '/uploads/missing.png', '/assets/missing.js', '/favicon.ico']) {
        const response = await fetch(`${base}${route}`, { headers: { Accept: 'text/html' } });
        assert.equal(response.status, 404);
        assert.deepEqual(await response.json(), { error: 'Route not found' });
    }
    assert.equal((await fetch(`${base}/login`, { headers: { Accept: 'application/json' } })).status, 404);
});

test('production fails explicitly when frontend build is missing', () => {
    assert.throws(
        () => mountFrontend(express(), path.join(__dirname, 'missing-build'), true),
        /Frontend build is missing/
    );
    assert.doesNotThrow(() => mountFrontend(express(), path.join(__dirname, 'missing-build')));
});

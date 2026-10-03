const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const express = require('express');
const { IncomingMessage, ServerResponse } = require('node:http');
const { Duplex } = require('node:stream');
const { mountFrontend } = require('../src/services/frontendService');

function request(app, url, accept = 'text/html') {
    // Exercise Express and static file streaming without opening a TCP port in the build container.
    return new Promise((resolve, reject) => {
        const chunks = [];
        const socket = new Duplex({
            read() {},
            write(chunk, encoding, callback) {
                chunks.push(Buffer.from(chunk));
                callback();
            }
        });
        const req = new IncomingMessage(socket);
        req.method = 'GET';
        req.url = url;
        req.headers = { accept, connection: 'close' };
        const res = new ServerResponse(req);
        res.assignSocket(socket);
        res.once('error', reject);
        socket.once('error', reject);
        res.once('finish', () => {
            const output = Buffer.concat(chunks).toString();
            resolve({
                status: res.statusCode,
                contentType: res.getHeader('Content-Type'),
                cacheControl: res.getHeader('Cache-Control'),
                body: output.slice(output.indexOf('\r\n\r\n') + 4)
            });
            socket.destroy();
        });
        app.handle(req, res);
    });
}

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
    for (const route of ['/', '/login', '/quotations/7', '/settings/activity-log']) {
        const response = await request(app, route);
        assert.equal(response.status, 200);
        assert.match(response.contentType, /text\/html/);
        assert.equal(response.cacheControl, 'no-cache');
        assert.match(response.body, /Quotation application/);
    }
    assert.deepEqual(JSON.parse((await request(app, '/api/health')).body), { status: 'ok' });
    const asset = await request(app, '/assets/app.js');
    assert.equal(asset.status, 200);
    assert.equal(asset.body, 'console.log("app");');
    for (const route of ['/api/missing', '/api', '/uploads/missing.png', '/assets/missing.js', '/favicon.ico']) {
        const response = await request(app, route);
        assert.equal(response.status, 404);
        assert.deepEqual(JSON.parse(response.body), { error: 'Route not found' });
    }
    assert.equal((await request(app, '/login', 'application/json')).status, 404);
});

test('production fails explicitly when frontend build is missing', () => {
    assert.throws(
        () => mountFrontend(express(), path.join(__dirname, 'missing-build'), true),
        /Frontend build is missing/
    );
    assert.doesNotThrow(() => mountFrontend(express(), path.join(__dirname, 'missing-build')));
});

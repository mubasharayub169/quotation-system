const test = require('node:test');
const assert = require('node:assert/strict');
const dbPath = require.resolve('../src/config/db');
let handler;
let calls;
let rolledBack;
let committed;
let released;
const conn = {
    query: async (sql, params) => {
        calls.push({ sql, params });
        return handler(sql, params);
    },
    beginTransaction: async () => {},
    rollback: async () => { rolledBack = true; },
    commit: async () => { committed = true; },
    release: () => { released = true; }
};
require.cache[dbPath] = {
    id: dbPath, filename: dbPath, loaded: true,
    exports: { query: conn.query, getConnection: async () => conn }
};
const controller = require('../src/controllers/productController');
const roleCheck = require('../src/middleware/roleCheck');
const product = { article_code: 'P-1', description: 'Motor', unit_type: 'unit', unit_price: '125.50', iva_percent: 21 };
const request = (body = product) => ({ user: { businessId: 4, userId: 2, role: 'owner' }, params: { id: '7' }, body, query: {} });
const response = () => ({
    statusCode: 200,
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; }
});
test.beforeEach(() => {
    calls = [];
    rolledBack = committed = released = false;
    handler = async () => [{ affectedRows: 1, insertId: 7 }];
});

test('product creation validates and audits within one transaction', async () => {
    const res = response();
    await controller.create(request({ ...product, business_id: 99 }), res);
    assert.equal(res.statusCode, 201);
    assert.equal(res.body.data.unit_price, 125.5);
    assert.equal(calls[0].params[0], 4);
    assert.equal(calls[1].sql.includes('INSERT INTO audit_log'), true);
    assert.equal(committed, true);
    assert.equal(released, true);
});

test('audit failures roll back product changes rather than reporting success', async (t) => {
    const originalError = console.error;
    let errorLogged = false;
    console.error = () => { errorLogged = true; };
    t.after(() => { console.error = originalError; });
    handler = async (sql) => {
        if (sql.includes('INSERT INTO audit_log')) throw new Error('Audit write failed');
        return [{ insertId: 7 }];
    };
    const res = response();
    await controller.create(request(), res);
    assert.equal(res.statusCode, 500);
    assert.equal(errorLogged, true);
    assert.equal(rolledBack, true);
    assert.equal(committed, false);
    assert.equal(released, true);
});

test('invalid product fields are rejected before database writes', async () => {
    for (const body of [
        { ...product, unit_price: -1 }, { ...product, unit_price: '1.234' },
        { ...product, unit_price: 'NaN' }, { ...product, iva_percent: 0 },
        { ...product, description: '' }, { ...product, unit_type: 'invalid' },
        { ...product, article_code: 'x'.repeat(51) }
    ]) {
        const res = response();
        await controller.create(request(body), res);
        assert.equal(res.statusCode, 400);
    }
    assert.equal(calls.length, 0);
});

test('product update and deletion cannot target another business', async () => {
    handler = async () => [[]];
    for (const action of ['update', 'delete']) {
        const res = response();
        await controller[action](request(), res);
        assert.equal(res.statusCode, 404);
        assert.equal(rolledBack, true);
        assert.equal(committed, false);
        assert.equal(released, true);
        assert.equal(calls.at(-1).sql.includes('business_id = ? FOR UPDATE'), true);
        assert.deepEqual(calls.at(-1).params, ['7', 4]);
    }
});

test('updates and deletes remain tenant scoped and audited', async () => {
    handler = async (sql) => sql.startsWith('SELECT') ? [[{ id: 7, ...product }]] : [{ affectedRows: 1 }];
    for (const action of ['update', 'delete']) {
        const res = response();
        await controller[action](request(), res);
        assert.equal(res.statusCode, 200);
        const mutation = calls.findLast((call) => /^(UPDATE|DELETE)/.test(call.sql));
        assert.equal(mutation.sql.includes('business_id = ?'), true);
        assert.equal(mutation.params.at(-1), 4);
        assert.equal(calls.at(-1).sql.includes('INSERT INTO audit_log'), true);
    }
});

test('search and counts share tenant/search filters with bounded pagination', async () => {
    handler = async (sql) => sql.includes('COUNT(*)') ? [[{ total: 1 }]] : [[{ id: 7, ...product }]];
    const req = request();
    req.query = { search: 'Motor', page: '2', limit: '10' };
    const res = response();
    await controller.getAll(req, res);
    assert.equal(res.body.pagination.total, 1);
    assert.deepEqual(calls[0].params, [4, '%Motor%', '%Motor%', 10, 10]);
    assert.deepEqual(calls[1].params, [4, '%Motor%', '%Motor%']);
    for (const query of [{ limit: '101' }, { page: '-1' }, { search: [] }]) {
        req.query = query;
        const invalid = response();
        await controller.getAll(req, invalid);
        assert.equal(invalid.statusCode, 400);
    }
});

test('owner-only management rejects staff and business reads reject superadmins', () => {
    const req = request();
    req.user.role = 'staff';
    const res = response();
    roleCheck('owner')(req, res, () => assert.fail('Staff must not manage products'));
    assert.equal(res.statusCode, 403);
    let permitted = false;
    roleCheck('owner', 'staff')(req, response(), () => { permitted = true; });
    assert.equal(permitted, true);
    req.user.role = 'superadmin';
    const adminResponse = response();
    roleCheck('owner', 'staff')(req, adminResponse, () => assert.fail('Superadmin must not access tenant catalog'));
    assert.equal(adminResponse.statusCode, 403);
});

test('product selection copies a snapshot while preserving quantity and discount', async () => {
    const { applyProduct } = await import('../../frontend/src/utils/productOptions.js');
    const item = { description: 'Manual', quantity: 3, discount_percent: 5 };
    const selected = applyProduct(item, product);
    assert.equal(selected.description, 'Motor');
    assert.equal(selected.unit_price, 125.5);
    assert.equal(selected.iva_percent, 21);
    assert.equal(selected.quantity, 3);
    assert.equal(selected.discount_percent, 5);
    assert.equal(item.description, 'Manual');
    assert.equal(selected.product_id, undefined);
});

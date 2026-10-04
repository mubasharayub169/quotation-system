const test = require('node:test');
const assert = require('node:assert/strict');
const calls = [];
const dbPath = require.resolve('../src/config/db');
require.cache[dbPath] = {
    id: dbPath, filename: dbPath, loaded: true,
    exports: { query: async (sql, params) => {
        calls.push({ sql, params });
        return sql.includes('COUNT(*)') ? [[{ total: 21 }]] : [[]];
    } }
};
const quotations = require('../src/controllers/quotationController');
const invoices = require('../src/controllers/invoiceController');
const res = () => ({
    statusCode: 200,
    status(code) { this.statusCode = code; return this; },
    json(data) { this.body = data; return this; }
});

for (const [controller, alias, date, statusKey, status] of [
    [quotations, 'q', 'quotation_date', 'status', 'accepted'],
    [invoices, 'i', 'invoice_date', 'payment_status', 'paid']
]) {
    test(`${date} uses inclusive date filters and identical tenant/search/status counts`, async () => {
        calls.length = 0;
        const response = res();
        await controller.getAll({ user: { businessId: 4 }, query: {
            page: '2', limit: '10', search: 'Customer', [statusKey]: status,
            date_from: '2026-10-01', date_to: '2026-10-03'
        } }, response);
        assert.equal(response.statusCode, 200);
        assert.deepEqual(response.body.pagination, { page: 2, limit: 10, total: 21 });
        assert.deepEqual(calls[0].params, [4, status, '%Customer%', '%Customer%', '%Customer%', '2026-10-01', '2026-10-03', 10, 10]);
        assert.deepEqual(calls[1].params, calls[0].params.slice(0, -2));
        for (const call of calls) {
            assert.ok(call.sql.includes(`${alias}.${date} >= ?`));
            assert.ok(call.sql.includes(`${alias}.${date} <= ?`));
            assert.ok(call.sql.includes(`${alias}.business_id = ?`));
            assert.ok(call.sql.includes('JOIN customers'));
        }
        assert.ok(calls[0].sql.includes(`${alias}.id DESC`));
    });

    test(`${date} defaults to 10 rows, retains dashboard limit and supports one-sided dates`, async () => {
        for (const query of [{}, { limit: '1' }, { date_from: '2024-02-29' }, { date_to: '2026-10-03' }]) {
            calls.length = 0;
            const response = res();
            await controller.getAll({ user: { businessId: 4 }, query }, response);
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.pagination.limit, Number(query.limit || 10));
            assert.equal(calls[0].params.at(-1), 0);
        }
    });

    test(`${date} rejects invalid dates, reversed ranges and malformed pagination before querying`, async () => {
        for (const query of [
            { date_from: '2026-02-30' }, { date_to: 'invalid' },
            { date_from: '2026-10-03', date_to: '2026-10-01' },
            { date_from: [] }, { page: '0' }, { page: '2x' }, { limit: '101' },
            { [statusKey]: 'bad' }
        ]) {
            calls.length = 0;
            const response = res();
            await controller.getAll({ user: { businessId: 4 }, query }, response);
            assert.equal(response.statusCode, 400);
            assert.equal(calls.length, 0);
        }
    });
}

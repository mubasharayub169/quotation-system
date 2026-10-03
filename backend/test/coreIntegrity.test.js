const test = require('node:test');
const assert = require('node:assert/strict');

const dbPath = require.resolve('../src/config/db');
const sequences = new Map();
const paymentUpdates = [];
const auditEntries = [];
let auditReadQueries = [];

class MockConnection {
    lastInsertId = 0;
    rollbackCount = 0;
    commitCount = 0;
    releaseCount = 0;
    queryHandler = async () => [[]];

    async query(sql, params = []) {
        if (sql.includes('FROM invoices') && sql.includes('FOR UPDATE')) {
            return [[{
                invoice_number: 'FACT-2026-0001',
                grand_total: '100.00',
                payment_status: 'unpaid',
                amount_paid: '0.00',
                payment_date: null
            }]];
        }
        if (sql.includes('INSERT INTO audit_log')) {
            auditEntries.push(params);
            return [{ affectedRows: 1 }];
        }
        if (sql.startsWith('UPDATE invoices')) {
            paymentUpdates.push(params);
            return [{ affectedRows: 1 }];
        }
        if (sql.includes('INSERT INTO number_sequences')) {
            const key = params.join(':');
            this.lastInsertId = (sequences.get(key) || 0) + 1;
            sequences.set(key, this.lastInsertId);
            return [{ affectedRows: 1 }];
        }

        if (sql.includes('SELECT LAST_INSERT_ID()')) {
            return [[{ last_number: this.lastInsertId }]];
        }

        return this.queryHandler(sql, params);
    }

    async beginTransaction() {}
    async rollback() { this.rollbackCount += 1; }
    async commit() { this.commitCount += 1; }
    release() { this.releaseCount += 1; }
}

const database = {
    async getConnection() {
        return new MockConnection();
    },
    async query(sql, params) {
        if (sql.includes('FROM audit_log a')) {
            auditReadQueries.push({ sql, params });
            return sql.includes('COUNT(*)') ? [[{ total: 51 }]] : [[{
                id: 1,
                action: 'create',
                table_name: 'customers',
                record_id: 8,
                new_data: JSON.stringify({
                    invoice_number: 'FACT-2026-0001',
                    email: 'private@example.test'
                }),
                actor_name: 'Business Owner'
            }]];
        }
        if (sql.startsWith('UPDATE invoices')) {
            paymentUpdates.push(params);
            return [{ affectedRows: 1 }];
        }
        throw new Error(`Unexpected SQL: ${sql}`);
    }
};

require.cache[dbPath] = {
    id: dbPath,
    filename: dbPath,
    loaded: true,
    exports: database
};

const numberService = require('../src/services/numberService');
const auditService = require('../src/services/auditService');
const quotationController = require('../src/controllers/quotationController');
const invoiceController = require('../src/controllers/invoiceController');
const adminController = require('../src/controllers/adminController');
const businessController = require('../src/controllers/businessController');

function responseRecorder() {
    return {
        statusCode: 200,
        body: undefined,
        status(code) {
            this.statusCode = code;
            return this;
        },
        json(body) {
            this.body = body;
            return this;
        }
    };
}

test('number generation returns unique values for concurrent requests', async () => {
    const values = await Promise.all(
        Array.from({ length: 100 }, () => numberService.getNextNumber(1, 'quotation'))
    );

    assert.equal(new Set(values).size, 100);
    assert.deepEqual(
        values.map((value) => Number(value.slice(-4))).sort((a, b) => a - b),
        Array.from({ length: 100 }, (_, index) => index + 1)
    );
});

test('number generation preserves customer and invoice formats', async () => {
    assert.match(await numberService.getNextNumber(2, 'customer'), /^CLI-\d{4}$/);
    assert.match(await numberService.getNextNumber(2, 'invoice'), /^FACT-\d{4}-\d{4}$/);
});

test('number generation rejects unsupported sequence types', async () => {
    await assert.rejects(numberService.getNextNumber(1, 'unknown'), /Unsupported sequence type/);
});

test('audit entries include the tenant and exclude unprovided secrets', async () => {
    const conn = new MockConnection();
    await auditService.log({
        user: { userId: 12, businessId: 4 },
        ip: '127.0.0.1'
    }, {
        action: 'password_reset',
        tableName: 'users',
        recordId: 99,
        newData: { password_reset: true }
    }, conn);

    const entry = auditEntries.at(-1);
    assert.equal(entry[0], 12);
    assert.equal(entry[1], 4);
    assert.equal(entry[2], 'password_reset');
    assert.equal(entry[3], 'users');
    assert.equal(entry[4], 99);
    assert.deepEqual(JSON.parse(entry[6]), {
        password_reset: true,
        business_id: 4
    });
    assert.equal(JSON.stringify(entry).includes('password_hash'), false);
});

test('activity log is tenant-filtered and paginated', async () => {
    auditReadQueries = [];
    const res = responseRecorder();
    await businessController.getAuditLog({
        user: { businessId: 4 },
        query: { page: '2', limit: '500' }
    }, res);

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.data.length, 1);
    assert.deepEqual(res.body.pagination, { page: 2, limit: 100, total: 51 });
    assert.equal(res.body.data[0].summary.invoice_number, 'FACT-2026-0001');
    assert.equal(res.body.data[0].summary.email, undefined);
    assert.equal(res.body.data[0].new_data, undefined);
    assert.equal(auditReadQueries.length, 2);
    assert.equal(auditReadQueries[0].params[0], 4);
    assert.equal(auditReadQueries[0].params[1], 4);
    assert.equal(auditReadQueries[0].params[2], 100);
    assert.equal(auditReadQueries[0].params[3], 100);
});

test('quotation edits cannot attach another business customer', async () => {
    const conn = new MockConnection();
    let quotationUpdated = false;
    conn.queryHandler = async (sql) => {
        if (sql.includes('FROM quotations WHERE id = ? AND business_id = ?')) {
            return [[{
                id: 7,
                quotation_number: 'PRES-2026-0007',
                customer_id: 1,
                grand_total: '100.00',
                status: 'draft'
            }]];
        }
        if (sql.includes('FROM customers WHERE id = ? AND business_id = ?')) {
            return [[]];
        }
        if (sql.startsWith('UPDATE quotations')) quotationUpdated = true;
        return [[]];
    };
    database.getConnection = async () => conn;

    const res = responseRecorder();
    await quotationController.update({
        user: { businessId: 4 },
        params: { id: '7' },
        body: {
            customer_id: 99,
            items: [{ description: 'Service', quantity: 1, unit_price: 100 }]
        }
    }, res);

    assert.equal(res.statusCode, 404);
    assert.equal(res.body.error, 'Customer not found');
    assert.equal(quotationUpdated, false);
    assert.equal(conn.rollbackCount, 1);
    assert.equal(conn.releaseCount, 1);
});

test('quotation statuses cannot be forged as invoiced or changed after invoicing', async () => {
    const directInvoicedResponse = responseRecorder();
    await quotationController.updateStatus({
        user: { businessId: 4 },
        params: { id: '7' },
        body: { status: 'invoiced' }
    }, directInvoicedResponse);
    assert.equal(directInvoicedResponse.statusCode, 400);

    const conn = new MockConnection();
    let statusUpdated = false;
    conn.queryHandler = async (sql) => {
        if (sql.includes('FROM quotations') && sql.includes('FOR UPDATE')) {
            return [[{ quotation_number: 'PRES-2026-0007', status: 'invoiced' }]];
        }
        if (sql.startsWith('UPDATE quotations')) statusUpdated = true;
        return [[]];
    };
    database.getConnection = async () => conn;
    const invoicedResponse = responseRecorder();
    await quotationController.updateStatus({
        user: { businessId: 4 },
        params: { id: '7' },
        body: { status: 'accepted' }
    }, invoicedResponse);

    assert.equal(invoicedResponse.statusCode, 400);
    assert.equal(statusUpdated, false);
    assert.equal(conn.rollbackCount, 1);
    assert.equal(conn.releaseCount, 1);
});

test('quotation status transitions follow the approved workflow', async (t) => {
    const cases = [
        { from: 'draft', to: 'sent', allowed: true },
        { from: 'sent', to: 'accepted', allowed: true },
        { from: 'sent', to: 'rejected', allowed: true },
        { from: 'draft', to: 'accepted', allowed: false },
        { from: 'accepted', to: 'sent', allowed: false },
        { from: 'accepted', to: 'rejected', allowed: false },
        { from: 'rejected', to: 'accepted', allowed: false }
    ];

    for (const { from, to, allowed } of cases) {
        await t.test(`${from} to ${to} is ${allowed ? 'allowed' : 'blocked'}`, async () => {
            const conn = new MockConnection();
            let statusUpdated = false;
            conn.queryHandler = async (sql) => {
                if (sql.includes('FROM quotations') && sql.includes('FOR UPDATE')) {
                    return [[{ quotation_number: 'PRES-2026-0007', status: from }]];
                }
                if (sql.startsWith('UPDATE quotations')) statusUpdated = true;
                return [[]];
            };
            database.getConnection = async () => conn;
            const res = responseRecorder();

            await quotationController.updateStatus({
                user: { businessId: 4 },
                params: { id: '7' },
                body: { status: to }
            }, res);

            assert.equal(res.statusCode, allowed ? 200 : 400);
            assert.equal(statusUpdated, allowed);
            assert.equal(conn.commitCount, allowed ? 1 : 0);
            assert.equal(conn.rollbackCount, allowed ? 0 : 1);
            assert.equal(conn.releaseCount, 1);
        });
    }
});

test('only accepted quotations can be converted to invoices', async () => {
    const conn = new MockConnection();
    let invoiceInserted = false;
    conn.queryHandler = async (sql) => {
        if (sql.includes('FROM quotations') && sql.includes('FOR UPDATE')) {
            return [[{
                id: 7,
                quotation_number: 'PRES-2026-0007',
                status: 'sent'
            }]];
        }
        if (sql.startsWith('INSERT INTO invoices')) invoiceInserted = true;
        return [[]];
    };
    database.getConnection = async () => conn;
    const res = responseRecorder();

    await invoiceController.createFromQuotation({
        user: { businessId: 4, userId: 2 },
        params: { quotationId: '7' },
        body: {}
    }, res);

    assert.equal(res.statusCode, 400);
    assert.equal(res.body.error, 'Only accepted quotations can be converted to an invoice');
    assert.equal(invoiceInserted, false);
    assert.equal(conn.rollbackCount, 1);
    assert.equal(conn.releaseCount, 1);
});

test('payment updates enforce amount and status consistency', async () => {
    const validPayments = [
        ['unpaid', 0],
        ['partial', 30.25],
        ['paid', 100]
    ];

    for (const [payment_status, amount_paid] of validPayments) {
        const res = responseRecorder();
        await invoiceController.updatePayment({
            user: { businessId: 4 },
            params: { id: '9' },
            body: { payment_status, amount_paid }
        }, res);
        assert.equal(res.statusCode, 200);
    }

    const invalidPayments = [
        ['paid', 99],
        ['partial', 100],
        ['unpaid', 1],
        ['partial', -1],
        ['partial', 1.234],
        ['paid', 101]
    ];

    for (const [payment_status, amount_paid] of invalidPayments) {
        const res = responseRecorder();
        await invoiceController.updatePayment({
            user: { businessId: 4 },
            params: { id: '9' },
            body: { payment_status, amount_paid }
        }, res);
        assert.equal(res.statusCode, 400);
    }

    assert.equal(paymentUpdates.length, validPayments.length);
    assert.equal(auditEntries.filter((entry) => entry[2] === 'payment_update').length, validPayments.length);
});

test('early transaction responses roll back and release their connections', async (t) => {
    const scenarios = [
        {
            name: 'quotation creation validation',
            run: (res) => quotationController.create({ user: { businessId: 1, userId: 1 }, body: {} }, res),
            expectedStatus: 400
        },
        {
            name: 'quotation calculation input validation',
            run: (res) => quotationController.create({
                user: { businessId: 1, userId: 1 },
                body: {
                    customer_id: 1,
                    items: [{
                        description: 'Invalid IVA',
                        quantity: 1,
                        unit_price: 100,
                        iva_percent: 8
                    }]
                }
            }, res),
            expectedStatus: 400
        },
        {
            name: 'quotation update not found',
            run: (res) => quotationController.update({
                user: { businessId: 1 },
                params: { id: 'missing' },
                body: { items: [] }
            }, res),
            expectedStatus: 404,
            queryRows: [[]]
        },
        {
            name: 'quotation duplication not found',
            run: (res) => quotationController.duplicate({
                user: { businessId: 1, userId: 1 },
                params: { id: 'missing' },
                body: {}
            }, res),
            expectedStatus: 404,
            queryRows: [[]]
        },
        {
            name: 'invoice creation quotation not found',
            run: (res) => invoiceController.createFromQuotation({
                user: { businessId: 1, userId: 1 },
                params: { quotationId: 'missing' },
                body: {}
            }, res),
            expectedStatus: 404,
            queryRows: [[]]
        },
        {
            name: 'invoice deletion not found',
            run: (res) => invoiceController.delete({
                user: { businessId: 1 },
                params: { id: 'missing' }
            }, res),
            expectedStatus: 404,
            queryRows: [[]]
        },
        {
            name: 'business creation validation',
            run: (res) => adminController.createBusiness({ body: {} }, res),
            expectedStatus: 400
        }
    ];

    for (const scenario of scenarios) {
        await t.test(scenario.name, async () => {
            const conn = new MockConnection();
            if (scenario.queryRows) {
                conn.queryHandler = async () => scenario.queryRows;
            }
            database.getConnection = async () => conn;

            const res = responseRecorder();
            await scenario.run(res);

            assert.equal(res.statusCode, scenario.expectedStatus);
            assert.equal(conn.rollbackCount, 1);
            assert.equal(conn.commitCount, 0);
            assert.equal(conn.releaseCount, 1);
        });
    }
});

const test = require('node:test');
const assert = require('node:assert/strict');
const calculationService = require('../src/services/calculationService');

test('calculates discounted quotation lines and transport tax', () => {
    const result = calculationService.calculateQuotation([{
        description: 'Installation',
        unit_type: 'hour',
        quantity: '2.00',
        unit_price: '100.00',
        discount_percent: '10.00',
        iva_percent: '21'
    }], '10.00');

    assert.deepEqual(result.items[0], {
        item_order: 1,
        article_code: null,
        description: 'Installation',
        unit_type: 'hour',
        quantity: 2,
        unit_price: 100,
        subtotal: 200,
        discount_percent: 10,
        discount_amount: 20,
        base_after_discount: 180,
        iva_percent: 21,
        iva_amount: 37.8,
        line_total: 217.8
    });
    assert.equal(result.total_subtotal, 200);
    assert.equal(result.total_discount, 20);
    assert.equal(result.total_base, 190);
    assert.equal(result.total_iva, 39.9);
    assert.equal(result.grand_total, 229.9);
    assert.equal(result.iva_21_base, 190);
    assert.equal(result.iva_21_amount, 39.9);
});

test('separates supported IVA buckets and defaults omitted optional rates', () => {
    const result = calculationService.calculateQuotation([
        { description: 'Standard', quantity: 1, unit_price: 100, iva_percent: 21 },
        { description: 'Reduced', quantity: 1, unit_price: 100, iva_percent: 10 },
        { description: 'Super reduced', quantity: 1, unit_price: 100, iva_percent: 4 },
        { description: 'Default rate', quantity: '0.50', unit_price: 10 }
    ]);

    assert.equal(result.iva_21_base, 105);
    assert.equal(result.iva_21_amount, 22.05);
    assert.equal(result.iva_10_base, 100);
    assert.equal(result.iva_10_amount, 10);
    assert.equal(result.iva_4_base, 100);
    assert.equal(result.iva_4_amount, 4);
    assert.equal(result.total_base, 305);
    assert.equal(result.total_iva, 36.05);
    assert.equal(result.grand_total, 341.05);
});

test('rejects malformed, negative, unsupported, and out-of-range quotation inputs', () => {
    const validItem = {
        description: 'Valid item',
        quantity: 1,
        unit_price: 10,
        discount_percent: 0,
        iva_percent: 21,
        unit_type: 'unit'
    };
    const invalidItems = [
        null,
        { ...validItem, description: '  ' },
        { ...validItem, quantity: 0 },
        { ...validItem, quantity: -1 },
        { ...validItem, quantity: '2items' },
        { ...validItem, quantity: 1.001 },
        { ...validItem, unit_price: -1 },
        { ...validItem, unit_price: '10euros' },
        { ...validItem, unit_price: 10.001 },
        { ...validItem, discount_percent: -0.01 },
        { ...validItem, discount_percent: 100.01 },
        { ...validItem, discount_percent: 5.555 },
        { ...validItem, iva_percent: 0 },
        { ...validItem, iva_percent: 8 },
        { ...validItem, unit_type: 'unknown' },
        { ...validItem, article_code: 'A'.repeat(51) },
        { ...validItem, quantity: 9999999999.99, unit_price: 2 }
    ];

    for (const item of invalidItems) {
        const message = calculationService.validateQuotation([item]);
        assert.equal(typeof message, 'string', `Expected invalid item to be rejected: ${JSON.stringify(item)}`);
        assert.throws(() => calculationService.calculateQuotation([item]), RangeError);
    }

    for (const transport of [-1, '3bad', 1.001, 10000000000]) {
        assert.notEqual(calculationService.validateQuotation([validItem], transport), null);
    }

    assert.notEqual(calculationService.validateQuotation([], 0), null);
    assert.notEqual(calculationService.validateQuotation({}, 0), null);
});

test('rejects totals that exceed the database decimal range', () => {
    const item = {
        description: 'Large item',
        quantity: 1,
        unit_price: 9999999999.99,
        iva_percent: 21
    };

    assert.throws(
        () => calculationService.calculateQuotation([item]),
        /Quotation total exceeds the supported amount/
    );
});

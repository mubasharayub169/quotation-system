const db = require('../config/db');
const calcService = require('../services/calculationService');
const numberService = require('../services/numberService');
const auditService = require('../services/auditService');

/**
 * GET /api/quotations
 * List all quotations with filters
 */
exports.getAll = async (req, res) => {
    try {
        const { businessId } = req.user;
        const { search = '', status = '', page = 1, limit = 50 } = req.query;
        const offset = (parseInt(page) - 1) * parseInt(limit);

        let query = `
            SELECT q.id, q.quotation_number, q.quotation_date, q.valid_until,
                   q.grand_total, q.status, q.created_at,
                   c.id AS customer_id, c.name AS customer_name, c.nif_cif
            FROM quotations q
            JOIN customers c ON q.customer_id = c.id
            WHERE q.business_id = ?
        `;
        const params = [businessId];

        if (status) {
            query += ` AND q.status = ?`;
            params.push(status);
        }

        if (search) {
            query += ` AND (q.quotation_number LIKE ? OR c.name LIKE ? OR c.nif_cif LIKE ?)`;
            const s = `%${search}%`;
            params.push(s, s, s);
        }

        query += ` ORDER BY q.created_at DESC LIMIT ? OFFSET ?`;
        params.push(parseInt(limit), offset);

        const [quotations] = await db.query(query, params);

        const [countResult] = await db.query(
            'SELECT COUNT(*) as total FROM quotations WHERE business_id = ?',
            [businessId]
        );

        res.json({
            data: quotations,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: countResult[0].total
            }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
};

/**
 * GET /api/quotations/:id
 */
exports.getById = async (req, res) => {
    try {
        const { businessId } = req.user;
        const { id } = req.params;

        const [quotations] = await db.query(
            `SELECT q.*, 
                    c.name AS customer_name, c.nif_cif, c.address AS customer_address,
                    c.city AS customer_city, c.postal_code AS customer_postal_code,
                    c.phone AS customer_phone, c.email AS customer_email
             FROM quotations q
             JOIN customers c ON q.customer_id = c.id
             WHERE q.id = ? AND q.business_id = ?`,
            [id, businessId]
        );

        if (quotations.length === 0) {
            return res.status(404).json({ error: 'Quotation not found' });
        }

        const [items] = await db.query(
            'SELECT * FROM quotation_items WHERE quotation_id = ? ORDER BY item_order',
            [id]
        );

        res.json({
            data: {
                ...quotations[0],
                items
            }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
};

/**
 * POST /api/quotations
 */
exports.create = async (req, res) => {
    const conn = await db.getConnection();
    try {
        await conn.beginTransaction();

        const { businessId, userId } = req.user;
        const {
            customer_id, items, transport_charge = 0,
            payment_method = 'CONTADO', reference_person,
            observations, valid_days = 30
        } = req.body;

        if (!customer_id) {
            await conn.rollback();
            return res.status(400).json({ error: 'Customer is required' });
        }
        if (!items || items.length === 0) {
            await conn.rollback();
            return res.status(400).json({ error: 'At least one item is required' });
        }
        const validationError = calcService.validateQuotation(items, transport_charge);
        if (validationError) {
            await conn.rollback();
            return res.status(400).json({ error: validationError });
        }

        const [customers] = await conn.query(
            'SELECT id FROM customers WHERE id = ? AND business_id = ?',
            [customer_id, businessId]
        );
        if (customers.length === 0) {
            await conn.rollback();
            return res.status(404).json({ error: 'Customer not found' });
        }

        const calculated = calcService.calculateQuotation(items, transport_charge);
        const quotationNumber = await numberService.getNextNumber(businessId, 'quotation', conn);

        const [result] = await conn.query(
            `INSERT INTO quotations 
             (business_id, quotation_number, customer_id, quotation_date, valid_until,
              payment_method, reference_person,
              total_subtotal, total_discount, total_base, total_iva, grand_total,
              transport_charge,
              iva_21_base, iva_21_amount,
              iva_10_base, iva_10_amount,
              iva_4_base, iva_4_amount,
              observations, status, created_by)
             VALUES (?, ?, ?, CURDATE(), DATE_ADD(CURDATE(), INTERVAL ? DAY),
                     ?, ?,
                     ?, ?, ?, ?, ?,
                     ?,
                     ?, ?,
                     ?, ?,
                     ?, ?,
                     ?, 'draft', ?)`,
            [
                businessId, quotationNumber, customer_id, valid_days,
                payment_method, reference_person || null,
                calculated.total_subtotal, calculated.total_discount,
                calculated.total_base, calculated.total_iva, calculated.grand_total,
                calculated.transport_charge,
                calculated.iva_21_base, calculated.iva_21_amount,
                calculated.iva_10_base, calculated.iva_10_amount,
                calculated.iva_4_base, calculated.iva_4_amount,
                observations || null, userId
            ]
        );

        const quotationId = result.insertId;

        for (const item of calculated.items) {
            await conn.query(
                `INSERT INTO quotation_items 
                 (business_id, quotation_id, item_order, article_code, description, unit_type,
                  quantity, unit_price, subtotal,
                  discount_percent, discount_amount, base_after_discount,
                  iva_percent, iva_amount, line_total)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    businessId, quotationId, item.item_order,
                    item.article_code, item.description, item.unit_type,
                    item.quantity, item.unit_price, item.subtotal,
                    item.discount_percent, item.discount_amount, item.base_after_discount,
                    item.iva_percent, item.iva_amount, item.line_total
                ]
            );
        }

        await auditService.log(req, {
            action: 'create',
            tableName: 'quotations',
            recordId: quotationId,
            newData: {
                quotation_number: quotationNumber,
                customer_id,
                grand_total: calculated.grand_total,
                status: 'draft'
            }
        }, conn);

        await conn.commit();

        res.status(201).json({
            message: 'Quotation created successfully',
            data: {
                id: quotationId,
                quotation_number: quotationNumber,
                ...calculated
            }
        });

    } catch (error) {
        await conn.rollback();
        console.error(error);
        res.status(500).json({ error: error.message || 'Server error' });
    } finally {
        conn.release();
    }
};

/**
 * PUT /api/quotations/:id
 */
exports.update = async (req, res) => {
    const conn = await db.getConnection();
    try {
        await conn.beginTransaction();

        const { businessId } = req.user;
        const { id } = req.params;
        const {
            customer_id, items, transport_charge = 0,
            payment_method, reference_person, observations, valid_days = 30
        } = req.body;

        const [existing] = await conn.query(
            `SELECT id, quotation_number, customer_id, grand_total, status
             FROM quotations WHERE id = ? AND business_id = ?`,
            [id, businessId]
        );
        if (existing.length === 0) {
            await conn.rollback();
            return res.status(404).json({ error: 'Quotation not found' });
        }
        if (existing[0].status === 'invoiced') {
            await conn.rollback();
            return res.status(400).json({ error: 'Cannot edit an invoiced quotation' });
        }

        const validationError = calcService.validateQuotation(items, transport_charge);
        if (validationError) {
            await conn.rollback();
            return res.status(400).json({ error: validationError });
        }
        if (!customer_id) {
            await conn.rollback();
            return res.status(400).json({ error: 'Customer is required' });
        }
        const [customers] = await conn.query(
            'SELECT id FROM customers WHERE id = ? AND business_id = ?',
            [customer_id, businessId]
        );
        if (customers.length === 0) {
            await conn.rollback();
            return res.status(404).json({ error: 'Customer not found' });
        }
        const calculated = calcService.calculateQuotation(items, transport_charge);

        await conn.query(
            `UPDATE quotations SET
                customer_id = ?, valid_until = DATE_ADD(CURDATE(), INTERVAL ? DAY),
                payment_method = ?, reference_person = ?,
                total_subtotal = ?, total_discount = ?, total_base = ?, total_iva = ?, grand_total = ?,
                transport_charge = ?,
                iva_21_base = ?, iva_21_amount = ?,
                iva_10_base = ?, iva_10_amount = ?,
                iva_4_base = ?, iva_4_amount = ?,
                observations = ?
             WHERE id = ? AND business_id = ?`,
            [
                customer_id, valid_days,
                payment_method, reference_person || null,
                calculated.total_subtotal, calculated.total_discount,
                calculated.total_base, calculated.total_iva, calculated.grand_total,
                calculated.transport_charge,
                calculated.iva_21_base, calculated.iva_21_amount,
                calculated.iva_10_base, calculated.iva_10_amount,
                calculated.iva_4_base, calculated.iva_4_amount,
                observations || null, id, businessId
            ]
        );

        await conn.query('DELETE FROM quotation_items WHERE quotation_id = ?', [id]);

        for (const item of calculated.items) {
            await conn.query(
                `INSERT INTO quotation_items 
                 (business_id, quotation_id, item_order, article_code, description, unit_type,
                  quantity, unit_price, subtotal,
                  discount_percent, discount_amount, base_after_discount,
                  iva_percent, iva_amount, line_total)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    businessId, id, item.item_order,
                    item.article_code, item.description, item.unit_type,
                    item.quantity, item.unit_price, item.subtotal,
                    item.discount_percent, item.discount_amount, item.base_after_discount,
                    item.iva_percent, item.iva_amount, item.line_total
                ]
            );
        }

        await auditService.log(req, {
            action: 'update',
            tableName: 'quotations',
            recordId: id,
            oldData: {
                quotation_number: existing[0].quotation_number,
                customer_id: existing[0].customer_id,
                grand_total: existing[0].grand_total,
                status: existing[0].status
            },
            newData: {
                quotation_number: existing[0].quotation_number,
                customer_id,
                grand_total: calculated.grand_total,
                status: existing[0].status
            }
        }, conn);

        await conn.commit();

        res.json({
            message: 'Quotation updated successfully',
            data: { id, ...calculated }
        });

    } catch (error) {
        await conn.rollback();
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    } finally {
        conn.release();
    }
};

/**
 * PATCH /api/quotations/:id/status
 */
exports.updateStatus = async (req, res) => {
    try {
        const { businessId } = req.user;
        const { id } = req.params;
        const { status } = req.body;

        const transitions = {
            draft: ['sent'],
            sent: ['accepted', 'rejected'],
            accepted: [],
            rejected: [],
            invoiced: []
        };
        if (!Object.values(transitions).flat().includes(status)) {
            return res.status(400).json({ error: 'Invalid status' });
        }

        const conn = await db.getConnection();
        try {
            await conn.beginTransaction();
            const [quotations] = await conn.query(
                `SELECT quotation_number, status FROM quotations
                 WHERE id = ? AND business_id = ? FOR UPDATE`,
                [id, businessId]
            );
            if (quotations.length === 0) {
                await conn.rollback();
                return res.status(404).json({ error: 'Quotation not found' });
            }
            if (!transitions[quotations[0].status]?.includes(status)) {
                await conn.rollback();
                return res.status(400).json({ error: 'Invalid quotation status transition' });
            }

            await conn.query(
                'UPDATE quotations SET status = ? WHERE id = ? AND business_id = ?',
                [status, id, businessId]
            );
            await auditService.log(req, {
                action: 'status_change',
                tableName: 'quotations',
                recordId: id,
                oldData: { quotation_number: quotations[0].quotation_number, status: quotations[0].status },
                newData: { quotation_number: quotations[0].quotation_number, status }
            }, conn);
            await conn.commit();
        } catch (error) {
            await conn.rollback();
            throw error;
        } finally {
            conn.release();
        }

        res.json({ message: 'Status updated', status });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
};

/**
 * DELETE /api/quotations/:id
 */
exports.delete = async (req, res) => {
    try {
        const { businessId } = req.user;
        const { id } = req.params;

        const [existing] = await db.query(
            'SELECT quotation_number, status FROM quotations WHERE id = ? AND business_id = ?',
            [id, businessId]
        );

        if (existing.length === 0) {
            return res.status(404).json({ error: 'Quotation not found' });
        }
        if (existing[0].status === 'invoiced') {
            return res.status(400).json({ error: 'Cannot delete an invoiced quotation' });
        }

        const conn = await db.getConnection();
        try {
            await conn.beginTransaction();
            await conn.query(
                'DELETE FROM quotations WHERE id = ? AND business_id = ?',
                [id, businessId]
            );
            await auditService.log(req, {
                action: 'delete',
                tableName: 'quotations',
                recordId: id,
                oldData: { quotation_number: existing[0].quotation_number, status: existing[0].status }
            }, conn);
            await conn.commit();
        } catch (error) {
            await conn.rollback();
            throw error;
        } finally {
            conn.release();
        }

        res.json({ message: 'Quotation deleted' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
};

/**
 * POST /api/quotations/:id/duplicate
 * Duplicate an existing quotation
 */
exports.duplicate = async (req, res) => {
    const conn = await db.getConnection();
    try {
        await conn.beginTransaction();

        const { businessId, userId } = req.user;
        const { id } = req.params;
        const { valid_days = 30 } = req.body;

        // 1. Load original quotation
        const [quotations] = await conn.query(
            'SELECT * FROM quotations WHERE id = ? AND business_id = ?',
            [id, businessId]
        );
        if (quotations.length === 0) {
            await conn.rollback();
            return res.status(404).json({ error: 'Quotation not found' });
        }
        const original = quotations[0];

        // 2. Load original items
        const [items] = await conn.query(
            'SELECT * FROM quotation_items WHERE quotation_id = ? ORDER BY item_order',
            [id]
        );

        // 3. Generate new quotation number
        const quotationNumber = await numberService.getNextNumber(businessId, 'quotation', conn);

        // 4. Insert new quotation (copy all values, new number, new dates, draft status)
        const [result] = await conn.query(
            `INSERT INTO quotations 
             (business_id, quotation_number, customer_id, quotation_date, valid_until,
              payment_method, reference_person,
              total_subtotal, total_discount, total_base, total_iva, grand_total,
              transport_charge,
              iva_21_base, iva_21_amount,
              iva_10_base, iva_10_amount,
              iva_4_base, iva_4_amount,
              observations, status, created_by)
             VALUES (?, ?, ?, CURDATE(), DATE_ADD(CURDATE(), INTERVAL ? DAY),
                     ?, ?,
                     ?, ?, ?, ?, ?,
                     ?,
                     ?, ?,
                     ?, ?,
                     ?, ?,
                     ?, 'draft', ?)`,
            [
                businessId, quotationNumber, original.customer_id, valid_days,
                original.payment_method, original.reference_person,
                original.total_subtotal, original.total_discount,
                original.total_base, original.total_iva, original.grand_total,
                original.transport_charge,
                original.iva_21_base, original.iva_21_amount,
                original.iva_10_base, original.iva_10_amount,
                original.iva_4_base, original.iva_4_amount,
                original.observations, userId
            ]
        );

        const newQuotationId = result.insertId;

        // 5. Copy items
        for (const item of items) {
            await conn.query(
                `INSERT INTO quotation_items 
                 (business_id, quotation_id, item_order, article_code, description, unit_type,
                  quantity, unit_price, subtotal,
                  discount_percent, discount_amount, base_after_discount,
                  iva_percent, iva_amount, line_total)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    businessId, newQuotationId, item.item_order,
                    item.article_code, item.description, item.unit_type,
                    item.quantity, item.unit_price, item.subtotal,
                    item.discount_percent, item.discount_amount, item.base_after_discount,
                    item.iva_percent, item.iva_amount, item.line_total
                ]
            );
        }

        await auditService.log(req, {
            action: 'duplicate',
            tableName: 'quotations',
            recordId: newQuotationId,
            newData: {
                quotation_number: quotationNumber,
                source_quotation_id: id,
                source_quotation_number: original.quotation_number,
                customer_id: original.customer_id,
                grand_total: original.grand_total,
                status: 'draft'
            }
        }, conn);

        await conn.commit();

        res.status(201).json({
            message: 'Quotation duplicated successfully',
            data: {
                id: newQuotationId,
                quotation_number: quotationNumber,
                source_quotation_number: original.quotation_number
            }
        });

    } catch (error) {
        await conn.rollback();
        console.error(error);
        res.status(500).json({ error: error.message || 'Server error' });
    } finally {
        conn.release();
    }
};
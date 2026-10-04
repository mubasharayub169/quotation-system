const db = require('../config/db');
const numberService = require('../services/numberService');
const auditService = require('../services/auditService');
const documentList = require('../services/documentListService');

/**
 * GET /api/invoices
 */
exports.getAll = async (req, res) => {
    try {
        const { businessId } = req.user;
        const filters = documentList.parseFilters(req.query, 'payment_status', ['unpaid', 'partial', 'paid']);
        if (filters.error) return res.status(400).json({ error: filters.error });
        const { page, limit } = filters;
        const filter = documentList.buildFilter('i', 'invoice_date', 'payment_status', businessId, filters);

        let query = `
            SELECT i.id, i.invoice_number, i.invoice_date, i.due_date,
                   i.grand_total, i.payment_status, i.amount_paid,
                   c.id AS customer_id, c.name AS customer_name, c.nif_cif
            FROM invoices i
            JOIN customers c ON i.customer_id = c.id
            WHERE ${filter.where}
        `;
        query += ` ORDER BY i.created_at DESC, i.id DESC LIMIT ? OFFSET ?`;
        const params = [...filter.params, limit, (page - 1) * limit];

        const [invoices] = await db.query(query, params);

        const [countResult] = await db.query(
            `SELECT COUNT(*) as total FROM invoices i JOIN customers c ON i.customer_id = c.id WHERE ${filter.where}`,
            filter.params
        );

        res.json({
            data: invoices,
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
 * GET /api/invoices/summary
 * Financial summary for the business (used by dashboard)
 */
exports.getSummary = async (req, res) => {
    try {
        const { businessId } = req.user;

        const [summary] = await db.query(
            `SELECT 
                COUNT(*) AS total_invoices,
                IFNULL(SUM(grand_total), 0) AS total_invoiced,
                IFNULL(SUM(amount_paid), 0) AS total_paid,
                IFNULL(SUM(grand_total - amount_paid), 0) AS total_pending,
                SUM(CASE WHEN payment_status = 'unpaid' THEN 1 ELSE 0 END) AS unpaid_count,
                SUM(CASE WHEN payment_status = 'partial' THEN 1 ELSE 0 END) AS partial_count,
                SUM(CASE WHEN payment_status = 'paid' THEN 1 ELSE 0 END) AS paid_count
             FROM invoices
             WHERE business_id = ?`,
            [businessId]
        );

        // Also get total quotations for conversion rate
        const [quotesInfo] = await db.query(
            `SELECT 
                COUNT(*) AS total_quotations,
                SUM(CASE WHEN status = 'accepted' THEN 1 ELSE 0 END) AS accepted_count,
                SUM(CASE WHEN status = 'invoiced' THEN 1 ELSE 0 END) AS invoiced_count,
                SUM(CASE WHEN status = 'draft' THEN 1 ELSE 0 END) AS draft_count,
                SUM(CASE WHEN status = 'sent' THEN 1 ELSE 0 END) AS sent_count,
                SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) AS rejected_count,
                IFNULL(SUM(grand_total), 0) AS total_quoted
             FROM quotations
             WHERE business_id = ?`,
            [businessId]
        );

        // Get total customers
        const [customersInfo] = await db.query(
            `SELECT COUNT(*) AS total_customers
             FROM customers
             WHERE business_id = ? AND is_active = 1`,
            [businessId]
        );

        res.json({
            data: {
                ...summary[0],
                ...quotesInfo[0],
                total_customers: customersInfo[0].total_customers,
            }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
};

/**
 * GET /api/invoices/:id
 */
exports.getById = async (req, res) => {
    try {
        const { businessId } = req.user;
        const { id } = req.params;

        const [invoices] = await db.query(
            `SELECT i.*, 
                    c.name AS customer_name, c.nif_cif, c.address AS customer_address,
                    c.city AS customer_city, c.postal_code AS customer_postal_code,
                    c.phone AS customer_phone, c.email AS customer_email,
                    q.quotation_number AS quotation_number
             FROM invoices i
             JOIN customers c ON i.customer_id = c.id
             LEFT JOIN quotations q ON i.quotation_id = q.id
             WHERE i.id = ? AND i.business_id = ?`,
            [id, businessId]
        );

        if (invoices.length === 0) {
            return res.status(404).json({ error: 'Invoice not found' });
        }

        const [items] = await db.query(
            'SELECT * FROM invoice_items WHERE invoice_id = ? ORDER BY item_order',
            [id]
        );

        res.json({
            data: {
                ...invoices[0],
                items
            }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
};

/**
 * POST /api/invoices/from-quotation/:quotationId
 */
exports.createFromQuotation = async (req, res) => {
    const conn = await db.getConnection();
    try {
        await conn.beginTransaction();

        const { businessId, userId } = req.user;
        const { quotationId } = req.params;
        const { due_days = 30 } = req.body;

        const [quotations] = await conn.query(
            'SELECT * FROM quotations WHERE id = ? AND business_id = ? FOR UPDATE',
            [quotationId, businessId]
        );

        if (quotations.length === 0) {
            await conn.rollback();
            return res.status(404).json({ error: 'Quotation not found' });
        }

        const quotation = quotations[0];

        if (quotation.status === 'invoiced') {
            await conn.rollback();
            return res.status(400).json({ error: 'Quotation already invoiced' });
        }
        if (quotation.status !== 'accepted') {
            await conn.rollback();
            return res.status(400).json({ error: 'Only accepted quotations can be converted to an invoice' });
        }

        const [quotationItems] = await conn.query(
            'SELECT * FROM quotation_items WHERE quotation_id = ? ORDER BY item_order',
            [quotationId]
        );

        const invoiceNumber = await numberService.getNextNumber(businessId, 'invoice', conn);

        const [result] = await conn.query(
            `INSERT INTO invoices 
             (business_id, invoice_number, quotation_id, customer_id,
              invoice_date, due_date, payment_method,
              total_subtotal, total_discount, total_base, total_iva, grand_total,
              transport_charge,
              iva_21_base, iva_21_amount,
              iva_10_base, iva_10_amount,
              iva_4_base, iva_4_amount,
              payment_status, amount_paid,
              observations, created_by)
             VALUES (?, ?, ?, ?,
                     CURDATE(), DATE_ADD(CURDATE(), INTERVAL ? DAY), ?,
                     ?, ?, ?, ?, ?,
                     ?,
                     ?, ?,
                     ?, ?,
                     ?, ?,
                     'unpaid', 0.00,
                     ?, ?)`,
            [
                businessId, invoiceNumber, quotationId, quotation.customer_id,
                due_days, quotation.payment_method,
                quotation.total_subtotal, quotation.total_discount,
                quotation.total_base, quotation.total_iva, quotation.grand_total,
                quotation.transport_charge,
                quotation.iva_21_base, quotation.iva_21_amount,
                quotation.iva_10_base, quotation.iva_10_amount,
                quotation.iva_4_base, quotation.iva_4_amount,
                quotation.observations, userId
            ]
        );

        const invoiceId = result.insertId;

        for (const item of quotationItems) {
            await conn.query(
                `INSERT INTO invoice_items 
                 (business_id, invoice_id, item_order, article_code, description, unit_type,
                  quantity, unit_price, subtotal,
                  discount_percent, discount_amount, base_after_discount,
                  iva_percent, iva_amount, line_total)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    businessId, invoiceId, item.item_order,
                    item.article_code, item.description, item.unit_type,
                    item.quantity, item.unit_price, item.subtotal,
                    item.discount_percent, item.discount_amount, item.base_after_discount,
                    item.iva_percent, item.iva_amount, item.line_total
                ]
            );
        }

        await conn.query(
            'UPDATE quotations SET status = ? WHERE id = ? AND business_id = ?',
            ['invoiced', quotationId, businessId]
        );

        await auditService.log(req, {
            action: 'create_from_quotation',
            tableName: 'invoices',
            recordId: invoiceId,
            newData: {
                invoice_number: invoiceNumber,
                quotation_id: quotationId,
                quotation_number: quotation.quotation_number,
                grand_total: quotation.grand_total,
                payment_status: 'unpaid'
            }
        }, conn);
        await auditService.log(req, {
            action: 'status_change',
            tableName: 'quotations',
            recordId: quotationId,
            oldData: { quotation_number: quotation.quotation_number, status: quotation.status },
            newData: { quotation_number: quotation.quotation_number, status: 'invoiced' }
        }, conn);

        await conn.commit();

        res.status(201).json({
            message: 'Invoice created from quotation',
            data: {
                id: invoiceId,
                invoice_number: invoiceNumber,
                quotation_number: quotation.quotation_number,
                grand_total: quotation.grand_total
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
 * PATCH /api/invoices/:id/payment
 */
exports.updatePayment = async (req, res) => {
    try {
        const { businessId } = req.user;
        const { id } = req.params;
        const { payment_status, amount_paid, payment_date } = req.body;

        const allowed = ['unpaid', 'partial', 'paid'];
        if (!allowed.includes(payment_status)) {
            return res.status(400).json({ error: 'Invalid payment status' });
        }

        if (
            (typeof amount_paid !== 'number' && typeof amount_paid !== 'string') ||
            amount_paid === ''
        ) {
            return res.status(400).json({ error: 'A valid payment amount is required' });
        }

        const amountPaid = Number(amount_paid);
        const amountPaidCents = Math.round(amountPaid * 100);
        if (
            !Number.isFinite(amountPaid) ||
            amountPaid < 0 ||
            Math.abs(amountPaid * 100 - amountPaidCents) > 0.000001
        ) {
            return res.status(400).json({
                error: 'Payment amount must be a non-negative amount with at most two decimal places'
            });
        }

        const conn = await db.getConnection();
        try {
            await conn.beginTransaction();
            const [invoices] = await conn.query(
                `SELECT invoice_number, grand_total, payment_status, amount_paid, payment_date
                 FROM invoices WHERE id = ? AND business_id = ? FOR UPDATE`,
                [id, businessId]
            );
            if (invoices.length === 0) {
                await conn.rollback();
                return res.status(404).json({ error: 'Invoice not found' });
            }

            const invoice = invoices[0];
            const totalCents = Math.round(Number(invoice.grand_total) * 100);
            if (amountPaidCents > totalCents) {
                await conn.rollback();
                return res.status(400).json({ error: 'Payment amount cannot exceed the invoice total' });
            }
            if (payment_status === 'unpaid' && amountPaidCents !== 0) {
                await conn.rollback();
                return res.status(400).json({ error: 'Unpaid invoices must have an amount paid of zero' });
            }
            if (payment_status === 'partial' && (amountPaidCents === 0 || amountPaidCents >= totalCents)) {
                await conn.rollback();
                return res.status(400).json({ error: 'Partial payments must be greater than zero and less than the invoice total' });
            }
            if (payment_status === 'paid' && amountPaidCents !== totalCents) {
                await conn.rollback();
                return res.status(400).json({ error: 'Paid invoices must have the full invoice amount recorded' });
            }

            await conn.query(
                `UPDATE invoices SET
                    payment_status = ?, amount_paid = ?, payment_date = ?
                 WHERE id = ? AND business_id = ?`,
                [payment_status, amountPaid, payment_date || null, id, businessId]
            );

            await auditService.log(req, {
                action: 'payment_update',
                tableName: 'invoices',
                recordId: id,
                oldData: {
                    invoice_number: invoice.invoice_number,
                    payment_status: invoice.payment_status,
                    amount_paid: invoice.amount_paid,
                    payment_date: invoice.payment_date
                },
                newData: {
                    invoice_number: invoice.invoice_number,
                    payment_status,
                    amount_paid: amountPaid,
                    payment_date: payment_date || null
                }
            }, conn);

            await conn.commit();
        } catch (error) {
            await conn.rollback();
            throw error;
        } finally {
            conn.release();
        }

        res.json({ message: 'Payment updated successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
};

/**
 * DELETE /api/invoices/:id
 */
exports.delete = async (req, res) => {
    const conn = await db.getConnection();
    try {
        await conn.beginTransaction();

        const { businessId } = req.user;
        const { id } = req.params;

        const [invoices] = await conn.query(
            `SELECT invoice_number, quotation_id, grand_total, payment_status, amount_paid
             FROM invoices WHERE id = ? AND business_id = ?`,
            [id, businessId]
        );

        if (invoices.length === 0) {
            await conn.rollback();
            return res.status(404).json({ error: 'Invoice not found' });
        }

        const quotationId = invoices[0].quotation_id;

        await conn.query(
            'DELETE FROM invoices WHERE id = ? AND business_id = ?',
            [id, businessId]
        );

        if (quotationId) {
            await conn.query(
                'UPDATE quotations SET status = ? WHERE id = ?',
                ['accepted', quotationId]
            );
        }

        await auditService.log(req, {
            action: 'delete',
            tableName: 'invoices',
            recordId: id,
            oldData: {
                invoice_number: invoices[0].invoice_number,
                quotation_id: quotationId,
                grand_total: invoices[0].grand_total,
                payment_status: invoices[0].payment_status,
                amount_paid: invoices[0].amount_paid
            }
        }, conn);
        if (quotationId) {
            await auditService.log(req, {
                action: 'status_change',
                tableName: 'quotations',
                recordId: quotationId,
                oldData: { status: 'invoiced' },
                newData: { status: 'accepted' }
            }, conn);
        }

        await conn.commit();
        res.json({ message: 'Invoice deleted, quotation status reverted' });

    } catch (error) {
        await conn.rollback();
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    } finally {
        conn.release();
    }
};
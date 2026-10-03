const db = require('../config/db');
const numberService = require('../services/numberService');
const auditService = require('../services/auditService');

/**
 * GET /api/customers
 */
exports.getAll = async (req, res) => {
    try {
        const { businessId } = req.user;
        const { search = '', page = 1, limit = 50 } = req.query;
        const offset = (parseInt(page) - 1) * parseInt(limit);

        let query = `
            SELECT * FROM customers 
            WHERE business_id = ? AND is_active = 1
        `;
        const params = [businessId];

        if (search) {
            query += ` AND (name LIKE ? OR nif_cif LIKE ? OR phone LIKE ? OR email LIKE ?)`;
            const s = `%${search}%`;
            params.push(s, s, s, s);
        }

        query += ` ORDER BY name ASC LIMIT ? OFFSET ?`;
        params.push(parseInt(limit), offset);

        const [customers] = await db.query(query, params);

        const [countResult] = await db.query(
            'SELECT COUNT(*) as total FROM customers WHERE business_id = ? AND is_active = 1',
            [businessId]
        );

        res.json({
            data: customers,
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
 * GET /api/customers/:id
 */
exports.getById = async (req, res) => {
    try {
        const { businessId } = req.user;
        const { id } = req.params;

        const [customers] = await db.query(
            'SELECT * FROM customers WHERE id = ? AND business_id = ?',
            [id, businessId]
        );

        if (customers.length === 0) {
            return res.status(404).json({ error: 'Customer not found' });
        }

        res.json({ data: customers[0] });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
};

/**
 * POST /api/customers
 */
exports.create = async (req, res) => {
    const conn = await db.getConnection();
    try {
        await conn.beginTransaction();
        const { businessId, userId } = req.user;
        const {
            name, nif_cif, address, city, postal_code,
            province, country, phone, mobile, email, notes
        } = req.body;

        if (!name) {
            return res.status(400).json({ error: 'Customer name is required' });
        }

        const customerCode = await numberService.getNextNumber(businessId, 'customer');

        const [result] = await conn.query(
            `INSERT INTO customers 
             (business_id, customer_code, name, nif_cif, address, city, postal_code,
              province, country, phone, mobile, email, notes, created_by)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                businessId, customerCode, name, nif_cif || null,
                address || null, city || null, postal_code || null,
                province || null, country || 'España',
                phone || null, mobile || null, email || null,
                notes || null, userId
            ]
        );

        const [newCustomer] = await conn.query(
            'SELECT * FROM customers WHERE id = ?',
            [result.insertId]
        );

        await auditService.log(req, {
            action: 'create',
            tableName: 'customers',
            recordId: result.insertId,
            newData: {
                customer_code: customerCode,
                name: newCustomer[0].name
            }
        }, conn);
        await conn.commit();

        res.status(201).json({
            message: 'Customer created successfully',
            data: newCustomer[0]
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
 * PUT /api/customers/:id
 */
exports.update = async (req, res) => {
    const conn = await db.getConnection();
    try {
        await conn.beginTransaction();
        const { businessId } = req.user;
        const { id } = req.params;
        const {
            name, nif_cif, address, city, postal_code,
            province, country, phone, mobile, email, notes
        } = req.body;

        const [existing] = await conn.query(
            'SELECT id, customer_code, name FROM customers WHERE id = ? AND business_id = ?',
            [id, businessId]
        );

        if (existing.length === 0) {
            await conn.rollback();
            return res.status(404).json({ error: 'Customer not found' });
        }

        await conn.query(
            `UPDATE customers SET
                name = ?, nif_cif = ?, address = ?, city = ?, postal_code = ?,
                province = ?, country = ?, phone = ?, mobile = ?, email = ?, notes = ?
             WHERE id = ? AND business_id = ?`,
            [
                name, nif_cif, address, city, postal_code,
                province, country || 'España', phone, mobile, email, notes,
                id, businessId
            ]
        );

        const [updated] = await conn.query(
            'SELECT * FROM customers WHERE id = ?',
            [id]
        );

        await auditService.log(req, {
            action: 'update',
            tableName: 'customers',
            recordId: id,
            oldData: { customer_code: existing[0].customer_code, name: existing[0].name },
            newData: {
                customer_code: existing[0].customer_code,
                name: updated[0].name,
                changed_fields: Object.keys(req.body).filter((field) =>
                    ['name', 'nif_cif', 'address', 'city', 'postal_code', 'province', 'country', 'phone', 'mobile', 'email', 'notes'].includes(field)
                )
            }
        }, conn);
        await conn.commit();

        res.json({
            message: 'Customer updated successfully',
            data: updated[0]
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
 * DELETE /api/customers/:id
 */
exports.delete = async (req, res) => {
    const conn = await db.getConnection();
    try {
        await conn.beginTransaction();
        const { businessId } = req.user;
        const { id } = req.params;

        const [customers] = await conn.query(
            'SELECT id, customer_code, name, is_active FROM customers WHERE id = ? AND business_id = ? FOR UPDATE',
            [id, businessId]
        );
        if (customers.length === 0) {
            await conn.rollback();
            return res.status(404).json({ error: 'Customer not found' });
        }

        const [quotations] = await conn.query(
            'SELECT COUNT(*) as count FROM quotations WHERE customer_id = ? AND business_id = ?',
            [id, businessId]
        );

        if (quotations[0].count > 0) {
            await conn.query(
                'UPDATE customers SET is_active = 0 WHERE id = ? AND business_id = ?',
                [id, businessId]
            );
            await auditService.log(req, {
                action: 'deactivate',
                tableName: 'customers',
                recordId: id,
                oldData: {
                    customer_code: customers[0].customer_code,
                    name: customers[0].name,
                    is_active: customers[0].is_active
                },
                newData: {
                    customer_code: customers[0].customer_code,
                    name: customers[0].name,
                    is_active: 0
                }
            }, conn);
            await conn.commit();
            return res.json({ 
                message: 'Customer deactivated (has linked quotations)'
            });
        }

        await conn.query(
            'DELETE FROM customers WHERE id = ? AND business_id = ?',
            [id, businessId]
        );

        await auditService.log(req, {
            action: 'delete',
            tableName: 'customers',
            recordId: id,
            oldData: {
                customer_code: customers[0].customer_code,
                name: customers[0].name
            }
        }, conn);
        await conn.commit();

        res.json({ message: 'Customer deleted successfully' });
    } catch (error) {
        await conn.rollback();
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    } finally {
        conn.release();
    }
};

/**
 * GET /api/customers/:id/history
 * Get customer's quotations + invoices + summary
 */
exports.getHistory = async (req, res) => {
    try {
        const { businessId } = req.user;
        const { id } = req.params;

        // Verify customer belongs to this business
        const [customers] = await db.query(
            'SELECT id FROM customers WHERE id = ? AND business_id = ?',
            [id, businessId]
        );
        if (customers.length === 0) {
            return res.status(404).json({ error: 'Customer not found' });
        }

        // Get quotations
        const [quotations] = await db.query(
            `SELECT id, quotation_number, quotation_date, valid_until, 
                    grand_total, status
             FROM quotations
             WHERE customer_id = ? AND business_id = ?
             ORDER BY created_at DESC
             LIMIT 50`,
            [id, businessId]
        );

        // Get invoices
        const [invoices] = await db.query(
            `SELECT id, invoice_number, invoice_date, due_date,
                    grand_total, payment_status, amount_paid
             FROM invoices
             WHERE customer_id = ? AND business_id = ?
             ORDER BY created_at DESC
             LIMIT 50`,
            [id, businessId]
        );

        // Calculate totals
        const totalQuoted = quotations.reduce(
            (sum, q) => sum + parseFloat(q.grand_total || 0),
            0
        );
        const totalInvoiced = invoices.reduce(
            (sum, i) => sum + parseFloat(i.grand_total || 0),
            0
        );
        const totalPaid = invoices.reduce(
            (sum, i) => sum + parseFloat(i.amount_paid || 0),
            0
        );
        const totalPending = totalInvoiced - totalPaid;

        res.json({
            data: {
                quotations,
                invoices,
                summary: {
                    quotations_count: quotations.length,
                    invoices_count: invoices.length,
                    total_quoted: totalQuoted,
                    total_invoiced: totalInvoiced,
                    total_paid: totalPaid,
                    total_pending: totalPending,
                }
            }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
};
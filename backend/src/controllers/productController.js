const db = require('../config/db');
const calculations = require('../services/calculationService');
const audit = require('../services/auditService');

exports.getAll = async (req, res) => {
    const { page = '1', limit = '50', search = '' } = req.query;
    if (!/^[1-9]\d*$/.test(String(page)) || !/^[1-9]\d*$/.test(String(limit)) ||
        !Number.isSafeInteger(Number(page)) || Number(limit) > 100 ||
        typeof search !== 'string' || search.length > 200 ||
        !Number.isSafeInteger((Number(page) - 1) * Number(limit))) {
        return res.status(400).json({ error: 'Invalid product search or pagination' });
    }
    try {
        const terms = search.trim().split(/\s+/).filter(Boolean);
        const where = ['business_id = ?', ...terms.map(() =>
            "(description LIKE ? ESCAPE '!' OR article_code LIKE ? ESCAPE '!')"
        )].join(' AND ');
        const params = [req.user.businessId, ...terms.flatMap((term) => {
            const match = `%${term.replace(/[!%_]/g, '!$&')}%`;
            return [match, match];
        })];
        const [rows] = await db.query(
            `SELECT * FROM products WHERE ${where} ORDER BY description, id LIMIT ? OFFSET ?`,
            [...params, Number(limit), (Number(page) - 1) * Number(limit)]
        );
        const [[count]] = await db.query(`SELECT COUNT(*) AS total FROM products WHERE ${where}`, params);
        res.json({ data: rows, pagination: { page: Number(page), limit: Number(limit), total: Number(count.total) } });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to load products' });
    }
};

async function writeProduct(req, res, action) {
    if (action !== 'create' && !/^[1-9]\d*$/.test(req.params.id)) {
        return res.status(400).json({ error: 'Invalid product ID' });
    }
    const { article_code, description, unit_type = 'unit', unit_price, iva_percent = 21 } = req.body;
    if (action !== 'delete') {
        const error = calculations.validateQuotation([{
            article_code, description, unit_type, unit_price, iva_percent, quantity: 1
        }]);
        if (error) return res.status(400).json({ error });
    }
    let conn;
    try {
        conn = await db.getConnection();
        await conn.beginTransaction();
        let oldData = null;
        let id = req.params.id;
        if (action !== 'create') {
            const [rows] = await conn.query(
                'SELECT * FROM products WHERE id = ? AND business_id = ? FOR UPDATE',
                [id, req.user.businessId]
            );
            if (!rows.length) {
                await conn.rollback();
                return res.status(404).json({ error: 'Product not found' });
            }
            oldData = rows[0];
        }
        const product = action === 'delete' ? null : {
            article_code: article_code?.trim() || null,
            description: description.trim(),
            unit_type: unit_type || 'unit',
            unit_price: Number(unit_price),
            iva_percent: Number(iva_percent)
        };
        if (action === 'create') {
            const [result] = await conn.query(
                'INSERT INTO products (business_id, article_code, description, unit_type, unit_price, iva_percent) VALUES (?, ?, ?, ?, ?, ?)',
                [req.user.businessId, ...Object.values(product)]
            );
            id = result.insertId;
        } else if (action === 'update') {
            await conn.query(
                'UPDATE products SET article_code = ?, description = ?, unit_type = ?, unit_price = ?, iva_percent = ? WHERE id = ? AND business_id = ?',
                [...Object.values(product), id, req.user.businessId]
            );
        } else {
            await conn.query('DELETE FROM products WHERE id = ? AND business_id = ?', [id, req.user.businessId]);
        }
        await audit.log(req, { action, tableName: 'products', recordId: id, oldData, newData: product }, conn);
        await conn.commit();
        res.status(action === 'create' ? 201 : 200).json({
            message: `Product ${action === 'delete' ? 'deleted' : 'saved'} successfully`,
            data: product ? { id, ...product } : null
        });
    } catch (error) {
        if (conn) await conn.rollback();
        console.error(error);
        res.status(500).json({ error: 'Failed to save product' });
    } finally {
        if (conn) conn.release();
    }
}

exports.create = (req, res) => writeProduct(req, res, 'create');
exports.update = (req, res) => writeProduct(req, res, 'update');
exports.delete = (req, res) => writeProduct(req, res, 'delete');

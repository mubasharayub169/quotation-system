const db = require('../config/db');
const fs = require('fs').promises;
const path = require('path');

/**
 * GET /api/products
 * List all products for current business
 */
exports.getAll = async (req, res) => {
    try {
        const { businessId } = req.user;
        const { search = '', page = 1, limit = 50 } = req.query;
        const offset = (parseInt(page) - 1) * parseInt(limit);

        let query = `
            SELECT id, business_id, article_code, description, unit_type,
                   unit_price, iva_percent, image_path, created_at, updated_at
            FROM products
            WHERE business_id = ?
        `;
        const params = [businessId];

        if (search) {
            query += ` AND (article_code LIKE ? OR description LIKE ?)`;
            const s = `%${search}%`;
            params.push(s, s);
        }

        query += ` ORDER BY description ASC LIMIT ? OFFSET ?`;
        params.push(parseInt(limit), offset);

        const [products] = await db.query(query, params);

        const [countResult] = await db.query(
            'SELECT COUNT(*) as total FROM products WHERE business_id = ?',
            [businessId]
        );

        res.json({
            data: products,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: countResult[0].total,
            },
        });
    } catch (error) {
        console.error('❌ Get products error:', error);
        res.status(500).json({ error: 'Server error' });
    }
};

/**
 * GET /api/products/:id
 */
exports.getById = async (req, res) => {
    try {
        const { businessId } = req.user;
        const { id } = req.params;

        const [products] = await db.query(
            'SELECT * FROM products WHERE id = ? AND business_id = ?',
            [id, businessId]
        );

        if (products.length === 0) {
            return res.status(404).json({ error: 'Product not found' });
        }

        res.json({ data: products[0] });
    } catch (error) {
        console.error('❌ Get product error:', error);
        res.status(500).json({ error: 'Server error' });
    }
};

/**
 * POST /api/products
 * Create new product
 */
exports.create = async (req, res) => {
    try {
        const { businessId } = req.user;
        const {
            article_code, description, unit_type = 'unit',
            unit_price = 0, iva_percent = 21,
        } = req.body;

        // Validation
        if (!description || description.trim() === '') {
            return res.status(400).json({ error: 'Description is required' });
        }

        const price = parseFloat(unit_price);
        if (isNaN(price) || price < 0) {
            return res.status(400).json({ error: 'Unit price must be a valid number' });
        }

        const iva = parseFloat(iva_percent);
        if (![21, 10, 4].includes(iva)) {
            return res.status(400).json({ error: 'IVA must be 21, 10, or 4' });
        }

        const [result] = await db.query(
            `INSERT INTO products 
             (business_id, article_code, description, unit_type, unit_price, iva_percent)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [
                businessId,
                article_code || null,
                description.trim(),
                unit_type,
                price,
                iva,
            ]
        );

        const [newProduct] = await db.query(
            'SELECT * FROM products WHERE id = ?',
            [result.insertId]
        );

        res.status(201).json({
            message: 'Product created successfully',
            data: newProduct[0],
        });
    } catch (error) {
        console.error('❌ Create product error:', error);
        res.status(500).json({ error: 'Server error' });
    }
};

/**
 * PUT /api/products/:id
 * Update product
 */
exports.update = async (req, res) => {
    try {
        const { businessId } = req.user;
        const { id } = req.params;
        const {
            article_code, description, unit_type,
            unit_price, iva_percent,
        } = req.body;

        // Verify product belongs to business
        const [existing] = await db.query(
            'SELECT id FROM products WHERE id = ? AND business_id = ?',
            [id, businessId]
        );
        if (existing.length === 0) {
            return res.status(404).json({ error: 'Product not found' });
        }

        // Validation
        if (!description || description.trim() === '') {
            return res.status(400).json({ error: 'Description is required' });
        }

        const price = parseFloat(unit_price);
        if (isNaN(price) || price < 0) {
            return res.status(400).json({ error: 'Unit price must be a valid number' });
        }

        const iva = parseFloat(iva_percent);
        if (![21, 10, 4].includes(iva)) {
            return res.status(400).json({ error: 'IVA must be 21, 10, or 4' });
        }

        await db.query(
            `UPDATE products SET
                article_code = ?,
                description = ?,
                unit_type = ?,
                unit_price = ?,
                iva_percent = ?
             WHERE id = ? AND business_id = ?`,
            [
                article_code || null,
                description.trim(),
                unit_type,
                price,
                iva,
                id,
                businessId,
            ]
        );

        const [updated] = await db.query(
            'SELECT * FROM products WHERE id = ?',
            [id]
        );

        res.json({
            message: 'Product updated successfully',
            data: updated[0],
        });
    } catch (error) {
        console.error('❌ Update product error:', error);
        res.status(500).json({ error: 'Server error' });
    }
};

/**
 * DELETE /api/products/:id
 */
exports.delete = async (req, res) => {
    try {
        const { businessId } = req.user;
        const { id } = req.params;

        const [existing] = await db.query(
            'SELECT id, image_path FROM products WHERE id = ? AND business_id = ?',
            [id, businessId]
        );
        if (existing.length === 0) {
            return res.status(404).json({ error: 'Product not found' });
        }

        // Delete image file if exists
        if (existing[0].image_path) {
            try {
                const fullPath = path.join(__dirname, '../../', existing[0].image_path);
                await fs.unlink(fullPath);
            } catch (e) {
                console.warn('Image delete failed:', e.message);
            }
        }

        await db.query(
            'DELETE FROM products WHERE id = ? AND business_id = ?',
            [id, businessId]
        );

        res.json({ message: 'Product deleted successfully' });
    } catch (error) {
        console.error('❌ Delete product error:', error);
        res.status(500).json({ error: 'Server error' });
    }
};

/**
 * POST /api/products/:id/image
 * Upload product image
 */
exports.uploadImage = async (req, res) => {
    try {
        const { businessId } = req.user;
        const { id } = req.params;

        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        // Verify product belongs to this business
        const [products] = await db.query(
            'SELECT id, image_path FROM products WHERE id = ? AND business_id = ?',
            [id, businessId]
        );
        if (products.length === 0) {
            // Delete uploaded file
            await fs.unlink(req.file.path).catch(() => {});
            return res.status(404).json({ error: 'Product not found' });
        }

        const oldImagePath = products[0].image_path;
        const imagePath = `uploads/products/${req.file.filename}`;

        // Update database
        await db.query(
            'UPDATE products SET image_path = ? WHERE id = ?',
            [imagePath, id]
        );

        // Delete old image if exists and different
        if (oldImagePath && oldImagePath !== imagePath) {
            try {
                const oldFullPath = path.join(__dirname, '../../', oldImagePath);
                await fs.unlink(oldFullPath);
            } catch (e) {
                console.warn('Old image delete failed:', e.message);
            }
        }

        res.json({
            message: 'Product image uploaded successfully',
            data: { image_path: imagePath },
        });
    } catch (error) {
        console.error('❌ Product image upload error:', error);
        res.status(500).json({ error: 'Server error' });
    }
};

/**
 * DELETE /api/products/:id/image
 * Remove product image
 */
exports.removeImage = async (req, res) => {
    try {
        const { businessId } = req.user;
        const { id } = req.params;

        const [products] = await db.query(
            'SELECT image_path FROM products WHERE id = ? AND business_id = ?',
            [id, businessId]
        );

        if (products.length === 0) {
            return res.status(404).json({ error: 'Product not found' });
        }

        const imagePath = products[0].image_path;
        if (!imagePath) {
            return res.status(404).json({ error: 'No image to remove' });
        }

        // Delete file
        try {
            const fullPath = path.join(__dirname, '../../', imagePath);
            await fs.unlink(fullPath);
        } catch (e) {
            console.warn('File delete failed:', e.message);
        }

        // Update database
        await db.query(
            'UPDATE products SET image_path = NULL WHERE id = ?',
            [id]
        );

        res.json({ message: 'Product image removed' });
    } catch (error) {
        console.error('❌ Remove product image error:', error);
        res.status(500).json({ error: 'Server error' });
    }
};
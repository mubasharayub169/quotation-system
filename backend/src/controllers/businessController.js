const db = require('../config/db');
const bcrypt = require('bcryptjs');
const auditService = require('../services/auditService');

function getAuditSummary(entry) {
    const rawData = entry.new_data || entry.old_data;
    const data = rawData ? JSON.parse(rawData) : {};

    const summary = {};
    for (const key of [
        'invoice_number',
        'quotation_number',
        'customer_code',
        'article_code',
        'business_name',
        'name',
        'status',
        'payment_status',
        'grand_total',
        'amount_paid',
        'is_active',
        'password_reset',
        'password_changed',
        'owner_password_reset'
    ]) {
        if (data[key] !== undefined) summary[key] = data[key];
    }
    if (Array.isArray(data.changed_fields)) {
        summary.changed_fields = data.changed_fields;
    }
    return summary;
}

exports.getAuditLog = async (req, res) => {
    try {
        const { businessId } = req.user;
        const page = Math.max(1, parseInt(req.query.page, 10) || 1);
        const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 50));
        const offset = (page - 1) * limit;
        const businessFilter = '(a.business_id = ? OR (a.business_id IS NULL AND actor.business_id = ?))';

        const [rows] = await db.query(
            `SELECT a.id, a.action, a.table_name, a.record_id, a.old_data, a.new_data,
                    a.ip_address, a.created_at, actor.full_name AS actor_name
             FROM audit_log a
             LEFT JOIN users actor ON actor.id = a.user_id
             WHERE ${businessFilter}
             ORDER BY a.created_at DESC, a.id DESC
             LIMIT ? OFFSET ?`,
            [businessId, businessId, limit, offset]
        );
        const entries = rows.map(({ old_data, new_data, ...entry }) => ({
            ...entry,
            summary: getAuditSummary({ old_data, new_data })
        }));
        const [count] = await db.query(
            `SELECT COUNT(*) AS total
             FROM audit_log a
             LEFT JOIN users actor ON actor.id = a.user_id
             WHERE ${businessFilter}`,
            [businessId, businessId]
        );

        res.json({
            data: entries,
            pagination: { page, limit, total: count[0].total }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to load activity log' });
    }
};

/**
 * GET /api/business/me
 * Owner/Staff apni business info dekhe (read-only)
 */
exports.getMe = async (req, res) => {
    try {
        const { businessId } = req.user;

        const [businesses] = await db.query(
            'SELECT * FROM businesses WHERE id = ?',
            [businessId]
        );

        if (businesses.length === 0) {
            return res.status(404).json({ error: 'Business not found' });
        }

        res.json({ data: businesses[0] });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
};

/**
 * PUT /api/business/settings
 * Owner apni business ki OPERATIONAL settings update kare
 */
exports.updateSettings = async (req, res) => {
    try {
        const { businessId } = req.user;

        const allowed = [
            'default_iva_percent',
            'default_payment_method',
            'default_observations',
            'bank1_name', 'bank1_iban',
            'bank2_name', 'bank2_iban',
            'phone',
            'email'
        ];

        const updates = [];
        const values = [];
        const changedFields = [];

        for (const [key, value] of Object.entries(req.body)) {
            if (allowed.includes(key)) {
                updates.push(`${key} = ?`);
                values.push(value);
                changedFields.push(key);
            }
        }

        if (updates.length === 0) {
            return res.status(400).json({
                error: 'No valid settings to update',
                allowed_fields: allowed
            });
        }

        values.push(businessId);
        await db.query(
            `UPDATE businesses SET ${updates.join(', ')} WHERE id = ?`,
            values
        );
        await auditService.log(req, {
            action: 'settings_update',
            tableName: 'businesses',
            recordId: businessId,
            newData: { changed_fields: changedFields }
        });

        const [updated] = await db.query(
            'SELECT * FROM businesses WHERE id = ?',
            [businessId]
        );

        res.json({
            message: 'Settings updated successfully',
            data: updated[0]
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
};

// ============================================
// STAFF MANAGEMENT
// ============================================

/**
 * GET /api/business/users
 * List all users of this business (Owner only)
 */
exports.getUsers = async (req, res) => {
    try {
        const { businessId } = req.user;

        const [users] = await db.query(
            `SELECT id, full_name, email, role, is_active, last_login, created_at
             FROM users 
             WHERE business_id = ?
             ORDER BY 
                FIELD(role, 'owner', 'staff'),
                full_name`,
            [businessId]
        );

        res.json({ data: users });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
};

/**
 * POST /api/business/users
 * Add a new staff user (Owner only)
 */
exports.addUser = async (req, res) => {
    try {
        const { businessId } = req.user;
        const { full_name, email, password, role = 'staff' } = req.body;

        // Validation
        if (!full_name || !email || !password) {
            return res.status(400).json({ error: 'Name, email, and password required' });
        }
        if (password.length < 6) {
            return res.status(400).json({ error: 'Password must be 6+ characters' });
        }
        if (!email.includes('@')) {
            return res.status(400).json({ error: 'Invalid email format' });
        }

        // Only allow 'staff' role (Owner cannot create another owner)
        if (role !== 'staff') {
            return res.status(400).json({ error: 'Can only create staff users' });
        }

        // Check email uniqueness
        const [existing] = await db.query(
            'SELECT id FROM users WHERE email = ?',
            [email.toLowerCase().trim()]
        );
        if (existing.length > 0) {
            return res.status(409).json({ error: 'Email already registered' });
        }

        // Hash password
        const hash = await bcrypt.hash(password, 10);

        // Insert
        const [result] = await db.query(
            `INSERT INTO users 
             (business_id, full_name, email, password_hash, role, is_active)
             VALUES (?, ?, ?, ?, 'staff', 1)`,
            [businessId, full_name.trim(), email.toLowerCase().trim(), hash]
        );
        await auditService.log(req, {
            action: 'create',
            tableName: 'users',
            recordId: result.insertId,
            newData: {
                full_name: full_name.trim(),
                email: email.toLowerCase().trim(),
                role: 'staff',
                is_active: 1
            }
        });

        res.status(201).json({
            message: 'Staff user created successfully',
            data: { id: result.insertId, full_name, email, role: 'staff' }
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
};

/**
 * PATCH /api/business/users/:id/toggle
 * Activate/deactivate a staff user (Owner only)
 */
exports.toggleUser = async (req, res) => {
    try {
        const { businessId, userId: currentUserId } = req.user;
        const { id } = req.params;
        const { is_active } = req.body;

        // Get user
        const [users] = await db.query(
            'SELECT id, role, full_name, email, is_active FROM users WHERE id = ? AND business_id = ?',
            [id, businessId]
        );

        if (users.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        const targetUser = users[0];

        // Cannot deactivate yourself
        if (targetUser.id === currentUserId) {
            return res.status(400).json({ error: 'You cannot deactivate your own account' });
        }

        // Cannot deactivate owner
        if (targetUser.role === 'owner') {
            return res.status(400).json({ error: 'Cannot deactivate the owner account' });
        }

        // Update
        await db.query(
            'UPDATE users SET is_active = ? WHERE id = ?',
            [is_active ? 1 : 0, id]
        );
        await auditService.log(req, {
            action: is_active ? 'activate' : 'deactivate',
            tableName: 'users',
            recordId: id,
            oldData: {
                full_name: targetUser.full_name,
                email: targetUser.email,
                role: targetUser.role,
                is_active: targetUser.is_active
            },
            newData: {
                full_name: targetUser.full_name,
                email: targetUser.email,
                role: targetUser.role,
                is_active: is_active ? 1 : 0
            }
        });

        res.json({
            message: `User ${is_active ? 'activated' : 'deactivated'} successfully`
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
};

/**
 * POST /api/business/users/:id/reset-password
 * Reset a staff user's password (Owner only)
 */
exports.resetUserPassword = async (req, res) => {
    try {
        const { businessId } = req.user;
        const { id } = req.params;
        const { new_password } = req.body;

        if (!new_password || new_password.length < 6) {
            return res.status(400).json({ error: 'Password must be 6+ characters' });
        }

        // Verify user belongs to this business
        const [users] = await db.query(
            'SELECT id, role FROM users WHERE id = ? AND business_id = ?',
            [id, businessId]
        );

        if (users.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Cannot reset owner password from here (only staff)
        if (users[0].role === 'owner') {
            return res.status(400).json({
                error: 'Cannot reset owner password from here. Use change password instead.'
            });
        }

        // Hash and update
        const hash = await bcrypt.hash(new_password, 10);
        await db.query(
            'UPDATE users SET password_hash = ? WHERE id = ?',
            [hash, id]
        );
        await auditService.log(req, {
            action: 'password_reset',
            tableName: 'users',
            recordId: id,
            newData: { password_reset: true }
        });

        res.json({ message: 'Password reset successfully' });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
};
const db = require('../config/db');
const bcrypt = require('bcryptjs');
const fs = require('fs').promises;
const path = require('path');
const auditService = require('../services/auditService');

/**
 * GET /api/admin/dashboard
 * Privacy-focused: No business-specific data (quotations, revenue)
 */
exports.getDashboard = async (req, res) => {
    try {
        const [stats] = await db.query(`
            SELECT 
                (SELECT COUNT(*) FROM businesses WHERE is_active = 1) AS total_businesses,
                (SELECT COUNT(*) FROM businesses WHERE is_active = 0) AS inactive_businesses,
                (SELECT COUNT(*) FROM users WHERE is_active = 1) AS total_users,
                (SELECT COUNT(*) FROM users WHERE role = 'owner' AND is_active = 1) AS total_owners,
                (SELECT COUNT(*) FROM users WHERE role = 'staff' AND is_active = 1) AS total_staff,
                
                (SELECT COUNT(*) FROM businesses 
                 WHERE is_active = 1 
                 AND subscription_status = 'active' 
                 AND subscription_expiry >= CURDATE()) AS active_subscriptions,
                
                (SELECT COUNT(*) FROM businesses 
                 WHERE is_active = 1 
                 AND subscription_status = 'trial' 
                 AND subscription_expiry >= CURDATE()) AS trial_subscriptions,
                
                (SELECT COUNT(*) FROM businesses 
                 WHERE is_active = 1 
                 AND subscription_expiry < CURDATE()) AS expired_subscriptions,
                
                (SELECT COUNT(*) FROM businesses 
                 WHERE is_active = 1 
                 AND subscription_status != 'inactive'
                 AND subscription_expiry >= CURDATE()
                 AND subscription_expiry <= DATE_ADD(CURDATE(), INTERVAL 7 DAY)) AS expiring_soon
        `);

        const [recentBusinesses] = await db.query(`
            SELECT 
                b.id,
                b.business_name,
                b.subscription_status,
                b.subscription_expiry,
                b.is_active,
                b.created_at,
                (SELECT email FROM users WHERE business_id = b.id AND role = 'owner' LIMIT 1) AS owner_email,
                DATEDIFF(b.subscription_expiry, CURDATE()) AS days_left
            FROM businesses b
            ORDER BY b.created_at DESC
            LIMIT 5
        `);

        res.json({ 
            data: stats[0],
            recent_businesses: recentBusinesses
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
};

/**
 * GET /api/admin/businesses
 */
exports.getAllBusinesses = async (req, res) => {
    try {
        const [businesses] = await db.query(`
            SELECT b.*,
                   (SELECT COUNT(*) FROM users WHERE business_id = b.id AND is_active = 1) AS user_count,
                   (SELECT full_name FROM users WHERE business_id = b.id AND role = 'owner' LIMIT 1) AS owner_name,
                   (SELECT email FROM users WHERE business_id = b.id AND role = 'owner' LIMIT 1) AS owner_email
            FROM businesses b
            ORDER BY b.created_at DESC
        `);

        res.json({ data: businesses });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
};

/**
 * GET /api/admin/businesses/:id
 */
exports.getBusinessById = async (req, res) => {
    try {
        const { id } = req.params;

        const [businesses] = await db.query(
            'SELECT * FROM businesses WHERE id = ?',
            [id]
        );

        if (businesses.length === 0) {
            return res.status(404).json({ error: 'Business not found' });
        }

        const [users] = await db.query(
            `SELECT id, full_name, email, role, is_active, last_login 
             FROM users WHERE business_id = ? ORDER BY role, full_name`,
            [id]
        );

        res.json({
            data: {
                ...businesses[0],
                users
            }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
};

/**
 * POST /api/admin/businesses
 */
exports.createBusiness = async (req, res) => {
    const conn = await db.getConnection();
    try {
        await conn.beginTransaction();

        const {
            business_name, legal_name, nif_cif,
            address, city, postal_code, province, country,
            phone, email, primary_color,
            bank1_name, bank1_iban, bank2_name, bank2_iban,
            default_iva_percent, default_payment_method,
            default_observations,
            subscription_status, subscription_expiry,
            owner_name, owner_email, owner_password
        } = req.body;
        if (!business_name) {
            await conn.rollback();
            return res.status(400).json({ error: 'Business name required' });
        }
        if (!owner_email || !owner_password) {
            await conn.rollback();
            return res.status(400).json({ error: 'Owner email and password required' });
        }
        if (owner_password.length < 6) {
            await conn.rollback();
            return res.status(400).json({ error: 'Password must be at least 6 characters' });
        }

        const [existing] = await conn.query(
            'SELECT id FROM users WHERE email = ?',
            [owner_email]
        );
        if (existing.length > 0) {
            await conn.rollback();
            return res.status(409).json({ error: 'Email already registered' });
        }

        const [bizResult] = await conn.query(
            `INSERT INTO businesses 
             (business_name, legal_name, nif_cif,
              address, city, postal_code, province, country,
              phone, email, primary_color,
              bank1_name, bank1_iban, bank2_name, bank2_iban,
              default_iva_percent, default_payment_method,
              default_observations,
              subscription_status, subscription_expiry,
              is_active)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
            [
                business_name, legal_name || null, nif_cif || null,
                address || null, city || null, postal_code || null,
                province || null, country || 'España',
                phone || null, email || null, primary_color || '#1e40af',
                bank1_name || null, bank1_iban || null,
                bank2_name || null, bank2_iban || null,
                default_iva_percent || 21.00,
                default_payment_method || 'CONTADO',
                default_observations || null,
                subscription_status || 'trial',
                subscription_expiry || null
            ]
        );

        const businessId = bizResult.insertId;

        const passwordHash = await bcrypt.hash(owner_password, 10);
        const [ownerResult] = await conn.query(
            `INSERT INTO users 
             (business_id, full_name, email, password_hash, role, is_active)
             VALUES (?, ?, ?, ?, 'owner', 1)`,
            [businessId, owner_name || business_name, owner_email, passwordHash]
        );

        const year = new Date().getFullYear();
        for (const type of ['quotation', 'invoice', 'customer']) {
            await conn.query(
                'INSERT INTO number_sequences (business_id, sequence_type, year, last_number) VALUES (?, ?, ?, 0)',
                [businessId, type, year]
            );
        }

        await auditService.log(req, {
            action: 'create',
            tableName: 'businesses',
            recordId: businessId,
            newData: {
                business_name,
                owner_email,
                subscription_status: subscription_status || 'trial'
            },
            businessId
        }, conn);
        await auditService.log(req, {
            action: 'create',
            tableName: 'users',
            recordId: ownerResult.insertId,
            newData: {
                full_name: owner_name || business_name,
                email: owner_email,
                role: 'owner'
            },
            businessId
        }, conn);

        await conn.commit();

        res.status(201).json({
            message: 'Business created successfully',
            data: { id: businessId, business_name, owner_email }
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
 * PUT /api/admin/businesses/:id
 */
exports.updateBusiness = async (req, res) => {
    try {
        const { id } = req.params;
        const fields = req.body;

        const allowed = [
            'business_name', 'legal_name', 'nif_cif',
            'address', 'city', 'postal_code', 'province', 'country',
            'phone', 'email', 'primary_color',
            'bank1_name', 'bank1_iban', 'bank2_name', 'bank2_iban',
            'default_iva_percent', 'default_payment_method',
            'default_observations',
            'subscription_status', 'subscription_expiry',
            'is_active'
        ];

        const updates = [];
        const values = [];

        for (const [key, value] of Object.entries(fields)) {
            if (allowed.includes(key)) {
                updates.push(`${key} = ?`);
                values.push(value);
            }
        }

        if (updates.length === 0) {
            return res.status(400).json({
                error: 'No valid fields to update',
                allowed_fields: allowed
            });
        }

        const [businesses] = await db.query(
            `SELECT business_name, subscription_status, subscription_expiry, is_active
             FROM businesses WHERE id = ?`,
            [id]
        );
        if (businesses.length === 0) {
            return res.status(404).json({ error: 'Business not found' });
        }

        values.push(id);
        await db.query(
            `UPDATE businesses SET ${updates.join(', ')} WHERE id = ?`,
            values
        );
        await auditService.log(req, {
            action: 'update',
            tableName: 'businesses',
            recordId: id,
            oldData: businesses[0],
            newData: {
                changed_fields: Object.keys(fields).filter((field) => allowed.includes(field))
            },
            businessId: id
        });

        const [updated] = await db.query(
            'SELECT * FROM businesses WHERE id = ?',
            [id]
        );

        res.json({ message: 'Business updated successfully', data: updated[0] });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
};

/**
 * PATCH /api/admin/businesses/:id/toggle-active
 */
exports.toggleBusinessActive = async (req, res) => {
    try {
        const { id } = req.params;
        const { is_active } = req.body;

        const [businesses] = await db.query(
            'SELECT id, business_name, is_active FROM businesses WHERE id = ?',
            [id]
        );
        if (businesses.length === 0) {
            return res.status(404).json({ error: 'Business not found' });
        }

        if (parseInt(id) === 1 && !is_active) {
            return res.status(400).json({ error: 'Cannot deactivate primary business' });
        }

        await db.query(
            'UPDATE businesses SET is_active = ? WHERE id = ?',
            [is_active ? 1 : 0, id]
        );

        if (!is_active) {
            await db.query(
                "UPDATE businesses SET subscription_status = 'inactive' WHERE id = ?",
                [id]
            );
        }
        await auditService.log(req, {
            action: is_active ? 'activate' : 'deactivate',
            tableName: 'businesses',
            recordId: id,
            oldData: {
                business_name: businesses[0].business_name,
                is_active: businesses[0].is_active
            },
            newData: {
                business_name: businesses[0].business_name,
                is_active: is_active ? 1 : 0
            },
            businessId: id
        });

        res.json({
            message: `Business ${is_active ? 'activated' : 'deactivated'} successfully`,
            data: {
                id: parseInt(id),
                is_active: is_active ? 1 : 0,
            }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
};

/**
 * POST /api/admin/businesses/:id/logo
 */
exports.uploadLogo = async (req, res) => {
    try {
        const { id } = req.params;

        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const [businesses] = await db.query(
            'SELECT logo_path FROM businesses WHERE id = ?',
            [id]
        );
        if (businesses.length === 0) {
            await fs.unlink(req.file.path).catch(() => {});
            return res.status(404).json({ error: 'Business not found' });
        }

        const oldLogoPath = businesses[0].logo_path;
        const logoPath = `uploads/logos/${req.file.filename}`;

        await db.query(
            'UPDATE businesses SET logo_path = ? WHERE id = ?',
            [logoPath, id]
        );
        await auditService.log(req, {
            action: 'logo_update',
            tableName: 'businesses',
            recordId: id,
            newData: { logo_updated: true },
            businessId: id
        });

        if (oldLogoPath && oldLogoPath !== logoPath) {
            try {
                await fs.unlink(path.join(__dirname, '../../', oldLogoPath));
            } catch (e) {
                console.log('Old logo delete failed:', e.message);
            }
        }

        res.json({
            message: 'Logo uploaded successfully',
            data: { logo_path: logoPath }
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
};

/**
 * DELETE /api/admin/businesses/:id/logo
 */
exports.removeLogo = async (req, res) => {
    try {
        const { id } = req.params;

        const [businesses] = await db.query(
            'SELECT logo_path FROM businesses WHERE id = ?',
            [id]
        );

        const logoPath = businesses[0]?.logo_path;
        if (!logoPath) {
            return res.status(404).json({ error: 'No logo to remove' });
        }

        try {
            await fs.unlink(path.join(__dirname, '../../', logoPath));
        } catch (e) {
            console.log('File delete failed:', e.message);
        }

        await db.query(
            'UPDATE businesses SET logo_path = NULL WHERE id = ?',
            [id]
        );
        await auditService.log(req, {
            action: 'logo_remove',
            tableName: 'businesses',
            recordId: id,
            oldData: { logo_present: true },
            newData: { logo_present: false },
            businessId: id
        });

        res.json({ message: 'Logo removed successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
};

/**
 * POST /api/admin/businesses/:id/reset-owner-password
 */
exports.resetOwnerPassword = async (req, res) => {
    try {
        const { id } = req.params;
        const { new_password } = req.body;

        if (!new_password || new_password.length < 6) {
            return res.status(400).json({ error: 'Password must be 6+ characters' });
        }

        const [owners] = await db.query(
            "SELECT id FROM users WHERE business_id = ? AND role = 'owner'",
            [id]
        );
        if (owners.length === 0) {
            return res.status(404).json({ error: 'Owner not found' });
        }

        const hash = await bcrypt.hash(new_password, 10);

        await db.query(
            `UPDATE users SET password_hash = ? 
             WHERE business_id = ? AND role = 'owner'`,
            [hash, id]
        );

        await auditService.log(req, {
            action: 'password_reset',
            tableName: 'users',
            recordId: owners[0].id,
            newData: { owner_password_reset: true },
            businessId: id
        });

        res.json({ message: 'Owner password reset successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
};

/**
 * POST /api/admin/businesses/:id/users
 */
exports.addStaffUser = async (req, res) => {
    try {
        const { id } = req.params;
        const { full_name, email, password, role } = req.body;

        if (!full_name || !email || !password) {
            return res.status(400).json({ error: 'Name, email, password required' });
        }
        if (password.length < 6) {
            return res.status(400).json({ error: 'Password must be 6+ characters' });
        }

        const [businesses] = await db.query(
            'SELECT id FROM businesses WHERE id = ?',
            [id]
        );
        if (businesses.length === 0) {
            return res.status(404).json({ error: 'Business not found' });
        }

        const [existing] = await db.query(
            'SELECT id FROM users WHERE email = ?',
            [email]
        );
        if (existing.length > 0) {
            return res.status(409).json({ error: 'Email already registered' });
        }

        const hash = await bcrypt.hash(password, 10);
        const userRole = role === 'owner' ? 'owner' : 'staff';

        const [result] = await db.query(
            `INSERT INTO users 
             (business_id, full_name, email, password_hash, role, is_active)
             VALUES (?, ?, ?, ?, ?, 1)`,
            [id, full_name, email, hash, userRole]
        );
        await auditService.log(req, {
            action: 'create',
            tableName: 'users',
            recordId: result.insertId,
            newData: { full_name, email, role: userRole, is_active: 1 },
            businessId: id
        });

        res.status(201).json({ message: 'User created successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
};

/**
 * PATCH /api/admin/users/:userId/toggle
 */
exports.toggleUser = async (req, res) => {
    try {
        const { userId } = req.params;
        const { is_active } = req.body;

        const [users] = await db.query(
            'SELECT id, business_id, full_name, email, role, is_active FROM users WHERE id = ?',
            [userId]
        );
        if (users.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        await db.query(
            'UPDATE users SET is_active = ? WHERE id = ?',
            [is_active ? 1 : 0, userId]
        );
        await auditService.log(req, {
            action: is_active ? 'activate' : 'deactivate',
            tableName: 'users',
            recordId: userId,
            oldData: {
                full_name: users[0].full_name,
                email: users[0].email,
                role: users[0].role,
                is_active: users[0].is_active
            },
            newData: {
                full_name: users[0].full_name,
                email: users[0].email,
                role: users[0].role,
                is_active: is_active ? 1 : 0
            },
            businessId: users[0].business_id
        });

        res.json({ message: `User ${is_active ? 'activated' : 'deactivated'}` });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
};

/**
 * DELETE /api/admin/businesses/:id
 */
exports.deleteBusiness = async (req, res) => {
    try {
        const { id } = req.params;

        if (parseInt(id) === 1) {
            return res.status(400).json({ error: 'Cannot delete primary business' });
        }

        const [businesses] = await db.query(
            'SELECT business_name, is_active, subscription_status FROM businesses WHERE id = ?',
            [id]
        );
        if (businesses.length === 0) {
            return res.status(404).json({ error: 'Business not found' });
        }

        await db.query(
            'UPDATE businesses SET is_active = 0, subscription_status = ? WHERE id = ?',
            ['inactive', id]
        );
        await auditService.log(req, {
            action: 'deactivate',
            tableName: 'businesses',
            recordId: id,
            oldData: businesses[0],
            newData: { is_active: 0, subscription_status: 'inactive' },
            businessId: id
        });

        res.json({ message: 'Business deactivated' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
};

/**
 * POST /api/admin/businesses/:id/renew
 */
exports.renewSubscription = async (req, res) => {
    try {
        const { id } = req.params;
        const { plan_code, custom_days } = req.body;

        const planDays = {
            trial: 7,
            monthly: 30,
            quarterly: 90,
            yearly: 365,
        };

        const days = custom_days || planDays[plan_code];
        if (!days) {
            return res.status(400).json({
                error: 'Invalid plan',
                valid_plans: Object.keys(planDays)
            });
        }

        const [businesses] = await db.query(
            'SELECT subscription_expiry, subscription_status FROM businesses WHERE id = ?',
            [id]
        );
        if (businesses.length === 0) {
            return res.status(404).json({ error: 'Business not found' });
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const currentExpiry = businesses[0].subscription_expiry
            ? new Date(businesses[0].subscription_expiry)
            : null;

        const baseDate = currentExpiry && currentExpiry > today ? currentExpiry : today;
        const newExpiry = new Date(baseDate);
        newExpiry.setDate(newExpiry.getDate() + days);

        const newStatus = plan_code === 'trial' ? 'trial' : 'active';

        await db.query(
            `UPDATE businesses SET 
                subscription_status = ?, 
                subscription_expiry = ?,
                is_active = 1
             WHERE id = ?`,
            [newStatus, newExpiry.toISOString().split('T')[0], id]
        );
        await auditService.log(req, {
            action: 'subscription_renewal',
            tableName: 'businesses',
            recordId: id,
            oldData: {
                subscription_status: businesses[0].subscription_status,
                subscription_expiry: businesses[0].subscription_expiry
            },
            newData: {
                subscription_status: newStatus,
                subscription_expiry: newExpiry.toISOString().split('T')[0]
            },
            businessId: id
        });

        res.json({
            message: 'Subscription renewed',
            data: {
                subscription_status: newStatus,
                subscription_expiry: newExpiry.toISOString().split('T')[0],
                days_added: days,
            }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
};
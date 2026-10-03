const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/db');
const auditService = require('../services/auditService');

/**
 * POST /api/auth/login
 */
exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                error: 'Email and password required'
            });
        }

        // Find user
        const [users] = await db.query(
            'SELECT * FROM users WHERE email = ? AND is_active = 1',
            [email]
        );

        if (users.length === 0) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const user = users[0];

        // Verify password
        const validPassword = await bcrypt.compare(password, user.password_hash);
        if (!validPassword) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // ✅ Check business subscription (skip for superadmin)
        if (user.role !== 'superadmin' && user.business_id) {
            const [businesses] = await db.query(
                'SELECT subscription_status, subscription_expiry, business_name FROM businesses WHERE id = ?',
                [user.business_id]
            );

            if (businesses.length > 0) {
                const biz = businesses[0];

                // Check inactive
                if (biz.subscription_status === 'inactive') {
                    return res.status(403).json({
                        error: 'Subscription inactive',
                        message: 'Please contact your administrator to reactivate your account.'
                    });
                }

                // Check expiry
                if (biz.subscription_expiry) {
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    const expiry = new Date(biz.subscription_expiry);
                    expiry.setHours(0, 0, 0, 0);

                    if (expiry < today) {
                        return res.status(403).json({
                            error: 'Subscription expired',
                            message: `Your subscription expired on ${biz.subscription_expiry}. Please contact support to renew.`,
                            expired_on: biz.subscription_expiry
                        });
                    }
                }
            }
        }

        // ✅ Generate JWT with businessId
        const token = jwt.sign(
            {
                userId: user.id,
                businessId: user.business_id,
                role: user.role,
                email: user.email
            },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
        );

        // Update last login
        await db.query(
            'UPDATE users SET last_login = NOW() WHERE id = ?',
            [user.id]
        );

        // Fetch business details (for owner/staff)
        let businessData = null;
        if (user.business_id) {
            const [businesses] = await db.query(
                `SELECT id, business_name, primary_color, logo_path,
                    subscription_status, subscription_expiry
                 FROM businesses WHERE id = ?`,
                [user.business_id]
            );
            businessData = businesses[0] || null;
        }

        res.json({
            token,
            user: {
                id: user.id,
                name: user.full_name,
                email: user.email,
                role: user.role,
                business_id: user.business_id
            },
            business: businessData
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
};

/**
 * GET /api/auth/me
 * Get current user info
 */
exports.me = async (req, res) => {
    try {
        const [users] = await db.query(
            `SELECT u.id, u.full_name, u.email, u.role, u.business_id, u.last_login,
                    b.business_name, b.primary_color, b.logo_path,
                    b.subscription_status, b.subscription_expiry
             FROM users u
             LEFT JOIN businesses b ON u.business_id = b.id
             WHERE u.id = ? AND u.is_active = 1`,
            [req.user.userId]
        );

        if (users.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json({ user: users[0] });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
};

/**
 * POST /api/auth/change-password
 * Change own password
 */
exports.changePassword = async (req, res) => {
    let conn;
    let transactionStarted = false;
    try {
        const { userId } = req.user;
        const { current_password, new_password } = req.body;

        if (!current_password || !new_password) {
            return res.status(400).json({
                error: 'Current and new password required'
            });
        }

        if (new_password.length < 6) {
            return res.status(400).json({
                error: 'New password must be at least 6 characters'
            });
        }

        if (current_password === new_password) {
            return res.status(400).json({
                error: 'New password must be different from current'
            });
        }

        conn = await db.getConnection();
        await conn.beginTransaction();
        transactionStarted = true;

        // Get user
        const [users] = await conn.query(
            'SELECT id, password_hash FROM users WHERE id = ? AND is_active = 1',
            [userId]
        );

        if (users.length === 0) {
            await conn.rollback();
            transactionStarted = false;
            return res.status(404).json({ error: 'User not found' });
        }

        // Verify current password
        const valid = await bcrypt.compare(current_password, users[0].password_hash);
        if (!valid) {
            await conn.rollback();
            transactionStarted = false;
            return res.status(401).json({ error: 'Current password is incorrect' });
        }

        // Hash new password
        const newHash = await bcrypt.hash(new_password, 10);

        // Update
        await conn.query(
            'UPDATE users SET password_hash = ? WHERE id = ?',
            [newHash, userId]
        );
        await auditService.log(req, {
            action: 'password_change',
            tableName: 'users',
            recordId: userId,
            newData: { password_changed: true }
        }, conn);
        await conn.commit();
        transactionStarted = false;

        res.json({ message: 'Password changed successfully' });

    } catch (error) {
        if (transactionStarted) {
            await conn.rollback();
        }
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    } finally {
        conn?.release();
    }
};
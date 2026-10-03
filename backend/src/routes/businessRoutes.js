const express = require('express');
const router = express.Router();
const businessController = require('../controllers/businessController');
const authMiddleware = require('../middleware/auth');
const roleCheck = require('../middleware/roleCheck');

// All routes require authentication
router.use(authMiddleware);

// ============================================
// BUSINESS INFO (Owner + Staff can view)
// ============================================
router.get('/me', businessController.getMe);
router.get(
    '/audit-log',
    roleCheck('owner'),
    businessController.getAuditLog
);

// ============================================
// SETTINGS (Owner only)
// ============================================
router.put(
    '/settings',
    roleCheck('owner'),
    businessController.updateSettings
);

// ============================================
// STAFF MANAGEMENT (Owner only)
// ============================================
router.get(
    '/users',
    roleCheck('owner'),
    businessController.getUsers
);

router.post(
    '/users',
    roleCheck('owner'),
    businessController.addUser
);

router.patch(
    '/users/:id/toggle',
    roleCheck('owner'),
    businessController.toggleUser
);

router.post(
    '/users/:id/reset-password',
    roleCheck('owner'),
    businessController.resetUserPassword
);

module.exports = router;
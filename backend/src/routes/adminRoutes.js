const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const authMiddleware = require('../middleware/auth');
const roleCheck = require('../middleware/roleCheck');
const upload = require('../middleware/upload');

// All admin routes require superadmin
router.use(authMiddleware);
router.use(roleCheck('superadmin'));

// Dashboard
router.get('/dashboard', adminController.getDashboard);

// Business CRUD
router.get('/businesses', adminController.getAllBusinesses);
router.get('/businesses/:id', adminController.getBusinessById);
router.post('/businesses', adminController.createBusiness);
router.put('/businesses/:id', adminController.updateBusiness);
router.delete('/businesses/:id', adminController.deleteBusiness);

// ✅ Toggle Active/Inactive
router.patch('/businesses/:id/toggle-active', adminController.toggleBusinessActive);

// ✅ Subscription renewal
router.post('/businesses/:id/renew', adminController.renewSubscription);

// Logo
router.post('/businesses/:id/logo', upload.single('logo'), adminController.uploadLogo);
router.delete('/businesses/:id/logo', adminController.removeLogo);

// Owner password
router.post('/businesses/:id/reset-owner-password', adminController.resetOwnerPassword);

// Users
router.post('/businesses/:id/users', adminController.addStaffUser);
router.patch('/users/:userId/toggle', adminController.toggleUser);

module.exports = router;
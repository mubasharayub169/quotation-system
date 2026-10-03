const express = require('express');
const router = express.Router();
const customerController = require('../controllers/customerController');
const authMiddleware = require('../middleware/auth');

// All customer routes require authentication
router.use(authMiddleware);

router.get('/', customerController.getAll);
router.get('/:id', customerController.getById);
router.post('/', customerController.create);
router.put('/:id', customerController.update);
router.delete('/:id', customerController.delete);

// ✅ Customer history (quotations + invoices + summary)
router.get('/:id/history', customerController.getHistory);

module.exports = router;
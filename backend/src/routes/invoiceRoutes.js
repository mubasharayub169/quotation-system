const express = require('express');
const router = express.Router();
const invoiceController = require('../controllers/invoiceController');
const authMiddleware = require('../middleware/auth');

router.use(authMiddleware);

// ✅ Summary route MUST come before /:id to avoid conflict
router.get('/summary', invoiceController.getSummary);

router.get('/', invoiceController.getAll);
router.get('/:id', invoiceController.getById);
router.post('/from-quotation/:quotationId', invoiceController.createFromQuotation);
router.patch('/:id/payment', invoiceController.updatePayment);
router.delete('/:id', invoiceController.delete);

module.exports = router;
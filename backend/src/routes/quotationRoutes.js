const express = require('express');
const router = express.Router();
const quotationController = require('../controllers/quotationController');
const authMiddleware = require('../middleware/auth');

router.use(authMiddleware);

router.get('/', quotationController.getAll);
router.get('/:id', quotationController.getById);
router.post('/', quotationController.create);
router.put('/:id', quotationController.update);
router.patch('/:id/status', quotationController.updateStatus);
router.delete('/:id', quotationController.delete);

// ✅ Duplicate quotation
router.post('/:id/duplicate', quotationController.duplicate);

module.exports = router;
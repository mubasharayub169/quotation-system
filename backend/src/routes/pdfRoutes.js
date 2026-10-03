const express = require('express');
const router = express.Router();
const pdfController = require('../controllers/pdfController');
const authMiddleware = require('../middleware/auth');

// All PDF routes require authentication
router.use(authMiddleware);

// Quotation PDF
router.get('/quotation/:id', pdfController.downloadQuotationPdf);

// Invoice PDF
router.get('/invoice/:id', pdfController.downloadInvoicePdf);

module.exports = router;
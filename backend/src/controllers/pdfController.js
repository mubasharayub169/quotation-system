const pdfService = require('../services/pdfService');

/**
 * GET /api/pdf/quotation/:id
 * Generate quotation PDF and return as base64
 */
exports.downloadQuotationPdf = async (req, res) => {
    try {
        const { businessId } = req.user;
        const { id } = req.params;

        console.log('🎯 Quotation PDF Request:', id);

        const pdfBuffer = await pdfService.generateQuotationPdf(id, businessId);

        const buffer = Buffer.isBuffer(pdfBuffer)
            ? pdfBuffer
            : Buffer.from(pdfBuffer);

        console.log('📤 Quotation PDF buffer:', buffer.length, 'bytes');

        if (buffer.length === 0) {
            throw new Error('PDF buffer is empty');
        }

        const base64 = buffer.toString('base64');

        res.json({
            success: true,
            filename: `Presupuesto-${id}.pdf`,
            size: buffer.length,
            data: base64,
        });
    } catch (error) {
        console.error('❌ Quotation PDF Error:', error.message);
        if (error.message.includes('not found')) {
            return res.status(404).json({ error: error.message });
        }
        return res.status(500).json({
            error: 'PDF generation failed',
            details: error.message,
        });
    }
};

/**
 * GET /api/pdf/invoice/:id
 * Generate invoice PDF and return as base64
 */
exports.downloadInvoicePdf = async (req, res) => {
    try {
        const { businessId } = req.user;
        const { id } = req.params;

        console.log('🎯 Invoice PDF Request:', id);

        const pdfBuffer = await pdfService.generateInvoicePdf(id, businessId);

        const buffer = Buffer.isBuffer(pdfBuffer)
            ? pdfBuffer
            : Buffer.from(pdfBuffer);

        console.log('📤 Invoice PDF buffer:', buffer.length, 'bytes');

        if (buffer.length === 0) {
            throw new Error('PDF buffer is empty');
        }

        const base64 = buffer.toString('base64');

        res.json({
            success: true,
            filename: `Factura-${id}.pdf`,
            size: buffer.length,
            data: base64,
        });
    } catch (error) {
        console.error('❌ Invoice PDF Error:', error.message);
        if (error.message.includes('not found')) {
            return res.status(404).json({ error: error.message });
        }
        return res.status(500).json({
            error: 'PDF generation failed',
            details: error.message,
        });
    }
};
const puppeteer = require('puppeteer');
const fs = require('fs').promises;
const path = require('path');
const Handlebars = require('handlebars');
const db = require('../config/db');

// ============================================
// Register Handlebars helpers
// ============================================
Handlebars.registerHelper('eq', function (a, b) {
    return a === b;
});

Handlebars.registerHelper('ne', function (a, b) {
    return a !== b;
});

Handlebars.registerHelper('gt', function (a, b) {
    return a > b;
});

Handlebars.registerHelper('lt', function (a, b) {
    return a < b;
});

class PdfService {

    /**
     * Generate Quotation PDF (Spanish PRESUPUESTO)
     */
    async generateQuotationPdf(quotationId, businessId) {
        // 1. Load business
        const [businesses] = await db.query(
            'SELECT * FROM businesses WHERE id = ?',
            [businessId]
        );
        if (businesses.length === 0) throw new Error('Business not found');
        const business = businesses[0];

        // 2. Load quotation + customer
        const [quotations] = await db.query(
            `SELECT q.*, 
                    c.name AS customer_name,
                    c.nif_cif AS customer_nif,
                    c.address AS customer_address,
                    c.city AS customer_city,
                    c.postal_code AS customer_postal_code
             FROM quotations q
             JOIN customers c ON q.customer_id = c.id
             WHERE q.id = ? AND q.business_id = ?`,
            [quotationId, businessId]
        );
        if (quotations.length === 0) throw new Error('Quotation not found');
        const quotation = quotations[0];

        // 3. Load items
        const [items] = await db.query(
            'SELECT * FROM quotation_items WHERE quotation_id = ? ORDER BY item_order',
            [quotationId]
        );

        // 4. Load logo
        const companyLogo = await this.getLogoBase64(business.logo_path);

        // 5. Load HTML template
        const templatePath = path.join(__dirname, '../../templates/quotation-es.html');
        const templateHtml = await fs.readFile(templatePath, 'utf-8');
        const template = Handlebars.compile(templateHtml);

        // 6. Prepare data
        const html = template({
            companyName: business.business_name,
            companyLegalName: business.legal_name || business.business_name,
            companyAddress: business.address || '',
            companyPostalCode: business.postal_code || '',
            companyCity: business.city || '',
            companyProvince: business.province || '',
            companyNif: business.nif_cif || '',
            companyPhone: business.phone || '',
            companyLogo: companyLogo,

            quotationNumber: quotation.quotation_number,
            quotationDate: this.formatDate(quotation.quotation_date),
            validUntil: this.formatDate(quotation.valid_until),

            customerName: quotation.customer_name || '',
            customerNif: quotation.customer_nif || '',
            customerAddress: quotation.customer_address || '',
            customerPostalCode: quotation.customer_postal_code || '',
            customerCity: quotation.customer_city || '',
            referencePerson: quotation.reference_person || '',
            paymentMethod: quotation.payment_method || 'CONTADO',

            items: items.map(item => ({
                articleCode: item.article_code || '',
                description: item.description,
                quantity: this.formatNumber(item.quantity),
                unitPrice: this.formatNumber(item.unit_price),
                subtotal: this.formatNumber(item.subtotal),
                ivaPercent: this.formatNumber(item.iva_percent),
                ivaAmount: this.formatNumber(item.iva_amount),
                lineTotal: this.formatNumber(item.line_total)
            })),

            totalSubtotal: this.formatNumber(quotation.total_subtotal),
            totalBase: this.formatNumber(quotation.total_base),
            totalIva: this.formatNumber(quotation.total_iva),
            grandTotal: this.formatNumber(quotation.grand_total),

            iva21Base: this.formatNumber(quotation.iva_21_base),
            iva21Amount: this.formatNumber(quotation.iva_21_amount),
            iva21Total: this.formatNumber(
                parseFloat(quotation.iva_21_base || 0) + parseFloat(quotation.iva_21_amount || 0)
            ),

            iva10Base: this.formatNumber(quotation.iva_10_base),
            iva10Amount: this.formatNumber(quotation.iva_10_amount),
            iva10Total: this.formatNumber(
                parseFloat(quotation.iva_10_base || 0) + parseFloat(quotation.iva_10_amount || 0)
            ),

            iva4Base: this.formatNumber(quotation.iva_4_base),
            iva4Amount: this.formatNumber(quotation.iva_4_amount),
            iva4Total: this.formatNumber(
                parseFloat(quotation.iva_4_base || 0) + parseFloat(quotation.iva_4_amount || 0)
            ),

            observations: quotation.observations || business.default_observations || 'Presupuesto válido 30 días',

            bankName1: business.bank1_name || '',
            bankIban1: business.bank1_iban || '',
            bankName2: business.bank2_name || '',
            bankIban2: business.bank2_iban || ''
        });

        return await this.renderPdf(html, 'Presupuesto');
    }

    /**
     * Generate Invoice PDF (Spanish FACTURA)
     */
    async generateInvoicePdf(invoiceId, businessId) {
        // 1. Load business
        const [businesses] = await db.query(
            'SELECT * FROM businesses WHERE id = ?',
            [businessId]
        );
        if (businesses.length === 0) throw new Error('Business not found');
        const business = businesses[0];

        // 2. Load invoice + customer + quotation
        const [invoices] = await db.query(
            `SELECT i.*,
                    c.name AS customer_name,
                    c.nif_cif AS customer_nif,
                    c.address AS customer_address,
                    c.city AS customer_city,
                    c.postal_code AS customer_postal_code,
                    q.quotation_number AS quotation_number
             FROM invoices i
             JOIN customers c ON i.customer_id = c.id
             LEFT JOIN quotations q ON i.quotation_id = q.id
             WHERE i.id = ? AND i.business_id = ?`,
            [invoiceId, businessId]
        );
        if (invoices.length === 0) throw new Error('Invoice not found');
        const invoice = invoices[0];

        // 3. Load items
        const [items] = await db.query(
            'SELECT * FROM invoice_items WHERE invoice_id = ? ORDER BY item_order',
            [invoiceId]
        );

        // 4. Load logo
        const companyLogo = await this.getLogoBase64(business.logo_path);

        // 5. Load HTML template
        const templatePath = path.join(__dirname, '../../templates/invoice-es.html');
        const templateHtml = await fs.readFile(templatePath, 'utf-8');
        const template = Handlebars.compile(templateHtml);

        // 6. Calculate payment details
        const grandTotal = parseFloat(invoice.grand_total || 0);
        const amountPaid = parseFloat(invoice.amount_paid || 0);
        const amountDue = grandTotal - amountPaid;

        // 7. Prepare data
        const html = template({
            companyName: business.business_name,
            companyLegalName: business.legal_name || business.business_name,
            companyAddress: business.address || '',
            companyPostalCode: business.postal_code || '',
            companyCity: business.city || '',
            companyProvince: business.province || '',
            companyNif: business.nif_cif || '',
            companyPhone: business.phone || '',
            companyLogo: companyLogo,

            invoiceNumber: invoice.invoice_number,
            invoiceDate: this.formatDate(invoice.invoice_date),
            dueDate: this.formatDate(invoice.due_date),
            quotationNumber: invoice.quotation_number || '',

            customerName: invoice.customer_name || '',
            customerNif: invoice.customer_nif || '',
            customerAddress: invoice.customer_address || '',
            customerPostalCode: invoice.customer_postal_code || '',
            customerCity: invoice.customer_city || '',
            paymentMethod: invoice.payment_method || 'CONTADO',

            items: items.map(item => ({
                articleCode: item.article_code || '',
                description: item.description,
                quantity: this.formatNumber(item.quantity),
                unitPrice: this.formatNumber(item.unit_price),
                subtotal: this.formatNumber(item.subtotal),
                ivaPercent: this.formatNumber(item.iva_percent),
                ivaAmount: this.formatNumber(item.iva_amount),
                lineTotal: this.formatNumber(item.line_total)
            })),

            totalSubtotal: this.formatNumber(invoice.total_subtotal),
            totalBase: this.formatNumber(invoice.total_base),
            totalIva: this.formatNumber(invoice.total_iva),
            grandTotal: this.formatNumber(invoice.grand_total),

            iva21Base: this.formatNumber(invoice.iva_21_base),
            iva21Amount: this.formatNumber(invoice.iva_21_amount),
            iva10Base: this.formatNumber(invoice.iva_10_base),
            iva10Amount: this.formatNumber(invoice.iva_10_amount),
            iva4Base: this.formatNumber(invoice.iva_4_base),
            iva4Amount: this.formatNumber(invoice.iva_4_amount),

            // Payment status
            paymentStatus: invoice.payment_status || 'unpaid',
            amountPaid: this.formatNumber(amountPaid),
            amountDue: this.formatNumber(amountDue),
            paymentDate: this.formatDate(invoice.payment_date),

            observations: invoice.observations || business.default_observations || '',

            bankName1: business.bank1_name || '',
            bankIban1: business.bank1_iban || '',
            bankName2: business.bank2_name || '',
            bankIban2: business.bank2_iban || ''
        });

        return await this.renderPdf(html, 'Factura');
    }

    /**
     * Render HTML to PDF using Puppeteer
     */
    async renderPdf(html, label = 'PDF') {
        const browser = await puppeteer.launch({
            headless: 'new',
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--disable-gpu'
            ]
        });

        const page = await browser.newPage();
        await page.setViewport({ width: 1240, height: 1754 });

        await page.setContent(html, {
            waitUntil: 'domcontentloaded',
            timeout: 30000
        });

        await new Promise(resolve => setTimeout(resolve, 500));

        const pdfData = await page.pdf({
            format: 'A4',
            printBackground: true,
            margin: { top: '12mm', right: '12mm', bottom: '12mm', left: '12mm' },
            preferCSSPageSize: false
        });

        console.log(`📄 ${label} PDF generated:`, pdfData.length, 'bytes');

        await browser.close();

        const buffer = Buffer.isBuffer(pdfData) ? pdfData : Buffer.from(pdfData);

        console.log(`📦 ${label} Buffer ready:`, buffer.length, 'bytes');

        return buffer;
    }

    /**
     * Convert logo file to base64 data URI
     */
    async getLogoBase64(logoPath) {
        if (!logoPath) return null;
        try {
            const fullPath = path.join(__dirname, '../../', logoPath);
            const logoBuffer = await fs.readFile(fullPath);
            const ext = path.extname(logoPath).toLowerCase().replace('.', '');
            const mimeType =
                ext === 'png' ? 'image/png' :
                ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' :
                ext === 'svg' ? 'image/svg+xml' :
                ext === 'webp' ? 'image/webp' :
                'image/png';
            return `data:${mimeType};base64,${logoBuffer.toString('base64')}`;
        } catch (error) {
            console.error('❌ Logo load failed:', error.message);
            return null;
        }
    }

    /**
     * Format number: 1234.56 → "1.234,56"
     */
    formatNumber(num) {
        if (num === null || num === undefined || num === '') return '0,00';
        return parseFloat(num).toLocaleString('es-ES', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
    }

    /**
     * Format date: 2026-10-02 → "02/10/2026"
     */
    formatDate(date) {
        if (!date) return '';
        const d = new Date(date);
        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const year = d.getFullYear();
        return `${day}/${month}/${year}`;
    }
}

module.exports = new PdfService();
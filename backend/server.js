const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();

// ✅ CORS
app.use(cors({
    origin: [
        'http://localhost:3000',
        'http://localhost:5173',
        'http://127.0.0.1:3000',
        'http://127.0.0.1:5173',
    ],
    credentials: true,
    exposedHeaders: [
        'Content-Disposition',
        'Content-Type',
        'Content-Length',
    ],
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ✅ Static files (uploads + generated PDFs)
app.use('/uploads', express.static('uploads'));

// Health check
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        time: new Date().toISOString(),
        environment: process.env.NODE_ENV,
    });
});

// Routes
app.use('/api/auth', require('./src/routes/authRoutes'));
app.use('/api/customers', require('./src/routes/customerRoutes'));
app.use('/api/quotations', require('./src/routes/quotationRoutes'));
app.use('/api/invoices', require('./src/routes/invoiceRoutes'));
app.use('/api/pdf', require('./src/routes/pdfRoutes'));
app.use('/api/business', require('./src/routes/businessRoutes'));
app.use('/api/admin', require('./src/routes/adminRoutes'));

// Error handler
app.use(require('./src/middleware/errorHandler'));

// 404 handler
app.use((req, res) => {
    res.status(404).json({ error: 'Route not found', path: req.originalUrl });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`📊 Environment: ${process.env.NODE_ENV}`);
    console.log(`🕐 Started at: ${new Date().toLocaleString()}`);
});
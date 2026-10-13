const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure upload folders exist
const logosDir = path.join(__dirname, '../../uploads/logos');
const productsDir = path.join(__dirname, '../../uploads/products');

[logosDir, productsDir].forEach((dir) => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
});

// ============================================
// Storage config (destination based on route)
// ============================================
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        // If route is product, save to products folder
        if (req.baseUrl.includes('/products') || req.originalUrl.includes('/products')) {
            return cb(null, productsDir);
        }
        // Default: logos
        cb(null, logosDir);
    },
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname);
        const entityId = req.params.id || req.user.businessId || 'unknown';
        const prefix = req.baseUrl.includes('/products') ? 'product' : 'logo';
        const filename = `${prefix}-${entityId}-${Date.now()}${ext}`;
        cb(null, filename);
    },
});

// File filter
const fileFilter = (req, file, cb) => {
    const allowed = [
        'image/png', 'image/jpeg', 'image/jpg',
        'image/svg+xml', 'image/webp',
    ];
    if (allowed.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Only PNG, JPG, SVG, or WebP images allowed'), false);
    }
};

// Limits (2MB)
const upload = multer({
    storage,
    fileFilter,
    limits: { fileSize: 2 * 1024 * 1024 },
});

module.exports = upload;
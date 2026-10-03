const db = require('../config/db');

/**
 * Get next number for business + type + year
 * Returns formatted: PRES-2026-0001 or FACT-2026-0001
 */
exports.getNextNumber = async (businessId, type, connection) => {
    const prefixes = {
        quotation: 'PRES',
        invoice: 'FACT',
        customer: 'CLI'
    };
    const prefix = prefixes[type];
    if (!prefix) {
        throw new Error(`Unsupported sequence type: ${type}`);
    }

    const ownsConnection = !connection;
    const conn = connection || await db.getConnection();
    const year = new Date().getFullYear();

    try {
        await conn.query(
            `INSERT INTO number_sequences (business_id, sequence_type, year, last_number)
             VALUES (?, ?, ?, LAST_INSERT_ID(1))
             ON DUPLICATE KEY UPDATE last_number = LAST_INSERT_ID(last_number + 1)`,
            [businessId, type, year]
        );

        const [[row]] = await conn.query(
            'SELECT LAST_INSERT_ID() AS last_number'
        );

        if (!row) {
            throw new Error('Failed to retrieve the next sequence number');
        }

        const sequence = String(row.last_number).padStart(4, '0');
        return type === 'customer'
            ? `${prefix}-${sequence}`
            : `${prefix}-${year}-${sequence}`;
    } finally {
        if (ownsConnection) {
            conn.release();
        }
    }
};
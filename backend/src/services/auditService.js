const db = require('../config/db');

exports.log = async (req, {
    action,
    tableName,
    recordId,
    oldData = null,
    newData = null,
    businessId = req.user?.businessId || null
}, connection = db) => {
    const includeBusinessId = (data) => {
        if (!data) return null;
        return { ...data, business_id: businessId };
    };

    await connection.query(
        `INSERT INTO audit_log
            (user_id, business_id, action, table_name, record_id, old_data, new_data, ip_address)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
            req.user?.userId || null,
            businessId,
            action,
            tableName,
            recordId || null,
            oldData ? JSON.stringify(includeBusinessId(oldData)) : null,
            newData ? JSON.stringify(includeBusinessId(newData)) : null,
            req.ip || null
        ]
    );
};

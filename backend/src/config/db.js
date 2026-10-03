const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    timezone: '+01:00',
    charset: 'utf8mb4'
});

(async () => {
    try {
        const conn = await pool.getConnection();
        console.log('✅ MySQL connected to Hostinger');
        conn.release();
    } catch (error) {
        console.error('❌ MySQL connection failed:', error.message);
    }
})();

module.exports = pool;
const db = require('./src/config/db');

(async () => {
    try {
        const [rows] = await db.query('SELECT NOW() AS server_time, DATABASE() AS db_name');
        console.log('✅ Connection successful!');
        console.log('Server time:', rows[0].server_time);
        console.log('Database:', rows[0].db_name);

        const [tables] = await db.query('SHOW TABLES');
        console.log(`\n📋 Tables: ${tables.length}`);
        tables.forEach(t => console.log('  -', Object.values(t)[0]));

        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
})();
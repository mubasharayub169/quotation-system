const db = require('./src/config/db');

(async () => {
    try {
        const tablesToCheck = [
            'businesses', 'users', 'customers',
            'quotations', 'quotation_items',
            'invoices', 'invoice_items',
            'number_sequences', 'audit_log'
        ];

        for (const table of tablesToCheck) {
            const [columns] = await db.query(`SHOW COLUMNS FROM \`${table}\``);
            console.log(`\n📋 ${table.toUpperCase()}`);
            console.log('─'.repeat(60));
            columns.forEach(col => {
                console.log(`  ${col.Field.padEnd(25)} | ${col.Type.padEnd(20)} | ${col.Null} | ${col.Key}`);
            });
        }

        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
})();
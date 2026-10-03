const db = require('./src/config/db');
const bcrypt = require('bcryptjs');
const readline = require('readline');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const question = (q) => new Promise(resolve => rl.question(q, resolve));

(async () => {
    try {
        console.log('\n🔐 Creating Super Admin User\n');
        console.log('(Super admin ke paas saare businesses ka control hoga)\n');

        const fullName = (await question('Full Name: ')).trim();
        const email = (await question('Email: ')).trim().toLowerCase();
        const password = (await question('Password (min 6 chars): ')).trim();

        // ✅ Close readline BEFORE any process.exit
        rl.close();

        if (!fullName || !email || !password || password.length < 6) {
            console.log('\n❌ Invalid input — all fields required, password 6+ chars\n');
            process.exit(1);
        }

        // Validate email format
        if (!email.includes('@') || !email.includes('.')) {
            console.log('\n❌ Invalid email format\n');
            process.exit(1);
        }

        // Check email exists
        const [existing] = await db.query(
            'SELECT id FROM users WHERE email = ?',
            [email]
        );
        if (existing.length > 0) {
            console.log('\n❌ Email already exists\n');
            process.exit(1);
        }

        // Hash password
        const hash = await bcrypt.hash(password, 10);

        // Insert with business_id = NULL
        const [result] = await db.query(
            `INSERT INTO users 
             (business_id, full_name, email, password_hash, role, is_active)
             VALUES (NULL, ?, ?, ?, 'superadmin', 1)`,
            [fullName, email, hash]
        );

        console.log('\n✅ Super Admin created successfully!');
        console.log('─────────────────────────────────────');
        console.log(`   ID:       ${result.insertId}`);
        console.log(`   Name:     ${fullName}`);
        console.log(`   Email:    ${email}`);
        console.log(`   Role:     superadmin`);
        console.log('─────────────────────────────────────\n');
        console.log('Ab aap is email/password se login kar sakte hain.\n');

        process.exit(0);
    } catch (error) {
        try { rl.close(); } catch (e) {}
        console.error('\n❌ Error:', error.message);
        if (error.code) console.error('   Code:', error.code);
        console.log('');
        process.exit(1);
    }
})();
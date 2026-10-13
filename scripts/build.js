/**
 * Build script for Hostinger deployment.
 *
 * Steps:
 *   1. Install backend production dependencies
 *   2. Install frontend dependencies + build the React app
 *
 * Hostinger runs this via "npm run build" from the repository root.
 */

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const rootDir = path.join(__dirname, '..');

function run(command, cwd) {
    console.log(`\n>> ${command}`);
    console.log(`   (in ${cwd})\n`);
    execSync(command, { cwd, stdio: 'inherit' });
}

try {
    console.log('============================================');
    console.log('  Building Quotation System');
    console.log('============================================\n');

    // 1. Backend production dependencies
    const backendDir = path.join(rootDir, 'backend');
    run('npm ci --omit=dev', backendDir);

    // 2. Frontend build
    const frontendDir = path.join(rootDir, 'frontend');
    run('npm ci', frontendDir);
    run('npm run build', frontendDir);

    // 3. Verify frontend/dist exists
    const distPath = path.join(frontendDir, 'dist', 'index.html');
    if (!fs.existsSync(distPath)) {
        throw new Error(`Frontend build failed: ${distPath} not found`);
    }

    console.log('\n============================================');
    console.log('  Build completed successfully');
    console.log('============================================\n');
} catch (error) {
    console.error('\n============================================');
    console.error('  Build failed');
    console.error('============================================\n');
    console.error(error.message);
    process.exit(1);
}
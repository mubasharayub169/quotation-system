const { spawnSync } = require('node:child_process');
const path = require('node:path');

const root = path.join(__dirname, '..');
const steps = [
    ['ci', '--prefix', 'backend', '--omit=dev'],
    ['ci', '--prefix', 'frontend', '--include=dev'],
    ['test', '--prefix', 'backend'],
    ['run', 'lint', '--prefix', 'frontend'],
    ['run', 'build', '--prefix', 'frontend']
];

for (const args of steps) {
    console.log(`\n> npm ${args.join(' ')}`);
    const result = spawnSync('npm', args, {
        cwd: root,
        stdio: 'inherit',
        shell: process.platform === 'win32'
    });
    if (result.error) {
        console.error(`Could not run npm: ${result.error.message}`);
        process.exit(1);
    }
    if (result.status !== 0) {
        console.error(`Deployment build failed: npm ${args.join(' ')}`);
        process.exit(result.status || 1);
    }
}

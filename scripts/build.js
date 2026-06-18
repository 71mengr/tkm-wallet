const fs = require('fs-extra');
const path = require('path');
const { execSync } = require('child_process');

async function build() {
    const distDir = path.join(__dirname, '..', 'dist');
    
    // Clean dist
    await fs.remove(distDir);
    await fs.ensureDir(distDir);

    // Copy files
    await fs.copy(path.join(__dirname, '..', 'src'), path.join(distDir, 'src'));
    await fs.copy(path.join(__dirname, '..', 'main.js'), path.join(distDir, 'main.js'));
    await fs.copy(path.join(__dirname, '..', 'preload.js'), path.join(distDir, 'preload.js'));
    await fs.copy(path.join(__dirname, '..', 'package.json'), path.join(distDir, 'package.json'));

    // Install production dependencies in dist
    execSync('npm install --production', { cwd: distDir, stdio: 'inherit' });

    console.log('✅ Build complete!');
}

build().catch(console.error);

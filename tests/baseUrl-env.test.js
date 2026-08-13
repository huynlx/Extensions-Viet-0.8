const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const root = path.join(__dirname, '..');
const pkgPath = path.join(root, 'package.json');
const originalPkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));

try {
    const env = {
        ...process.env,
        GH_PAGES: 'true',
        BASE_URL: 'https://huynlx.github.io/Extensions-Viet-0.8/',
    };

    const result = spawnSync(process.execPath, ['scripts/update-base-url.js'], {
        cwd: root,
        env,
        encoding: 'utf8',
    });

    if (result.status !== 0) {
        throw new Error(result.stderr || result.stdout || 'update-base-url.js failed');
    }

    const updatedPkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
    if (updatedPkg.baseURL !== env.BASE_URL) {
        throw new Error(`Expected baseURL to be ${env.BASE_URL}, got ${updatedPkg.baseURL}`);
    }

    console.log('baseUrl-env test: OK');
} finally {
    fs.writeFileSync(pkgPath, JSON.stringify(originalPkg, null, 2) + '\n');
}

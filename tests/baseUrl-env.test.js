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

    let result = spawnSync(process.execPath, ['scripts/update-base-url.js'], {
        cwd: root,
        env,
        encoding: 'utf8',
    });

    if (result.status !== 0) {
        throw new Error(result.stderr || result.stdout || 'update-base-url.js failed');
    }

    let updatedPkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
    if (updatedPkg.baseURL !== env.BASE_URL) {
        throw new Error(`Expected baseURL to be ${env.BASE_URL}, got ${updatedPkg.baseURL}`);
    }
    if (updatedPkg.repositoryName !== originalPkg.repositoryName) {
        throw new Error(`Expected repositoryName to stay ${originalPkg.repositoryName} on GH Pages, got ${updatedPkg.repositoryName}`);
    }

    const staleLocalEnv = {
        ...process.env,
        GH_PAGES: undefined,
        BASE_URL: 'https://huynlx.github.io/Extensions-Viet-0.8/',
    };

    result = spawnSync(process.execPath, ['scripts/update-base-url.js'], {
        cwd: root,
        env: staleLocalEnv,
        encoding: 'utf8',
    });

    if (result.status !== 0) {
        throw new Error(result.stderr || result.stdout || 'update-base-url.js failed in stale local mode');
    }

    updatedPkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
    if (updatedPkg.baseURL !== 'http://192.168.1.3:8080/') {
        throw new Error(`Expected stale GH Pages BASE_URL to fall back to local URL, got ${updatedPkg.baseURL}`);
    }

    const expectedRepoName = `${originalPkg.repositoryName} dev`;
    if (updatedPkg.repositoryName !== expectedRepoName) {
        throw new Error(`Expected repositoryName to be ${expectedRepoName} in local mode, got ${updatedPkg.repositoryName}`);
    }

    console.log('baseUrl-env test: OK');
} finally {
    fs.writeFileSync(pkgPath, JSON.stringify(originalPkg, null, 2) + '\n');
}

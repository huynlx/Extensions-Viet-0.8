const fs = require('fs');
const path = require('path');

const GH_PAGES_URL = 'https://huynlx.github.io/Extensions-Viet-0.8/';
const LOCAL_URL = 'http://192.168.1.3:8080/';
const explicitBaseUrl = process.env.BASE_URL;
const isGhPages = process.env.GH_PAGES === 'true' || process.env.GH_PAGES === '1';
const isStaleGhPagesBaseUrl = !isGhPages && explicitBaseUrl === GH_PAGES_URL;
const targetUrl = isStaleGhPagesBaseUrl ? LOCAL_URL : explicitBaseUrl || (isGhPages ? GH_PAGES_URL : LOCAL_URL);

const pkgPath = path.join(__dirname, '..', 'package.json');
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));

const originalRepoName = typeof pkg.repositoryName === 'string' ? pkg.repositoryName.trim() : '';
const isLocalEnvironment = !isGhPages && targetUrl !== GH_PAGES_URL;
const resolvedRepoName = isLocalEnvironment && originalRepoName && !originalRepoName.endsWith(' dev') ? `${originalRepoName} dev` : originalRepoName;

pkg.baseURL = targetUrl;
pkg.repositoryName = resolvedRepoName;
process.env.BASE_URL = targetUrl;

fs.writeFileSync(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`);
console.log(`baseURL set to ${targetUrl}`);
console.log(`repositoryName set to ${resolvedRepoName}`);

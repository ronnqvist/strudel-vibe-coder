// SPDX-License-Identifier: MIT
/**
 * Lists the npm packages whose code ends up in the production bundle and fails
 * if any of them has a licence outside the allowlist (for example AGPL).
 *
 * Runs a normal Vite production build in memory (nothing is written to disk),
 * collects every module in the bundle graph, and maps each one to the package
 * that contains it.
 *
 * Usage: npm run licenses
 */
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'vite';

const ALLOWED = new Set(['MIT', 'ISC', 'BSD-2-Clause', 'BSD-3-Clause', 'Apache-2.0', '0BSD']);
const root = join(dirname(fileURLToPath(import.meta.url)), '..');

/** Find the package.json that owns a file inside node_modules. */
function packageOf(file) {
    const marker = `${sep}node_modules${sep}`;
    const at = file.lastIndexOf(marker);
    if (at === -1) return null;
    const rest = file.slice(at + marker.length).split(sep);
    const name = rest[0].startsWith('@') ? `${rest[0]}/${rest[1]}` : rest[0];
    const pkgJson = join(file.slice(0, at + marker.length), ...name.split('/'), 'package.json');
    if (!existsSync(pkgJson)) return null;
    const pkg = JSON.parse(readFileSync(pkgJson, 'utf8'));
    return { name: pkg.name, version: pkg.version, license: pkg.license ?? '(none)' };
}

const ids = new Set();
await build({
    root,
    logLevel: 'warn',
    build: { write: false },
    plugins: [{
        name: 'collect-module-ids',
        generateBundle() {
            for (const id of this.getModuleIds()) ids.add(id);
        },
    }],
});

const packages = new Map();
for (const raw of ids) {
    let id = raw.replace(/^\0/, '').split('?')[0];
    // Vite's own runtime helpers are virtual modules
    if (id.startsWith('vite/')) id = join(root, 'node_modules', 'vite', 'package.json');
    const pkg = packageOf(id);
    if (pkg) packages.set(`${pkg.name}@${pkg.version}`, pkg);
}

const rows = [...packages.values()].sort((a, b) => a.name.localeCompare(b.name));
let failed = false;
for (const p of rows) {
    const ok = ALLOWED.has(p.license);
    if (!ok) failed = true;
    console.log(`${ok ? 'ok ' : 'BAD'}  ${p.name}@${p.version}  ${p.license}`);
}
if (failed) {
    console.error('\nA bundled package has a licence outside the allowlist. Update THIRD_PARTY_NOTICES.md and review before shipping.');
    process.exit(1);
}
console.log(`\n${rows.length} bundled packages, all licences allowed.`);

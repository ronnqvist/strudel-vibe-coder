// SPDX-License-Identifier: MIT
import { existsSync, readFileSync } from 'node:fs';

const MARKER = '/node_modules/';

/**
 * Find the package that owns a file inside node_modules: { name, version, license }, or null.
 * Works with forward slashes (what Vite gives on every OS) and with Windows backslashes.
 * @param {string} file
 * @param {{ exists?: (path: string) => boolean, read?: (path: string) => string }} [fs] for tests
 */
export function packageOf(file, { exists = existsSync, read = (p) => readFileSync(p, 'utf8') } = {}) {
    const path = file.replaceAll('\\', '/');
    const at = path.lastIndexOf(MARKER);
    if (at === -1) return null;
    const rest = path.slice(at + MARKER.length).split('/');
    const name = rest[0].startsWith('@') ? `${rest[0]}/${rest[1]}` : rest[0];
    const pkgJson = `${path.slice(0, at + MARKER.length)}${name}/package.json`;
    if (!exists(pkgJson)) return null;
    const pkg = JSON.parse(read(pkgJson));
    return { name: pkg.name, version: pkg.version, license: pkg.license ?? '(none)' };
}

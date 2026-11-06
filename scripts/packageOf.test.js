// SPDX-License-Identifier: MIT
import { describe, expect, it } from 'vitest';
import { packageOf } from './packageOf.js';

// Review finding F12: Vite gives module ids with forward slashes on every OS, so matching
// with the OS separator (a backslash on Windows) found no bundled package there.
describe('packageOf', () => {
    const files = { '/repo/node_modules/react/package.json': { name: 'react', version: '19.0.0', license: 'MIT' }, '/repo/node_modules/@scope/pkg/package.json': { name: '@scope/pkg', version: '1.0.0', license: 'ISC' } };
    const fs = { exists: (p) => p.replaceAll('\\', '/') in files, read: (p) => JSON.stringify(files[p.replaceAll('\\', '/')]) };

    it('finds the package for forward-slash ids, as Vite gives them on every OS', () => {
        expect(packageOf('/repo/node_modules/react/index.js', fs)).toEqual({ name: 'react', version: '19.0.0', license: 'MIT' });
        expect(packageOf('/repo/node_modules/@scope/pkg/dist/a.js', fs)).toMatchObject({ name: '@scope/pkg' });
    });
    it('also finds it for Windows backslash paths', () => {
        expect(packageOf('\\repo\\node_modules\\react\\cjs\\react.js', fs)).toMatchObject({ name: 'react' });
    });
    it('returns null outside node_modules', () => {
        expect(packageOf('/repo/src/App.jsx', fs)).toBeNull();
    });
});

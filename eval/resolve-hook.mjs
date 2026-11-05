// SPDX-License-Identifier: MIT
// Node module resolve hook: a relative import without an extension tries `.js`, then `/index.js`.
export async function resolve(specifier, context, nextResolve) {
    try {
        return await nextResolve(specifier, context);
    } catch (error) {
        const relative = specifier.startsWith('./') || specifier.startsWith('../');
        if (!relative || !['ERR_MODULE_NOT_FOUND', 'ERR_UNSUPPORTED_DIR_IMPORT'].includes(error?.code)) throw error;
        for (const candidate of [`${specifier}.js`, `${specifier}/index.js`]) {
            try {
                return await nextResolve(candidate, context);
            } catch {
                // try the next one
            }
        }
        throw error;
    }
}

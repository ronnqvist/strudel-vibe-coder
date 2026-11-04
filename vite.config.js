// SPDX-License-Identifier: MIT
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { buildCsp } from './scripts/csp.js'

// Adds the Content-Security-Policy <meta> tag to production builds only: the dev server needs
// inline scripts and a websocket for hot reloading, which the policy would block.
const cspMeta = () => ({
  name: 'csp-meta',
  apply: 'build',
  transformIndexHtml: () => [{
    tag: 'meta',
    attrs: { 'http-equiv': 'Content-Security-Policy', content: buildCsp() },
    injectTo: 'head-prepend',
  }],
})

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), cspMeta()],
  base: './', // Use relative paths for GitHub Pages
  build: {
    outDir: 'docs', // Output to 'docs' folder for GitHub Pages
    // Ship the licence texts of bundled npm packages next to the build
    license: { fileName: 'THIRD_PARTY_LICENSES.md' },
  },
})

// SPDX-License-Identifier: MIT
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: './', // Use relative paths for GitHub Pages
  build: {
    outDir: 'docs', // Output to 'docs' folder for GitHub Pages
    // Ship the licence texts of bundled npm packages next to the build
    license: { fileName: 'THIRD_PARTY_LICENSES.md' },
  },
})

// SPDX-License-Identifier: MIT
import { defineConfig, devices } from '@playwright/test'

// In a sandbox that already has a browser installed, point PW_CHROMIUM_PATH at it
// (for example /opt/pw-browsers/chromium). Elsewhere run `npx playwright install chromium`.
const executablePath = process.env.PW_CHROMIUM_PATH
const base = 'http://localhost:4173/strudel-vibe-coder/'

export default defineConfig({
  testDir: 'e2e',
  testMatch: '**/*.e2e.js',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: base,
    trace: 'retain-on-failure',
    launchOptions: executablePath ? { executablePath } : {},
  },
  // The production build, served under the same path as on GitHub Pages
  webServer: {
    command: 'npx vite build --base=/strudel-vibe-coder/ --outDir dist && npx vite preview --base=/strudel-vibe-coder/ --outDir dist --port 4173 --strictPort',
    url: base,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
})

import { defineConfig } from '@playwright/test'

// E2e del modo Pages: frontend/dist-pages (bash scripts/construir_pages.sh) servido bajo la base de Pages
// (PAGES_BASE, la misma que usó la construcción; por defecto /PACHA/).
const base = process.env.PAGES_BASE ?? '/PACHA/'

export default defineConfig({
  testDir: './e2e',
  testMatch: ['pages.spec.ts'],
  timeout: 180_000,
  use: {
    locale: 'es-EC',
    baseURL: `http://localhost:4174${base}`,
    launchOptions: { executablePath: process.env.CHROME_PATH },
  },
  webServer: {
    command: `npx vite preview --outDir dist-pages --base ${base} --port 4174 --strictPort`,
    url: `http://localhost:4174${base}`,
    reuseExistingServer: true,
  },
})

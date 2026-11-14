import { defineConfig } from '@playwright/test'

// E2e del modo Pages: frontend/dist-pages (bash scripts/construir_pages.sh) servido bajo /NISAR-Ecuador/.
export default defineConfig({
  testDir: './e2e',
  testMatch: ['pages.spec.ts'],
  timeout: 180_000,
  use: {
    locale: 'es-EC',
    baseURL: 'http://localhost:4174/NISAR-Ecuador/',
    launchOptions: { executablePath: process.env.CHROME_PATH },
  },
  webServer: {
    command: 'npx vite preview --outDir dist-pages --base /NISAR-Ecuador/ --port 4174 --strictPort',
    url: 'http://localhost:4174/NISAR-Ecuador/',
    reuseExistingServer: true,
  },
})

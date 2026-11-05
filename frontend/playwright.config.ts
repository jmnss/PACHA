import { defineConfig } from '@playwright/test'

const lanzamiento = { executablePath: process.env.CHROME_PATH }

// Dos proyectos:
//  - componentes: specs sueltos contra `npm run preview` (4173, sin API).
//  - flujos: recorridos completos contra `python servidor.py` (8000, API + frontend/dist).
// Los dos usan frontend/dist: ejecuta `npm run build` antes (idealmente con VITE_MAPA_REMOTO=0 para que
// el mapa no pida nada a internet).
export default defineConfig({
  testDir: './e2e',
  projects: [
    {
      name: 'componentes',
      testMatch: ['fuente.spec.ts', 'exportar.spec.ts', 'panel.spec.ts', 'sistema.spec.ts'],
      use: { baseURL: 'http://localhost:4173', launchOptions: lanzamiento },
    },
    {
      name: 'flujos',
      testMatch: ['flujos.spec.ts', 'simulador.spec.ts'],
      use: { baseURL: 'http://127.0.0.1:8000', launchOptions: lanzamiento },
    },
  ],
  webServer: [
    {
      command: 'npm run preview -- --port 4173 --strictPort',
      url: 'http://localhost:4173',
      reuseExistingServer: true,
    },
    {
      // Desde la raíz del repo; Playwright gestiona (y termina) el proceso.
      command: "bash -c 'cd .. && exec python servidor.py'",
      url: 'http://127.0.0.1:8000/api/salud',
      reuseExistingServer: true,
      timeout: 120_000,
    },
  ],
})

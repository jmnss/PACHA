import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter } from 'react-router-dom'
import '@fontsource/public-sans/400.css'
import '@fontsource/public-sans/500.css'
import '@fontsource/public-sans/600.css'
import '@fontsource/public-sans/700.css'
import '@fontsource/spectral/500.css'
import '@fontsource/spectral/500-italic.css'
import '@fontsource/spectral/600.css'
import './diseno/tokens.css'
import './diseno/componentes.css'
import './graficos/graficos.css'
import './tiempo/tiempo.css'
import './comparador/comparador.css'
import './idioma/idioma.css'
import App from './App.tsx'
import { crearQueryClient } from './api/consultas'
import { ProveedorIdioma } from './idioma/ProveedorIdioma'
import { motor } from './motor/clienteMotor'

const cliente = crearQueryClient()

if (import.meta.env.VITE_MOTOR === 'navegador') motor.iniciar()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ProveedorIdioma>
      <QueryClientProvider client={cliente}>
        <BrowserRouter basename={import.meta.env.BASE_URL === '/' ? undefined : import.meta.env.BASE_URL.replace(/\/$/, '')}>
          <App />
        </BrowserRouter>
      </QueryClientProvider>
    </ProveedorIdioma>
  </StrictMode>,
)

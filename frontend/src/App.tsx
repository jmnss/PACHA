import { lazy, Suspense } from 'react'
import { Route, Routes } from 'react-router-dom'
import { CabeceraPantalla } from './diseno/CabeceraPantalla'
import { Estructura } from './diseno/Estructura'
import { Cargando } from './diseno/Estados'

// El Observatorio arrastra MapLibre (~1 MB): se carga solo al entrar en la ruta.
const Galeria = lazy(() => import('./diseno/Galeria').then((m) => ({ default: m.Galeria })))
const Observatorio = lazy(() => import('./pantallas/observatorio/Observatorio'))

export default function App() {
  return (
    <Routes>
      <Route element={<Estructura />}>
        <Route
          index
          element={<CabeceraPantalla titulo="Historias" hallazgo="Qué ve el radar cuando el agua sube o el bosque arde, y por qué." />}
        />
        <Route
          path="observatorio"
          element={
            <Suspense fallback={<Cargando texto="Cargando…" />}>
              <Observatorio />
            </Suspense>
          }
        />
        <Route
          path="_sistema"
          element={
            <Suspense fallback={<Cargando texto="Cargando…" />}>
              <Galeria />
            </Suspense>
          }
        />
        <Route path="*" element={<CabeceraPantalla titulo="Página no encontrada" hallazgo="Esta dirección no existe en la app." />} />
      </Route>
    </Routes>
  )
}

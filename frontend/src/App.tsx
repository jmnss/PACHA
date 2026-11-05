import { lazy, Suspense } from 'react'
import { Route, Routes } from 'react-router-dom'
import { CabeceraPantalla } from './diseno/CabeceraPantalla'
import { Estructura } from './diseno/Estructura'
import { Cargando } from './diseno/Estados'
import { LimiteError } from './diseno/LimiteError'

// El Observatorio arrastra MapLibre (~1 MB): se carga solo al entrar en la ruta.
const Galeria = lazy(() => import('./diseno/Galeria').then((m) => ({ default: m.Galeria })))
const Historias = lazy(() => import('./pantallas/historias/Historias'))
const Observatorio = lazy(() => import('./pantallas/observatorio/Observatorio'))
const Simulador = lazy(() => import('./pantallas/simulador/Simulador'))

export default function App() {
  return (
    <Routes>
      <Route element={<Estructura />}>
        <Route
          index
          element={
            <LimiteError>
              <Suspense fallback={<Cargando texto="Cargando…" />}>
                <Historias />
              </Suspense>
            </LimiteError>
          }
        />
        <Route
          path="observatorio"
          element={
            <LimiteError>
              <Suspense fallback={<Cargando texto="Cargando…" />}>
                <Observatorio />
              </Suspense>
            </LimiteError>
          }
        />
        <Route
          path="simulador"
          element={
            <LimiteError>
              <Suspense fallback={<Cargando texto="Cargando…" />}>
                <Simulador />
              </Suspense>
            </LimiteError>
          }
        />
        <Route
          path="_sistema"
          element={
            <LimiteError>
              <Suspense fallback={<Cargando texto="Cargando…" />}>
                <Galeria />
              </Suspense>
            </LimiteError>
          }
        />
        <Route path="*" element={<CabeceraPantalla titulo="Página no encontrada" hallazgo="Esta dirección no existe en la app." />} />
      </Route>
    </Routes>
  )
}

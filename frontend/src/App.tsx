import { lazy, Suspense } from 'react'
import { Route, Routes } from 'react-router-dom'
import { CabeceraPantalla } from './diseno/CabeceraPantalla'
import { Estructura } from './diseno/Estructura'
import { Cargando } from './diseno/Estados'
import { LimiteError } from './diseno/LimiteError'
import { useT } from './idioma/useT'

// El Observatorio arrastra MapLibre (~1 MB): se carga solo al entrar en la ruta.
const Galeria = lazy(() => import('./diseno/Galeria').then((m) => ({ default: m.Galeria })))
const Historias = lazy(() => import('./pantallas/historias/Historias'))
const Observatorio = lazy(() => import('./pantallas/observatorio/Observatorio'))
const Laboratorio = lazy(() => import('./pantallas/laboratorio/Laboratorio'))
const Recorrido = lazy(() => import('./pantallas/recorrido/Recorrido'))
const Fundamentos = lazy(() => import('./pantallas/fundamentos/Fundamentos'))
const Simulador = lazy(() => import('./pantallas/simulador/Simulador'))

export default function App() {
  const { t } = useT()
  return (
    <Routes>
      <Route element={<Estructura />}>
        <Route
          index
          element={
            <LimiteError>
              <Suspense fallback={<Cargando />}>
                <Historias />
              </Suspense>
            </LimiteError>
          }
        />
        <Route
          path="observatorio"
          element={
            <LimiteError>
              <Suspense fallback={<Cargando />}>
                <Observatorio />
              </Suspense>
            </LimiteError>
          }
        />
        <Route
          path="simulador"
          element={
            <LimiteError>
              <Suspense fallback={<Cargando />}>
                <Simulador />
              </Suspense>
            </LimiteError>
          }
        />
        <Route
          path="laboratorio"
          element={
            <LimiteError>
              <Suspense fallback={<Cargando />}>
                <Laboratorio />
              </Suspense>
            </LimiteError>
          }
        />
        <Route
          path="recorrido"
          element={
            <LimiteError>
              <Suspense fallback={<Cargando />}>
                <Recorrido />
              </Suspense>
            </LimiteError>
          }
        />
        <Route
          path="fundamentos"
          element={
            <LimiteError>
              <Suspense fallback={<Cargando />}>
                <Fundamentos />
              </Suspense>
            </LimiteError>
          }
        />
        <Route
          path="_sistema"
          element={
            <LimiteError>
              <Suspense fallback={<Cargando />}>
                <Galeria />
              </Suspense>
            </LimiteError>
          }
        />
        <Route path="*" element={<CabeceraPantalla titulo={t('estructura.no_encontrada.titulo')} hallazgo={t('estructura.no_encontrada.hallazgo')} />} />
      </Route>
    </Routes>
  )
}

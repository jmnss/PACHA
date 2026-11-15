import { lazy, Suspense } from 'react'
import { Route, Routes } from 'react-router-dom'
import { CabeceraPantalla } from './diseno/CabeceraPantalla'
import { Estructura } from './diseno/Estructura'
import { Cargando } from './diseno/Estados'
import { LimiteError } from './diseno/LimiteError'
import { useT } from './idioma/useT'
import { Redirigir } from './diseno/Redirigir'
import { SeccionConSub } from './diseno/SeccionConSub'
import type { EnlaceSub } from './diseno/SubNavegacion'
import { useLocation } from 'react-router-dom'

// El Observatorio arrastra MapLibre (~1 MB): se carga solo al entrar en la ruta.
const Galeria = lazy(() => import('./diseno/Galeria').then((m) => ({ default: m.Galeria })))
const Historias = lazy(() => import('./pantallas/historias/Historias'))
const Observatorio = lazy(() => import('./pantallas/observatorio/Observatorio'))
const Laboratorio = lazy(() => import('./pantallas/laboratorio/Laboratorio'))
const Recorrido = lazy(() => import('./pantallas/recorrido/Recorrido'))
const Fundamentos = lazy(() => import('./pantallas/fundamentos/Fundamentos'))
const Inicio = lazy(() => import('./pantallas/inicio/Inicio'))
const Simulador = lazy(() => import('./pantallas/simulador/Simulador'))

const SUB_EXPLORAR: EnlaceSub[] = [
  { ruta: '/explorar/historias', etiqueta: 'estructura.sub.historias' },
  { ruta: '/explorar/observatorio', etiqueta: 'estructura.sub.observatorio' },
]
const SUB_APRENDER: EnlaceSub[] = [
  { ruta: '/aprender/fundamentos', etiqueta: 'estructura.sub.fundamentos' },
  { ruta: '/aprender/laboratorio', etiqueta: 'estructura.sub.laboratorio' },
  { ruta: '/aprender/recorrido', etiqueta: 'estructura.sub.recorrido' },
]

/** `/` es Inicio; con `?historia=` (enlaces viejos de Historias) lleva a `/explorar/historias` con la misma query. */
function InicioONaveg() {
  const { search } = useLocation()
  if (new URLSearchParams(search).has('historia')) return <Redirigir a="/explorar/historias" />
  return (
    <LimiteError>
      <Suspense fallback={<Cargando />}>
        <Inicio />
      </Suspense>
    </LimiteError>
  )
}

export default function App() {
  const { t } = useT()
  return (
    <Routes>
      <Route element={<Estructura />}>
        <Route index element={<InicioONaveg />} />
        <Route path="explorar" element={<SeccionConSub enlaces={SUB_EXPLORAR} etiqueta="estructura.sub.explorar" />}>
          <Route index element={<Redirigir a="/explorar/historias" />} />
          <Route
            path="historias"
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
        </Route>
        <Route
          path="simular"
          element={
            <LimiteError>
              <Suspense fallback={<Cargando />}>
                <Simulador />
              </Suspense>
            </LimiteError>
          }
        />
        <Route path="aprender" element={<SeccionConSub enlaces={SUB_APRENDER} etiqueta="estructura.sub.aprender" />}>
          <Route index element={<Redirigir a="/aprender/fundamentos" />} />
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
        </Route>
        <Route path="observatorio" element={<Redirigir a="/explorar/observatorio" />} />
        <Route path="simulador" element={<Redirigir a="/simular" />} />
        <Route path="laboratorio" element={<Redirigir a="/aprender/laboratorio" />} />
        <Route path="recorrido" element={<Redirigir a="/aprender/recorrido" />} />
        <Route path="fundamentos" element={<Redirigir a="/aprender/fundamentos" />} />
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

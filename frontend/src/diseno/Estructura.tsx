import type { ComponentType } from 'react'
import { NavLink, Outlet, useSearchParams } from 'react-router-dom'
import { BandaDemostracion } from './BandaDemostracion'
import { IconoHistorias, IconoLaboratorio, IconoObservatorio, IconoRecorrido, IconoSimulador } from './iconos'
import { Marca } from './marca'

interface Destino {
  ruta: string
  etiqueta: string
  etiquetaCorta: string
  Icono: ComponentType
  fin?: boolean
}

/** Solo destinos que existen (docs/diseno.md §7). Se añaden con cada pantalla nueva. */
const DESTINOS: Destino[] = [
  { ruta: '/', etiqueta: 'Historias', etiquetaCorta: 'Historias', Icono: IconoHistorias, fin: true },
  { ruta: '/observatorio', etiqueta: 'Observatorio', etiquetaCorta: 'Observ.', Icono: IconoObservatorio },
  { ruta: '/laboratorio', etiqueta: 'Laboratorio del radar', etiquetaCorta: 'Lab.', Icono: IconoLaboratorio },
  { ruta: '/simulador', etiqueta: 'Simulador de eventos', etiquetaCorta: 'Simul.', Icono: IconoSimulador },
  { ruta: '/recorrido', etiqueta: 'Recorrido guiado', etiquetaCorta: 'Tour', Icono: IconoRecorrido },
]

/** Riel de 50 px (escritorio, tablet) o barra inferior (< 700 px) más el lienzo con la banda arriba. */
export function Estructura() {
  // `?incrustado=1`: pantalla dentro del recorrido; sin riel (la banda de demostración se queda).
  const incrustado = useSearchParams()[0].get('incrustado') === '1'
  return (
    <div className="estructura">
      {!incrustado && <nav className="riel" aria-label="Principal">
        <span className="riel__marca" role="img" aria-label="NISAR · Ecuador">
          <Marca />
        </span>
        <ul className="riel__lista">
          {DESTINOS.map(({ ruta, etiqueta, etiquetaCorta, Icono, fin }) => (
            <li key={ruta}>
              <NavLink to={ruta} end={fin} className="riel__destino" aria-label={etiqueta} title={etiqueta}>
                {({ isActive }) => (
                  <>
                    <Icono />
                    <span className="riel__etiqueta">
                      {etiquetaCorta}
                      {isActive && <span className="riel__linea riel__linea--etiqueta" aria-hidden="true" />}
                    </span>
                    {isActive && <span className="riel__linea riel__linea--riel" aria-hidden="true" />}
                  </>
                )}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>}
      <div className={incrustado ? 'lienzo lienzo--incrustado' : 'lienzo'}>
        <BandaDemostracion />
        <main className="lienzo__contenido">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

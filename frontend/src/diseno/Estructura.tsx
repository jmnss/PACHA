import type { ComponentType } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { BandaDemostracion } from './BandaDemostracion'
import { IconoHistorias, IconoObservatorio } from './iconos'
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
]

/** Riel de 50 px (escritorio, tablet) o barra inferior (< 700 px) más el lienzo con la banda arriba. */
export function Estructura() {
  return (
    <div className="estructura">
      <nav className="riel" aria-label="Principal">
        <span className="riel__marca" role="img" aria-label="NISAR · Ecuador">
          <Marca />
        </span>
        <ul className="riel__lista">
          {DESTINOS.map(({ ruta, etiqueta, etiquetaCorta, Icono, fin }) => (
            <li key={ruta}>
              <NavLink to={ruta} end={fin} className="riel__destino" aria-label={etiqueta} title={etiqueta}>
                <Icono />
                <span className="riel__etiqueta">{etiquetaCorta}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
      <div className="lienzo">
        <BandaDemostracion />
        <main className="lienzo__contenido">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

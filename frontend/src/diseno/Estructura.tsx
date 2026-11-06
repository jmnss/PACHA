import { useEffect, useRef, type ComponentType } from 'react'
import { NavLink, Outlet, useLocation, useSearchParams } from 'react-router-dom'
import { marcarNavegacion } from '../estado/navegacion'
import { AvisoTraduccion } from '../idioma/AvisoTraduccion'
import { SelectorIdioma } from '../idioma/SelectorIdioma'
import type { Clave } from '../idioma/traductor'
import { useT } from '../idioma/useT'
import { BandaDemostracion } from './BandaDemostracion'
import { IconoHistorias, IconoLaboratorio, IconoLibro, IconoObservatorio, IconoRecorrido, IconoSimulador } from './iconos'
import { Marca } from './marca'

interface Destino {
  ruta: string
  etiqueta: Clave
  etiquetaCorta: Clave
  Icono: ComponentType
  fin?: boolean
}

/** Solo destinos que existen (docs/diseno.md §7). Se añaden con cada pantalla nueva. */
const DESTINOS: Destino[] = [
  { ruta: '/', etiqueta: 'estructura.riel.historias', etiquetaCorta: 'estructura.riel.historias_corto', Icono: IconoHistorias, fin: true },
  { ruta: '/observatorio', etiqueta: 'estructura.riel.observatorio', etiquetaCorta: 'estructura.riel.observatorio_corto', Icono: IconoObservatorio },
  { ruta: '/laboratorio', etiqueta: 'estructura.riel.laboratorio', etiquetaCorta: 'estructura.riel.laboratorio_corto', Icono: IconoLaboratorio },
  { ruta: '/simulador', etiqueta: 'estructura.riel.simulador', etiquetaCorta: 'estructura.riel.simulador_corto', Icono: IconoSimulador },
  { ruta: '/recorrido', etiqueta: 'estructura.riel.recorrido', etiquetaCorta: 'estructura.riel.recorrido_corto', Icono: IconoRecorrido },
  { ruta: '/fundamentos', etiqueta: 'estructura.riel.fundamentos', etiquetaCorta: 'estructura.riel.fundamentos_corto', Icono: IconoLibro },
]

/** ¿La app corre dentro de un iframe (el recorrido)? Así el modo incrustado sobrevive a la navegación interna. */
function dentroDeMarco(): boolean {
  try { return window.self !== window.top } catch { return true }
}

/** Riel de 50 px (escritorio, tablet) o barra inferior (< 700 px) más el lienzo con la banda arriba. */
export function Estructura() {
  const { t } = useT()
  // `?incrustado=1`: pantalla dentro del recorrido; sin riel (la banda de demostración se queda).
  const incrustado = useSearchParams()[0].get('incrustado') === '1' || dentroDeMarco()
  // Al cambiar de ruta (no en la carga inicial) la cabecera de la nueva pantalla recibe el foco.
  const { pathname } = useLocation()
  const rutaPrevia = useRef(pathname)
  useEffect(() => {
    if (rutaPrevia.current === pathname) return
    rutaPrevia.current = pathname
    if (!incrustado) marcarNavegacion()
  }, [pathname, incrustado])
  const saltar = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault()
    document.getElementById('contenido')?.focus()
  }
  return (
    <div className="estructura">
      <a href="#contenido" className="saltar" onClick={saltar}>{t('a11y.saltar')}</a>
      {!incrustado && <nav className="riel" aria-label={t('estructura.riel.principal')}>
        <span className="riel__marca" role="img" aria-label="NISAR · Ecuador">
          <Marca />
        </span>
        <ul className="riel__lista">
          {DESTINOS.map(({ ruta, etiqueta, etiquetaCorta, Icono, fin }) => (
            <li key={ruta}>
              <NavLink to={ruta} end={fin} className="riel__destino" title={t(etiqueta)}>
                {({ isActive }) => (
                  <>
                    <Icono />
                    <span className="solo-lectores">{t(etiqueta)}</span>
                    <span className="riel__etiqueta" aria-hidden="true">
                      {t(etiquetaCorta)}
                      {isActive && <span className="riel__linea riel__linea--etiqueta" aria-hidden="true" />}
                    </span>
                    {isActive && <span className="riel__linea riel__linea--riel" aria-hidden="true" />}
                  </>
                )}
              </NavLink>
            </li>
          ))}
          {/* Al pie del riel en escritorio; séptimo elemento de la barra inferior en móvil. */}
          <li className="riel__idioma"><SelectorIdioma /></li>
        </ul>
      </nav>}
      <div className={incrustado ? 'lienzo lienzo--incrustado' : 'lienzo'}>
        <BandaDemostracion />
        <AvisoTraduccion />
        <main id="contenido" tabIndex={-1} className="lienzo__contenido">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

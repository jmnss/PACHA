import { useEffect, useRef, type ComponentType } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { useIncrustado } from '../estado/useIncrustado'
import { marcarNavegacion } from '../estado/navegacion'
import { AvisoTraduccion } from '../idioma/AvisoTraduccion'
import { SelectorIdioma } from '../idioma/SelectorIdioma'
import type { Clave } from '../idioma/traductor'
import { useT } from '../idioma/useT'
import { AvisoMotor } from './AvisoMotor'
import { IconoInicio, IconoLibro, IconoObservatorio, IconoSimulador } from './iconos'
import { Marca } from './marca'

interface Destino {
  ruta: string
  etiqueta: Clave
  Icono: ComponentType
  fin?: boolean
}

/** Los cuatro destinos (docs/diseno.md §7); Explorar y Aprender tienen su subnavegación dentro. */
const DESTINOS: Destino[] = [
  { ruta: '/', etiqueta: 'estructura.riel.inicio', Icono: IconoInicio, fin: true },
  { ruta: '/explorar', etiqueta: 'estructura.riel.explorar', Icono: IconoObservatorio },
  { ruta: '/simular', etiqueta: 'estructura.riel.simular', Icono: IconoSimulador },
  { ruta: '/aprender', etiqueta: 'estructura.riel.aprender', Icono: IconoLibro },
]

/** Riel con texto (escritorio, tablet) o barra inferior (< 700 px) más el lienzo con la banda arriba. */
export function Estructura() {
  const { t } = useT()
  // `?incrustado=1`: pantalla dentro del recorrido; sin riel (la banda de demostración se queda).
  const incrustado = useIncrustado()
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
        <span className="riel__marca">
          <Marca />
          <span className="riel__nombre">PACHA</span>
        </span>
        <ul className="riel__lista">
          {DESTINOS.map(({ ruta, etiqueta, Icono, fin }) => (
            <li key={ruta}>
              <NavLink to={ruta} end={fin} className="riel__destino"
                onClick={() => { if (ruta === pathname) marcarNavegacion() }}>
                <Icono />
                <span className="riel__etiqueta">{t(etiqueta)}</span>
                <span className="riel__linea" aria-hidden="true" />
              </NavLink>
            </li>
          ))}
          {/* Al pie del riel en escritorio; séptimo elemento de la barra inferior en móvil. */}
          <li className="riel__idioma"><SelectorIdioma /></li>
        </ul>
      </nav>}
      <div className={incrustado ? 'lienzo lienzo--incrustado' : 'lienzo'}>
        {!incrustado && <AvisoMotor />}
        <AvisoTraduccion />
        <main id="contenido" tabIndex={-1} className="lienzo__contenido">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

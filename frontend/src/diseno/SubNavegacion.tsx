import { NavLink } from 'react-router-dom'
import type { Clave } from '../idioma/traductor'
import { useT } from '../idioma/useT'

export interface EnlaceSub {
  ruta: string
  etiqueta: Clave
}

/** Un nivel de subnavegación dentro de Explorar o Aprender: enlaces de navegación, no pestañas (docs/diseno.md §7). */
export function SubNavegacion({ enlaces, etiqueta }: { enlaces: EnlaceSub[]; etiqueta: Clave }) {
  const { t } = useT()
  return (
    <nav className="subnav" aria-label={t(etiqueta)}>
      {enlaces.map((e) => (
        <NavLink key={e.ruta} to={e.ruta} className="subnav__enlace">{t(e.etiqueta)}</NavLink>
      ))}
    </nav>
  )
}

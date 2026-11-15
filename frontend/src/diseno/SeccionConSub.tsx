import { Outlet } from 'react-router-dom'
import { useIncrustado } from '../estado/useIncrustado'
import type { Clave } from '../idioma/traductor'
import { Migas } from './Migas'
import { SubNavegacion, type EnlaceSub } from './SubNavegacion'

/** Ruta de diseño de Explorar o Aprender: subnavegación de un nivel y, debajo, la pantalla elegida. */
export function SeccionConSub({ enlaces, etiqueta, migas = false }: { enlaces: EnlaceSub[]; etiqueta: Clave; migas?: boolean }) {
  const incrustado = useIncrustado()
  return (
    <>
      {!incrustado && <SubNavegacion enlaces={enlaces} etiqueta={etiqueta} />}
      {migas && !incrustado && <Migas />}
      <Outlet />
    </>
  )
}

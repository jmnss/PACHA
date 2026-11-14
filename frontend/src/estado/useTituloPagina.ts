import { useEffect } from 'react'
import type { Clave } from '../idioma/traductor'
import { useT } from '../idioma/useT'

/** `document.title` = «<Pantalla> · NISAR Ecuador»; se actualiza al cambiar de idioma. */
export function useTituloPagina(clave: Clave): void {
  const { t } = useT()
  const titulo = `${t(clave)} · NISAR Ecuador`
  useEffect(() => { document.title = titulo }, [titulo])
}

import type { Valores } from './interpolar'
import { useT } from './useT'

interface Props {
  texto: string
  clave?: string | null
  valores?: Valores | null
}

/** Texto que viene de la API: traducido si su clave existe; si no, en español marcado con lang="es". */
export function TextoApi({ texto, clave, valores }: Props) {
  const { idioma, t, textoApi } = useT()
  const r = textoApi(texto, clave, valores)
  if (r.traducido) return <>{r.texto}</>
  return (
    <span lang="es" title={idioma === 'es' ? undefined : t('idioma.sin_traducir')}>
      {r.texto}
    </span>
  )
}

import { clavesApi, valorMetrica } from './clavesApi'
import type { Valores } from './interpolar'
import { TextoApi } from './TextoApi'
import { useT } from './useT'

/** Métrica de la API (`Metrica`, `MetricaEventoDto`): su `clave_texto` es la base; el campo se añade. */
export interface MetricaApi {
  etiqueta: string
  valor: string
  ayuda?: string | null
  clave_texto?: string | null
  valores_texto?: Valores | null
}

export function EtiquetaMetrica({ m }: { m: MetricaApi }) {
  return <TextoApi texto={m.etiqueta} clave={clavesApi.metrica(m.clave_texto, 'etiqueta')} valores={m.valores_texto} />
}

export function AyudaMetrica({ m }: { m: MetricaApi }) {
  if (!m.ayuda) return null
  return <TextoApi texto={m.ayuda} clave={clavesApi.metrica(m.clave_texto, 'ayuda')} valores={m.valores_texto} />
}

/** Valor con las cifras a la manera del idioma activo; sin clave, el texto de la API tal cual. */
export function ValorMetrica({ m }: { m: MetricaApi }) {
  const { t, formatoNumero } = useT()
  // Sin clave: una cifra se ve tal cual; si trae palabras, es texto de la API en español.
  if (!m.clave_texto) return /\p{L}{4,}/u.test(m.valor) ? <TextoApi texto={m.valor} /> : <>{m.valor}</>
  return <>{valorMetrica(m.valor, m.valores_texto, formatoNumero, { mil: t('api.valor.mil'), personas: t('api.valor.personas') })}</>
}

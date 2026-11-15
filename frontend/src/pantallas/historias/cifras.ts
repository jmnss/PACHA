import type { Escenario, ResultadoCambio } from '../../api/consultas'
import type { Origen } from '../../diseno/origen'
import type { MetricaApi } from '../../idioma/MetricaApi'
import type { ClavePaso, ContenidoHistoria } from './contenido/tipos'

/**
 * La cifra visible de cada paso. Solo ELIGE un número que ya calculó la API (un punto de su serie, una de sus
 * métricas o el número de pasadas del escenario); no calcula nada. Si la fase 2 aún no trae la cifra, `por_llegar`.
 */
export type Cifra =
  | { tipo: 'serie'; valor: number; unidad: string; instante: string; origen: Origen }
  | { tipo: 'metrica'; metrica: MetricaApi; unidad: string; origen: Origen }
  | { tipo: 'pasadas'; n: number; origen: Origen }
  | { tipo: 'por_llegar' }
  | { tipo: 'sin_dato' }

/** Métricas del incendio por su clave de texto (las de embalse aún no traen clave: se eligen por su unidad). */
const METRICA_INCENDIO: Partial<Record<ClavePaso, string>> = {
  satelite: 'api.obs.metrica.area_quemada_detectada',
  simular: 'api.obs.metrica.area_quemada_simulada_verdad_sintetica',
  impactos: 'api.obs.metrica.co2_emitido_estimado',
}

function puntoEn(r: ResultadoCambio, instante: string | undefined): Cifra {
  const serie = r.series[0]
  const t = instante ? Date.parse(instante) : NaN
  const p = serie?.puntos.find((q) => Date.parse(q[0]) === t)
  return serie && p && instante ? { tipo: 'serie', valor: p[1], unidad: serie.unidad, instante, origen: serie.origen } : { tipo: 'sin_dato' }
}

function metrica(r: ResultadoCambio, m: ResultadoCambio['metricas'][number] | undefined): Cifra {
  return m ? { tipo: 'metrica', metrica: m, unidad: m.unidad, origen: r.origen } : { tipo: 'sin_dato' }
}

export function cifraDePaso(
  c: ContenidoHistoria, paso: ClavePaso, esc: Escenario, r: ResultadoCambio | undefined,
  antes: string | undefined, despues: string | undefined,
): Cifra | null {
  if (c.historiaApi === 'incendio') {
    if (paso === 'datos') return { tipo: 'pasadas', n: esc.adquisiciones.length, origen: esc.origen }
    if (!r) return null
    return metrica(r, r.metricas.find((m) => m.clave_texto === METRICA_INCENDIO[paso]))
  }
  if (paso === 'simular') return { tipo: 'por_llegar' }
  if (!r) return null
  if (paso === 'datos') return puntoEn(r, antes)
  if (paso === 'satelite') return puntoEn(r, despues)
  return metrica(r, r.metricas.find((m) => m.unidad === '%'))
}

/** Qué muestra el comparador en cada paso: la máscara del equipo (si el escenario la tiene) o la señal del radar. */
export function vistaDePaso(c: ContenidoHistoria, paso: ClavePaso, esc: Escenario): 'mascara' | 'radar' {
  if (c.historiaApi !== 'embalse' || paso === 'satelite') return 'radar'
  return esc.variables.includes('mascara') ? 'mascara' : 'radar'
}

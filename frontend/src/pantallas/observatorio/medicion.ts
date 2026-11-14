import type { CapaDto, Medicion } from '../../api/consultas'
import type { Cuadrante, Punto } from '../../comparador/Comparador'
import { aCsv, type Celda } from '../../exportar/csv'
import { formatoNumero } from '../../graficos/formato'
import type { CodigoIdioma } from '../../idioma/idiomas'
import { textoClave, type TextoClaveApi } from '../../idioma/clavesApi'
import { etiquetaMetricaTexto, unidadTexto, valorMetricaTexto } from '../../idioma/metricaTexto'
import { traductor, type Clave, type T } from '../../idioma/traductor'
import { crearContexto, type ContextoIdioma } from '../../idioma/useT'

const CTX_ES = crearContexto('es', () => {})
const DECIMALES_URL = 4
const redondear = (n: number) => Number(n.toFixed(DECIMALES_URL))

function numeros(texto: string, cuantos: number): number[] | null {
  const partes = texto.split(',')
  if (partes.length !== cuantos) return null
  const n = partes.map((p) => (p.trim() === '' ? NaN : Number(p)))
  return n.every((v) => Number.isFinite(v) && v >= 0 && v <= 1) ? n : null
}

/** `p=x,y` de la URL (0–1); lo inválido se ignora. */
export function leerPunto(texto: string): Punto | null {
  const n = numeros(texto, 2)
  return n ? [n[0], n[1]] : null
}

/** `c=x0,y0,x1,y1` de la URL (0–1, con área); lo inválido se ignora. */
export function leerCuadrante(texto: string): Cuadrante | null {
  const n = numeros(texto, 4)
  return n && n[0] < n[2] && n[1] < n[3] ? [n[0], n[1], n[2], n[3]] : null
}

export const textoPunto = (p: Punto) => p.map(redondear).join(',')
export const textoCuadrante = (c: Cuadrante) => c.map(redondear).join(',')

const grados = (v: number, positivo: string, negativo: string, idioma: CodigoIdioma) => `${formatoNumero(Math.abs(v), 3, idioma)}° ${v >= 0 ? positivo : negativo}`

/** Latitud y longitud aproximadas de una posición normalizada (x → este, y = 0 al norte) dentro de un bbox [oeste, sur, este, norte]. */
export function coordenadasAprox(bbox: readonly number[], [x, y]: Punto, t: T = traductor('es').t, idioma: CodigoIdioma = 'es'): { lat: number; lon: number; texto: string } {
  const lon = bbox[0] + x * (bbox[2] - bbox[0])
  const lat = bbox[3] - y * (bbox[3] - bbox[1])
  return { lat, lon, texto: `${grados(lat, t('obs.medicion.hem_n'), t('obs.medicion.hem_s'), idioma)}, ${grados(lon, t('obs.medicion.hem_e'), t('obs.medicion.hem_o'), idioma)}` }
}

/** Cabeceras del CSV en el idioma de quien llama (las líneas `# origen: …` siguen en español). */
export function columnasCsv(t: T = traductor('es').t): string[] {
  return [t('obs.medicion.csv_apartado'), t('obs.medicion.csv_concepto'), t('obs.medicion.col_medida'), t('obs.metricas.col_valor'), t('obs.medicion.col_pct')]
}

/** Filas del CSV de una medición: primero las métricas (resumen) y luego la tabla detallada. Las claves son las cabeceras de `columnasCsv`.
 * Etiquetas, capas, medidas y valores van en el idioma del contexto cuando la API trae su clave. */
export function filasCsv(m: Medicion, ctx: ContextoIdioma = CTX_ES): Record<string, Celda>[] {
  const { t, textoApi } = ctx
  const [apartado, concepto, medida, valor, pct] = columnasCsv(t)
  const resumen = m.metricas.map((x) => {
    const v = valorMetricaTexto(x, ctx)
    return { [apartado]: t('obs.medicion.csv_resumen'), [concepto]: etiquetaMetricaTexto(x, ctx), [medida]: '', [valor]: x.unidad ? `${v} ${unidadTexto(x.unidad, ctx)}` : v, [pct]: null }
  })
  const celda = (texto: unknown, tc: TextoClaveApi | null | undefined) => {
    if (typeof texto !== 'string') return texto as Celda
    const x = textoClave(tc)
    return textoApi(texto, x.clave, x.valores, x.decimales).texto
  }
  const detalle = m.tabla.map((f, r) => ({
    [apartado]: t('obs.medicion.csv_detalle'),
    [concepto]: celda(f['Capa'], m.textos?.[r]?.['Capa']),
    [medida]: celda(f['Medida'] ?? '', m.textos?.[r]?.['Medida']),
    [valor]: celda(f['Valor'], m.textos?.[r]?.['Valor']),
    [pct]: f['% del cuadrante'],
  }))
  return [...resumen, ...detalle]
}

export const csvDeMedicion = (m: Medicion, ctx: ContextoIdioma = CTX_ES, idioma?: CodigoIdioma) => aCsv(filasCsv(m, ctx), columnasCsv(ctx.t), m.origen, idioma)

const limpio = (t: string) => t.replace(/[^A-Za-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '')
export function nombreCsv(escenario: string, antes: string, despues: string): string {
  return `medicion_${limpio(escenario)}_${limpio(antes)}_a_${limpio(despues)}.csv`
}

const NOMBRES: Record<string, Clave> = {
  fase_interferometrica: 'obs.variable.fase_interferometrica',
  coherencia_interferometrica: 'obs.variable.coherencia_interferometrica',
  desplazamiento_los: 'obs.variable.desplazamiento_los',
  desplazamiento_los_acumulado: 'obs.variable.desplazamiento_los_acumulado',
  desplazamiento_los_desenrollado: 'obs.variable.desplazamiento_los_desenrollado',
  velocidad_vertical: 'obs.variable.velocidad_vertical',
  error_frente_a_la_verdad_sintetica: 'obs.variable.error_frente_a_la_verdad_sintetica',
  cambio_de_inundacion: 'obs.variable.cambio_de_inundacion',
  cambio_por_parcela: 'obs.variable.cambio_por_parcela',
  cambio_de_velocidad: 'obs.variable.cambio_de_velocidad',
  cambio_del_frente: 'obs.variable.cambio_del_frente',
  area_quemada_detectada: 'obs.variable.area_quemada_detectada',
}
/** Nombre legible de una variable del contrato: las conocidas en el idioma activo; si no, guiones bajos por espacios y mayúscula inicial (en español). */
export function nombreVariable(variable: string, t: T = traductor('es').t): string {
  if (variable === 'sigma0') return 'σ⁰'
  if (NOMBRES[variable]) return t(NOMBRES[variable])
  const txt = variable.replace(/_/g, ' ')
  return txt.charAt(0).toUpperCase() + txt.slice(1)
}

/** Nombre de una capa para el selector «Ver». */
export const etiquetaCapa = (c: CapaDto, t: T = traductor('es').t) => nombreVariable(c.variable, t)

/** Polarización que menciona una fila de la tabla de medición («σ⁰ HV · 24/04/2026»), si alguna. */
export function polarizacionMedida(m: Medicion): string | null {
  for (const f of m.tabla) {
    const hit = /σ⁰ (HH|HV|VH|VV)\b/.exec(String(f['Capa'] ?? ''))
    if (hit) return hit[1]
  }
  return null
}

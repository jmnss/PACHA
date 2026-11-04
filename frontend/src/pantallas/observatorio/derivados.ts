import type { CapaDto, Contexto, ResultadoCambio } from '../../api/consultas'
import { esReal } from '../../diseno/origen'
import { coloresDeCategorias, rampaDePaleta, type ColorCategoria, type NombreRampa } from '../../diseno/rampas'
import type { Temporada } from '../../tiempo/CintaPasadas'
import { formatearFecha } from '../../tiempo/fechas'
import { formatoNumero } from '../../graficos/formato'

/** Pasada anterior (la última que no supera el instante) y siguiente (la primera posterior). */
export function vecinas(ts: number[], ms: number): { anterior: number | null; siguiente: number | null } {
  let anterior: number | null = null
  let siguiente: number | null = null
  for (const t of ts) {
    if (t <= ms && (anterior === null || t > anterior)) anterior = t
    if (t > ms && (siguiente === null || t < siguiente)) siguiente = t
  }
  return { anterior, siguiente }
}

/** Índice de la pasada anterior o igual al instante (la que el reloj llama «anterior»); la primera si el instante precede a todas. */
export function indiceAnterior(ts: number[], ms: number): number {
  let mejor = -1
  for (let i = 0; i < ts.length; i++) if (ts[i] <= ms && (mejor < 0 || ts[i] > ts[mejor])) mejor = i
  if (mejor >= 0) return mejor
  let primera = 0
  for (let i = 1; i < ts.length; i++) if (ts[i] < ts[primera]) primera = i
  return primera
}

/** Índices (antes, después) distintos y ordenados; con valores inválidos, primera y última pasada. */
export function parejaValida(a: number, d: number, n: number): [number, number] {
  return a >= 0 && d >= 0 && a < d ? [a, d] : [0, Math.max(0, n - 1)]
}

const esLluviosa = (t: string) => t.toLowerCase().startsWith('lluv')

/** Temporada («Lluviosa», «Seca») del mes de un instante, según la climatología del contexto. */
export function temporadaDelMes(ctx: Contexto | null | undefined, ms: number): string | null {
  if (!ctx || !Number.isFinite(ms)) return null
  const mes = new Date(ms).getUTCMonth() + 1
  return ctx.clima_mensual.find((m) => m.mes_num === mes)?.temporada ?? null
}

/** Franjas de temporada lluviosa entre dos instantes, unidas por meses consecutivos. */
export function temporadasLluviosas(ctx: Contexto | null | undefined, t0: number, t1: number): Temporada[] {
  if (!ctx || !Number.isFinite(t0) || !Number.isFinite(t1) || t1 < t0) return []
  const inicio = new Date(t0)
  const franjas: Temporada[] = []
  let actual: Temporada | null = null
  for (let a = inicio.getUTCFullYear(), m = inicio.getUTCMonth(); Date.UTC(a, m, 1) <= t1; m++) {
    if (m > 11) { m = 0; a++ }
    const ini = Date.UTC(a, m, 1)
    const fin = Date.UTC(a, m + 1, 1)
    const llueve = esLluviosa(ctx.clima_mensual.find((x) => x.mes_num === m + 1)?.temporada ?? '')
    if (llueve) {
      if (actual) actual.fin = new Date(fin).toISOString()
      else { actual = { inicio: new Date(ini).toISOString(), fin: new Date(fin).toISOString(), tipo: 'lluviosa' }; franjas.push(actual) }
    } else actual = null
  }
  return franjas
}

/** Rampa y colores de categoría de una capa de la API (códigos directos: k → color k−1). */
export function estiloDeCapa(capa: CapaDto): { rampa: NombreRampa; categorias?: readonly ColorCategoria[] } {
  if (capa.paleta === 'categorias') {
    return { rampa: 'gris', categorias: coloresDeCategorias(capa.variable, capa.leyenda?.length ?? 0) }
  }
  return { rampa: rampaDePaleta(capa.paleta, capa.variable) ?? 'gris' }
}

function decimales(a: number, b: number): number {
  const m = Math.max(Math.abs(a), Math.abs(b))
  return m < 0.1 ? 3 : m < 1 ? 2 : 1
}

function masCercano(puntos: [string, number, string][], t: number): number | null {
  let mejor: [string, number, string] | null = null
  for (const p of puntos) {
    if (mejor === null || Math.abs(Date.parse(p[0]) - t) < Math.abs(Date.parse(mejor[0]) - t)) mejor = p
  }
  return mejor ? mejor[1] : null
}

/**
 * Hallazgo CALCULADO con la primera serie del resultado, entre las pasadas «antes» y «después».
 * Mientras el origen no sea real se redacta como ejemplo («En este escenario de demostración, …»).
 */
export function hallazgo(r: ResultadoCambio | undefined, antes: string, despues: string): string | null {
  const serie = r?.series[0]
  if (!serie || serie.puntos.length === 0) return null
  const etiqueta = serie.puntos[0][2]
  const propios = serie.puntos.filter((p) => p[2] === etiqueta)
  const a = masCercano(propios, Date.parse(antes))
  const b = masCercano(propios, Date.parse(despues))
  const fa = formatearFecha(antes)
  const fb = formatearFecha(despues)
  if (a === null || b === null || !fa || !fb) return null
  const d = decimales(a, b)
  // «Detectada» frente a «verdad del modelo» es la misma magnitud dos veces: no se rotula.
  const etiquetas = new Set(serie.puntos.map((p) => p[2]))
  const hayVarias = etiquetas.size > 1 && ![...etiquetas].some((e) => /verdad/i.test(e))
  const nombre = serie.titulo.charAt(0).toLowerCase() + serie.titulo.slice(1)
  const sujeto = hayVarias ? `${nombre} (${etiqueta.charAt(0).toLowerCase()}${etiqueta.slice(1)})` : nombre
  const verbo = b < a ? 'baja' : b > a ? 'sube' : 'se mantiene'
  const trayecto = b === a ? `en ${formatoNumero(a, d)}` : `de ${formatoNumero(a, d)} a ${formatoNumero(b, d)}`
  const unidad = serie.unidad ? ` ${serie.unidad}` : ''
  const frase = `${sujeto} ${verbo} ${trayecto}${unidad} entre el ${fa} y el ${fb}`
  return esReal(r.origen) ? `${frase.charAt(0).toUpperCase()}${frase.slice(1)}.` : `En este escenario de demostración, ${frase}.`
}

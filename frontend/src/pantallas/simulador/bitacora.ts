import type { EventoDto, MundoDto } from '../../api/simulador'
import type { Origen } from '../../diseno/origen'
import { aCsv, type Celda } from '../../exportar/csv'
import type { CodigoIdioma } from '../../idioma/idiomas'
import type { Valores } from '../../idioma/interpolar'
import { es } from '../../idioma/catalogos/es'
import { clavesApi } from '../../idioma/clavesApi'
import { cifrasEnIdioma } from '../../idioma/metricaTexto'
import { traductor, type Clave, type T } from '../../idioma/traductor'
import { crearContexto, type ContextoIdioma } from '../../idioma/useT'

const ES = traductor('es').t
const CTX_ES = crearContexto('es', () => {})

export interface EntradaBitacora {
  /** Título en español; las entradas nuevas guardan además su clave y valores para mostrarlo en cada idioma. */
  titulo: string
  titulo_clave?: string | null
  titulo_valores?: Valores | null
  /** Frase en español de las entradas antiguas; las nuevas guardan `lat`, `lon` y `region` y la arman al mostrar. */
  lugar: string
  lat?: number
  lon?: number
  region?: string
  /** Temporada en español (`api.contexto.temporada.*`): se traduce al mostrarla por su clave derivada. */
  temporada: string
  area_km2: number | null
  expuestos: number | null
  victimas: number | null
  perdidas_musd: number | null
  deteccion: string
  /** Consulta de la URL que recrea el evento. */
  enlace: string
}

const CLAVE = 'nisar.simulador.bitacora'
export const MAX_BITACORA = 50

/** «4.050° S, 79.250° O» en el idioma del traductor (O/W según idioma). */
export const coordenadas = (lat: number, lon: number, t: T): string =>
  t('sim.coords', {
    lat: Math.abs(lat).toFixed(3), ns: t(lat >= 0 ? 'sim.coords.norte' : 'sim.coords.sur'),
    lon: Math.abs(lon).toFixed(3), eo: t('sim.coords.oeste'),
  })

const redondear = (v: number | null | undefined, dec = 0) => (v == null ? null : Math.round(v * 10 ** dec) / 10 ** dec)

export function entradaDeEvento(e: EventoDto, m: MundoDto, enlace: string): EntradaBitacora {
  const r = e.resumen
  return {
    titulo: e.titulo,
    titulo_clave: e.clave_texto ?? null,
    titulo_valores: e.valores_texto ?? null,
    lugar: `${coordenadas(e.lat, e.lon, ES)} · ${m.region}`,
    lat: e.lat,
    lon: e.lon,
    region: m.region,
    temporada: m.temporada ?? '—',
    area_km2: redondear(r.area_km2, 2),
    expuestos: redondear(r.expuestos),
    victimas: redondear(r.victimas),
    perdidas_musd: r.perdidas_usd == null ? null : redondear(r.perdidas_usd / 1e6, 1),
    deteccion: e.metricas_radar[0]?.valor ?? '—',
    enlace,
  }
}

/** La bitácora vive solo en el navegador; si no hay almacenamiento, el simulador sigue sin ella. */
export function leerBitacora(): EntradaBitacora[] {
  try {
    const crudo = localStorage.getItem(CLAVE)
    const v: unknown = crudo ? JSON.parse(crudo) : []
    return Array.isArray(v) ? (v as EntradaBitacora[]).slice(-MAX_BITACORA) : []
  } catch { return [] }
}

export function guardarBitacora(entradas: EntradaBitacora[]): void {
  try { localStorage.setItem(CLAVE, JSON.stringify(entradas.slice(-MAX_BITACORA))) } catch { /* solo una comodidad */ }
}

/** Clave y cifras de un título en español de la bitácora (entradas antiguas, sin `titulo_clave`): se prueba contra
 * las plantillas `api.sim.titulo.*` del catálogo `es`. Cada `{x}` casa un número con coma decimal, salvo `{volcan}`,
 * que es texto. Si ninguna encaja, `null`: el título queda en español. */
export function reconocerTitulo(tituloEs: string): { clave: string; valores: Record<string, number | string> } | null {
  const escapar = (t: string) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  for (const [clave, plantilla] of Object.entries(es)) {
    if (!clave.startsWith('api.sim.titulo.')) continue
    const nombres: string[] = []
    const patron = plantilla.split(/\{(\w+)\}/).map((p, k) => {
      if (k % 2 === 0) return escapar(p)
      nombres.push(p)
      return p === 'volcan' ? '([^·]+?)' : '(\\d+(?:,\\d+)?)'
    }).join('')
    const m = new RegExp(`^${patron}$`).exec(tituloEs)
    if (!m) continue
    return { clave, valores: Object.fromEntries(nombres.map((n, k) => [n, n === 'volcan' ? m[k + 1] : Number(m[k + 1].replace(',', '.'))])) }
  }
  return null
}

export const COLUMNAS_BITACORA = ['Evento', 'Lugar', 'Temporada', 'Área (km²)', 'Expuestos', 'Víctimas', 'Pérdidas (M USD)', 'Detección del radar'] as const
export type ColumnaBitacora = (typeof COLUMNAS_BITACORA)[number]

const ETIQUETAS: Record<ColumnaBitacora, Clave> = {
  'Evento': 'sim.bitacora.col_evento', 'Lugar': 'sim.bitacora.col_lugar', 'Temporada': 'sim.bitacora.col_temporada',
  'Área (km²)': 'sim.bitacora.col_area', 'Expuestos': 'sim.bitacora.col_expuestos', 'Víctimas': 'sim.bitacora.col_victimas',
  'Pérdidas (M USD)': 'sim.bitacora.col_perdidas', 'Detección del radar': 'sim.bitacora.col_deteccion',
}
/** Encabezado de una columna en el idioma del traductor (la clave de la columna sigue en español). */
export const etiquetaColumna = (c: ColumnaBitacora, t: T = ES): string => t(ETIQUETAS[c])

/** Clave y cifras con que se traduce el título de una entrada: las que guardó o, si es antigua, las que reconoce. */
export function claveDeTitulo(e: Pick<EntradaBitacora, 'titulo' | 'titulo_clave' | 'titulo_valores'>): { clave: string | null; valores: Valores | null } {
  if (e.titulo_clave) return { clave: e.titulo_clave, valores: e.titulo_valores ?? null }
  const r = reconocerTitulo(e.titulo)
  return r ? { clave: r.clave, valores: r.valores } : { clave: null, valores: null }
}

/** Título de una entrada en el idioma del contexto; sin clave, el español guardado. */
export const tituloTexto = (e: Pick<EntradaBitacora, 'titulo' | 'titulo_clave' | 'titulo_valores'>, ctx: ContextoIdioma = CTX_ES): string => {
  const { clave, valores } = claveDeTitulo(e)
  return ctx.textoApi(e.titulo, clave, valores).texto
}

/** Región («Costa») y temporada («Lluviosa») en el idioma del contexto; lo que no tiene traducción queda en español. */
export const regionTexto = (region: string, ctx: ContextoIdioma = CTX_ES): string => ctx.textoApi(region, clavesApi.contexto('region', region)).texto
export const temporadaTexto = (temporada: string, ctx: ContextoIdioma = CTX_ES): string => ctx.textoApi(temporada, clavesApi.contexto('temporada', temporada)).texto

/** Lugar como texto plano: las entradas nuevas lo arman con el contexto; las antiguas conservan su frase. */
export const lugarTexto = (e: EntradaBitacora, ctx: ContextoIdioma = CTX_ES): string =>
  e.lat !== undefined && e.lon !== undefined && e.region !== undefined ? `${coordenadas(e.lat, e.lon, ctx.t)} · ${regionTexto(e.region, ctx)}` : e.lugar

export const filasBitacora = (entradas: EntradaBitacora[], ctx: ContextoIdioma = CTX_ES): Record<ColumnaBitacora, Celda>[] => entradas.map((e) => ({
  'Evento': tituloTexto(e, ctx), 'Lugar': lugarTexto(e, ctx), 'Temporada': temporadaTexto(e.temporada, ctx), 'Área (km²)': e.area_km2, 'Expuestos': e.expuestos,
  'Víctimas': e.victimas, 'Pérdidas (M USD)': e.perdidas_musd, 'Detección del radar': cifrasEnIdioma(e.deteccion, ctx),
}))

/** CSV con las líneas de origen al principio (todo lo del simulador es sintético). Las líneas de máquina
 * siguen en español; las columnas y los textos van en el idioma del contexto. */
export function csvBitacora(entradas: EntradaBitacora[], origen: Origen, ctx: ContextoIdioma = CTX_ES, idioma?: CodigoIdioma): string {
  const columnas = COLUMNAS_BITACORA.map((c) => etiquetaColumna(c, ctx.t))
  const filas = filasBitacora(entradas, ctx).map((f) => Object.fromEntries(COLUMNAS_BITACORA.map((c, k) => [columnas[k], f[c]])))
  return aCsv(filas, columnas, origen, idioma)
}

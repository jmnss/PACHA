import type { components } from '../../api/tipos'

export type Catalogo = components['schemas']['CatalogoDto']
export interface CiudadFundada { nombre: string; lat: number; lon: number; habitantes: number }
export type ValorParametro = number | string | boolean

/** Todo lo que define un escenario del simulador; viaja en la URL para poder compartirlo. */
export interface EstadoSimulador {
  lat: number
  lon: number
  /** Lado del mundo en km. */
  ext: number
  fecha: string
  /** Relieve real (SRTM) o sintético. */
  dem: boolean
  /** Herramienta elegida. */
  h: string
  /** Celda donde se desató el evento (fila, columna) o null. */
  i: number | null
  j: number | null
  p: Record<string, ValorParametro>
  ciudades: CiudadFundada[]
}

export const EXTENSIONES = [20, 30, 40, 60, 80, 120]
export const HERRAMIENTAS = ['incendio', 'tormenta', 'inundacion', 'terremoto', 'erupcion', 'ciudad']
export const MALLA = 128
export const MAX_CIUDADES = 8

/** Mundo de partida: bosques secos de Loja con un incendio (fecha fija: el enlace es determinista). */
export const ESTADO_INICIAL: EstadoSimulador = {
  lat: -4.05, lon: -79.25, ext: 30, fecha: '2026-08-15', dem: true, h: 'incendio', i: null, j: null, p: {}, ciudades: [],
}

const CLAVE_PARAM = /^[a-z][a-z0-9_]{0,23}$/
const num = (s: string | undefined): number | null => {
  if (s === undefined || s.trim() === '') return null
  const n = Number(s)
  return Number.isFinite(n) ? n : null
}
const entre = (n: number | null, a: number, b: number): n is number => n !== null && n >= a && n <= b
const fechaValida = (s: string) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false
  const d = new Date(`${s}T00:00:00Z`)
  return !Number.isNaN(d.getTime()) && d.toISOString().startsWith(s)
}

function leerParametros(crudo: string | null): Record<string, ValorParametro> {
  const salida: Record<string, ValorParametro> = {}
  if (!crudo) return salida
  for (const par of crudo.split(',').slice(0, 16)) {
    const [k, v] = par.split(':')
    if (!k || v === undefined || !CLAVE_PARAM.test(k)) continue
    let valor: ValorParametro
    if (v === 'true' || v === 'false') valor = v === 'true'
    else if (v !== '' && Number.isFinite(Number(v))) valor = Number(v)
    else {
      try { valor = decodeURIComponent(v).slice(0, 40) } catch { continue }
    }
    salida[k] = valor
  }
  return salida
}

function leerCiudades(crudo: string | null): CiudadFundada[] {
  if (!crudo) return []
  const salida: CiudadFundada[] = []
  for (const trozo of crudo.split(';').slice(0, MAX_CIUDADES)) {
    const [nombre, lat, lon, hab] = trozo.split(':')
    const [la, lo, h] = [num(lat), num(lon), num(hab)]
    if (!nombre || nombre.length > 40 || !entre(la, -6, 2) || !entre(lo, -93, -75) || !entre(h, 1000, 1_000_000)) continue
    try { salida.push({ nombre: decodeURIComponent(nombre), lat: la, lon: lo, habitantes: Math.round(h) }) } catch { /* se ignora */ }
  }
  return salida
}

/** Lee la URL; cualquier valor inválido o ausente cae al del estado inicial. */
export function leerEstado(q: URLSearchParams): EstadoSimulador {
  const d = ESTADO_INICIAL
  const lat = num(q.get('lat') ?? undefined)
  const lon = num(q.get('lon') ?? undefined)
  const ext = num(q.get('ext') ?? undefined)
  const fecha = q.get('fecha') ?? ''
  const h = q.get('h') ?? ''
  const i = num(q.get('i') ?? undefined)
  const j = num(q.get('j') ?? undefined)
  const celda = Number.isInteger(i) && Number.isInteger(j) && entre(i, 0, MALLA - 1) && entre(j, 0, MALLA - 1)
  return {
    lat: entre(lat, -6, 2) ? lat : d.lat,
    lon: entre(lon, -93, -75) ? lon : d.lon,
    ext: ext !== null && EXTENSIONES.includes(ext) ? ext : d.ext,
    fecha: fechaValida(fecha) ? fecha : d.fecha,
    dem: q.get('dem') === '0' ? false : true,
    h: HERRAMIENTAS.includes(h) ? h : d.h,
    i: celda ? (i as number) : null,
    j: celda ? (j as number) : null,
    p: leerParametros(q.get('p')),
    ciudades: leerCiudades(q.get('c')),
  }
}

const codificar = (v: ValorParametro) => (typeof v === 'string' ? encodeURIComponent(v).replace(/[:,;]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`) : String(v))

/** Cadena de consulta (sin «?») con lo que difiere del estado inicial. */
export function escribirEstado(e: EstadoSimulador): string {
  const q = new URLSearchParams()
  const d = ESTADO_INICIAL
  if (e.lat !== d.lat) q.set('lat', String(e.lat))
  if (e.lon !== d.lon) q.set('lon', String(e.lon))
  if (e.ext !== d.ext) q.set('ext', String(e.ext))
  if (e.fecha !== d.fecha) q.set('fecha', e.fecha)
  if (!e.dem) q.set('dem', '0')
  if (e.h !== d.h) q.set('h', e.h)
  if (e.i !== null && e.j !== null) { q.set('i', String(e.i)); q.set('j', String(e.j)) }
  const p = Object.entries(e.p)
  if (p.length) q.set('p', p.map(([k, v]) => `${k}:${codificar(v)}`).join(','))
  if (e.ciudades.length) q.set('c', e.ciudades.map((c) => `${encodeURIComponent(c.nombre).replace(/[:;]/g, (x) => `%${x.charCodeAt(0).toString(16).toUpperCase()}`)}:${c.lat}:${c.lon}:${c.habitantes}`).join(';'))
  return q.toString()
}

/** Deja solo los parámetros que existen en el catálogo de la herramienta y caen en su rango. */
export function sanearParametros(herramienta: string, p: Record<string, ValorParametro>, catalogo: Catalogo): Record<string, ValorParametro> {
  const controles = catalogo.herramientas.find((x) => x.id === herramienta)?.controles ?? []
  const salida: Record<string, ValorParametro> = {}
  for (const [k, v] of Object.entries(p)) {
    const c = controles.find((x) => x.id === k)
    if (!c) continue
    if (c.tipo === 'numero' && typeof v === 'number' && c.minimo !== null && c.maximo !== null && v >= c.minimo && v <= c.maximo) salida[k] = v
    else if (c.tipo === 'seleccion' && typeof v === 'string' && c.opciones?.includes(v)) salida[k] = v
    else if (c.tipo === 'interruptor' && typeof v === 'boolean') salida[k] = v
    else if (c.tipo === 'texto' && typeof v === 'string') salida[k] = v.slice(0, 40)
  }
  return salida
}

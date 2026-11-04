import type { CapaDto, Medicion } from '../../api/consultas'
import type { Cuadrante, Punto } from '../../comparador/Comparador'
import { aCsv, type Celda } from '../../exportar/csv'
import { formatoNumero } from '../../graficos/formato'

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

const grados = (v: number, positivo: string, negativo: string) => `${formatoNumero(Math.abs(v), 3)}° ${v >= 0 ? positivo : negativo}`

/** Latitud y longitud aproximadas de una posición normalizada (x → este, y = 0 al norte) dentro de un bbox [oeste, sur, este, norte]. */
export function coordenadasAprox(bbox: readonly number[], [x, y]: Punto): { lat: number; lon: number; texto: string } {
  const lon = bbox[0] + x * (bbox[2] - bbox[0])
  const lat = bbox[3] - y * (bbox[3] - bbox[1])
  return { lat, lon, texto: `${grados(lat, 'N', 'S')}, ${grados(lon, 'E', 'O')}` }
}

export const COLUMNAS_CSV = ['Apartado', 'Concepto', 'Medida', 'Valor', '% del cuadrante']

/** Filas del CSV de una medición: primero las métricas (resumen) y luego la tabla detallada. */
export function filasCsv(m: Medicion): Record<string, Celda>[] {
  const resumen = m.metricas.map((x) => ({
    Apartado: 'Resumen', Concepto: x.etiqueta, Medida: '', Valor: x.unidad ? `${x.valor} ${x.unidad}` : x.valor, '% del cuadrante': null,
  }))
  const detalle = m.tabla.map((f) => ({
    Apartado: 'Detalle', Concepto: f['Capa'], Medida: f['Medida'] ?? '', Valor: f['Valor'], '% del cuadrante': f['% del cuadrante'],
  }))
  return [...resumen, ...detalle]
}

export const csvDeMedicion = (m: Medicion) => aCsv(filasCsv(m), COLUMNAS_CSV, m.origen)

const limpio = (t: string) => t.replace(/[^A-Za-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '')
export function nombreCsv(escenario: string, antes: string, despues: string): string {
  return `medicion_${limpio(escenario)}_${limpio(antes)}_a_${limpio(despues)}.csv`
}

const NOMBRES: Record<string, string> = { sigma0: 'σ⁰' }
/** Nombre legible de una variable del contrato («cambio_de_inundacion» → «Cambio de inundación» no se puede inventar: se separa por guiones bajos). */
export function nombreVariable(variable: string): string {
  if (NOMBRES[variable]) return NOMBRES[variable]
  const t = variable.replace(/_/g, ' ')
  return t.charAt(0).toUpperCase() + t.slice(1)
}

/** Nombre de una capa para el selector «Ver»: la leyenda no lo trae, se deriva de la variable. */
export const etiquetaCapa = (c: CapaDto) => nombreVariable(c.variable)

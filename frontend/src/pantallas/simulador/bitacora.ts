import type { EventoDto, MundoDto } from '../../api/simulador'
import type { Origen } from '../../diseno/origen'
import { aCsv } from '../../exportar/csv'

export interface EntradaBitacora {
  titulo: string
  lugar: string
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

const redondear = (v: number | null | undefined, dec = 0) => (v == null ? null : Math.round(v * 10 ** dec) / 10 ** dec)

export function entradaDeEvento(e: EventoDto, m: MundoDto, enlace: string): EntradaBitacora {
  const r = e.resumen
  return {
    titulo: e.titulo,
    lugar: `${Math.abs(e.lat).toFixed(3)}° ${e.lat >= 0 ? 'N' : 'S'}, ${Math.abs(e.lon).toFixed(3)}° O · ${m.region}`,
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

export const COLUMNAS_BITACORA = ['Evento', 'Lugar', 'Temporada', 'Área (km²)', 'Expuestos', 'Víctimas', 'Pérdidas (M USD)', 'Detección del radar'] as const

export const filasBitacora = (es: EntradaBitacora[]) => es.map((e) => ({
  'Evento': e.titulo, 'Lugar': e.lugar, 'Temporada': e.temporada, 'Área (km²)': e.area_km2, 'Expuestos': e.expuestos,
  'Víctimas': e.victimas, 'Pérdidas (M USD)': e.perdidas_musd, 'Detección del radar': e.deteccion,
}))

/** CSV con las líneas de origen al principio (todo lo del simulador es sintético). */
export function csvBitacora(es: EntradaBitacora[], origen: Origen): string {
  return aCsv(filasBitacora(es), [...COLUMNAS_BITACORA], origen)
}

import type { Clave } from '../../idioma/traductor'

export type IdLugar = 'daule' | 'casitagua' | 'mazar'

export interface Lugar {
  id: IdLugar
  /** Centro del `bbox` de `data/<tema>/<sitio>/sitio.json` (lugares.test.ts lo comprueba). */
  lon: number
  lat: number
  /** Posición en el perfil (% del ancho y del alto) y largo de la guía de la cartela. */
  perfil: { x: number; y: number; guia: number; derecha?: boolean }
  enlace: string
  claveIr: Clave
}

/** Escenario de la API de cada lugar. */
export const ESCENARIO_DE: Record<IdLugar, string> = {
  daule: 'embalse-daule-peripa', casitagua: 'incendio-casitagua', mazar: 'embalse-mazar',
}

export const LUGARES: readonly Lugar[] = [
  { id: 'daule', lon: -79.4250, lat: -0.9450, perfil: { x: 27.6, y: 87, guia: 64 },
    enlace: '/explorar/historias?historia=embalses&sitio=daule-peripa', claveIr: 'inicio.lugar.ir_embalse' },
  { id: 'casitagua', lon: -78.5150, lat: -0.0300, perfil: { x: 56.4, y: 36.6, guia: 58 },
    enlace: '/explorar/historias?historia=incendio', claveIr: 'inicio.lugar.ir_incendio' },
  { id: 'mazar', lon: -78.6450, lat: -2.6751, perfil: { x: 72.8, y: 53, guia: 34, derecha: true },
    enlace: '/explorar/historias?historia=embalses&sitio=mazar', claveIr: 'inicio.lugar.ir_embalse' },
]

// Proyección lineal de docs/propuestas/comun/ecuador.svg (geoBoundaries): dos esquinas conocidas del contorno.
const SX = (591.3 - 11.7) / (-75.18859 + 81.0814)
const SY = (611.8 - 13.0) / (1.45962 + 5.01147)
export const proyectar = (lon: number, lat: number): [number, number] =>
  [11.7 + (lon + 81.0814) * SX, 13.0 + (1.45962 - lat) * SY]

/** Unos 240 km (docs/nisar-verificado.md: «swath width of about 240 km») en unidades del localizador. */
export const ANCHO_FRANJA = (240 / 111.32) * SX

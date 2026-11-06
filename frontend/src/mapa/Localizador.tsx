import { useMemo } from 'react'
import { elementos } from './datos'
import type { Bbox } from './MapaBase'

type Anillo = number[][]

/** Anillos exteriores del contorno continental (se omiten las islas Galápagos, lejos al oeste). */
function anillosContinentales(): Anillo[] {
  const polis = elementos('contorno').features.flatMap((f) =>
    f.geometry.type === 'Polygon' ? [f.geometry.coordinates as Anillo[]]
      : f.geometry.type === 'MultiPolygon' ? (f.geometry.coordinates as Anillo[][]) : [])
  return polis.map((p) => p[0]).filter((a) => a.some(([lon]) => lon > -84))
}

const ANCHO = 80

/**
 * Localizador de Ecuador: la silueta del país con un punto donde está el escenario. Sirve cuando el mapa
 * base no carga (a escala de escenario el fondo es gris) y siempre para ubicarse. Decorativo para lectores
 * de pantalla: la ubicación ya está en el nombre del escenario.
 */
export function Localizador({ bbox }: { bbox: Bbox }) {
  const forma = useMemo(() => {
    const anillos = anillosContinentales()
    const pts = anillos.flat()
    if (!pts.length) return null
    const lons = pts.map((p) => p[0]), lats = pts.map((p) => p[1])
    const [o, e, s, n] = [Math.min(...lons), Math.max(...lons), Math.min(...lats), Math.max(...lats)]
    const k = ANCHO / (e - o)
    const alto = (n - s) * k
    const x = (lon: number) => (lon - o) * k
    const y = (lat: number) => (n - lat) * k
    const d = anillos.map((a) => 'M' + a.map(([lon, lat]) => `${x(lon).toFixed(1)} ${y(lat).toFixed(1)}`).join('L') + 'Z').join('')
    return { d, alto, x, y }
  }, [])
  if (!forma) return null
  const cx = forma.x((bbox[0] + bbox[2]) / 2)
  const cy = forma.y((bbox[1] + bbox[3]) / 2)
  return (
    <svg className="localizador" width={ANCHO} height={forma.alto} viewBox={`0 0 ${ANCHO} ${forma.alto}`} aria-hidden="true" focusable="false">
      <path className="localizador__pais" d={forma.d} />
      <circle className="localizador__punto" cx={cx} cy={cy} r={3} />
    </svg>
  )
}

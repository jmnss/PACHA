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
let formaPais: ReturnType<typeof calcularForma> | undefined

function calcularForma() {
  const anillos = anillosContinentales()
  let o = Infinity, e = -Infinity, s = Infinity, n = -Infinity
  for (const a of anillos) for (const [lon, lat] of a) {
    if (lon < o) o = lon
    if (lon > e) e = lon
    if (lat < s) s = lat
    if (lat > n) n = lat
  }
  if (!Number.isFinite(o)) return null
  const k = ANCHO / (e - o)
  const x = (lon: number) => (lon - o) * k
  const y = (lat: number) => (n - lat) * k
  const d = anillos.map((a) => 'M' + a.map(([lon, lat]) => `${x(lon).toFixed(1)} ${y(lat).toFixed(1)}`).join('L') + 'Z').join('')
  return { d, alto: (n - s) * k, x, y }
}

export function Localizador({ bbox }: { bbox: Bbox }) {
  const forma = useMemo(() => (formaPais === undefined ? (formaPais = calcularForma()) : formaPais), [])
  if (!forma) return null
  const cx = forma.x((bbox[0] + bbox[2]) / 2)
  const cy = forma.y((bbox[1] + bbox[3]) / 2)
  // Fuera de la silueta continental (islas, escenario simulado fuera del país) no se dibuja un punto engañoso.
  const dentro = cx >= 0 && cx <= ANCHO && cy >= 0 && cy <= forma.alto
  return (
    <svg className="localizador" width={ANCHO} height={forma.alto} viewBox={`0 0 ${ANCHO} ${forma.alto}`} aria-hidden="true" focusable="false">
      <path className="localizador__pais" d={forma.d} />
      {dentro && <circle className="localizador__punto" cx={cx} cy={cy} r={3} />}
    </svg>
  )
}

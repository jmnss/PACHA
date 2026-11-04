import { elementos } from './datos'

type Anillo = number[][]
type Poligono = Anillo[]

function enAnillo(lon: number, lat: number, anillo: Anillo): boolean {
  let dentro = false
  for (let i = 0, j = anillo.length - 1; i < anillo.length; j = i++) {
    const [xi, yi] = anillo[i], [xj, yj] = anillo[j]
    if (yi > lat !== yj > lat && lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) dentro = !dentro
  }
  return dentro
}

/** Primer anillo = exterior; los demás, huecos. */
function enPoligono(lon: number, lat: number, p: Poligono): boolean {
  return enAnillo(lon, lat, p[0]) && !p.slice(1).some((h) => enAnillo(lon, lat, h))
}

let poligonos: Poligono[] | null = null
function contorno(): Poligono[] {
  if (poligonos) return poligonos
  poligonos = elementos('contorno').features.flatMap((f) =>
    f.geometry.type === 'Polygon' ? [f.geometry.coordinates as Poligono]
      : f.geometry.type === 'MultiPolygon' ? (f.geometry.coordinates as Poligono[]) : [],
  )
  return poligonos
}

/** ¿El punto cae dentro del contorno de Ecuador (continente y Galápagos) del GeoJSON local? */
export function dentroDeEcuador(lat: number, lon: number): boolean {
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return false
  return contorno().some((p) => enPoligono(lon, lat, p))
}

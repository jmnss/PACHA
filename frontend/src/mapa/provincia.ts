/** Provincia que hay bajo el puntero, leída de las propiedades del GeoJSON local (`nombre` y `region`). */
export interface ProvinciaBajoPuntero {
  nombre: string
  region: string
}

type Elemento = { properties?: Record<string, unknown> | null }

export function provinciaEn(elementos: readonly Elemento[]): ProvinciaBajoPuntero | null {
  for (const f of elementos) {
    const p = f.properties
    if (p && typeof p.nombre === 'string' && p.nombre) return { nombre: p.nombre, region: typeof p.region === 'string' ? p.region : '' }
  }
  return null
}

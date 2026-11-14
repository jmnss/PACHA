/**
 * Ciudades de respaldo para el mapa sin red (los mapas base de Esri traen sus propias etiquetas).
 * Fuente: conocimiento geográfico general (capitales de las 24 provincias y algunas ciudades grandes);
 * coordenadas aproximadas del centro urbano, verificar contra una fuente oficial (p. ej. INEC) antes de citarlas.
 * `rango` 1 = siempre visible, 2 = desde un zoom medio, 3 = solo al acercar.
 */
export interface Ciudad {
  nombre: string
  lat: number
  lon: number
  rango: 1 | 2 | 3
}

export const CIUDADES: readonly Ciudad[] = [
  { nombre: 'Quito', lat: -0.1807, lon: -78.4678, rango: 1 },
  { nombre: 'Guayaquil', lat: -2.1894, lon: -79.8891, rango: 1 },
  { nombre: 'Cuenca', lat: -2.9001, lon: -79.0059, rango: 1 },
  { nombre: 'Ambato', lat: -1.2491, lon: -78.6167, rango: 2 },
  { nombre: 'Riobamba', lat: -1.6636, lon: -78.6546, rango: 2 },
  { nombre: 'Ibarra', lat: 0.3517, lon: -78.1223, rango: 2 },
  { nombre: 'Esmeraldas', lat: 0.9592, lon: -79.6539, rango: 2 },
  { nombre: 'Santo Domingo', lat: -0.2530, lon: -79.1754, rango: 2 },
  { nombre: 'Portoviejo', lat: -1.0546, lon: -80.4545, rango: 2 },
  { nombre: 'Manta', lat: -0.9500, lon: -80.7100, rango: 2 },
  { nombre: 'Machala', lat: -3.2581, lon: -79.9554, rango: 2 },
  { nombre: 'Loja', lat: -3.9931, lon: -79.2042, rango: 2 },
  { nombre: 'Latacunga', lat: -0.9346, lon: -78.6155, rango: 3 },
  { nombre: 'Guaranda', lat: -1.5920, lon: -79.0010, rango: 3 },
  { nombre: 'Tulcán', lat: 0.8119, lon: -77.7173, rango: 3 },
  { nombre: 'Babahoyo', lat: -1.8022, lon: -79.5344, rango: 3 },
  { nombre: 'Quevedo', lat: -1.0225, lon: -79.4604, rango: 3 },
  { nombre: 'Milagro', lat: -2.1345, lon: -79.5940, rango: 3 },
  { nombre: 'Azogues', lat: -2.7397, lon: -78.8486, rango: 3 },
  { nombre: 'Macas', lat: -2.3087, lon: -78.1167, rango: 3 },
  { nombre: 'Puyo', lat: -1.4824, lon: -77.9961, rango: 3 },
  { nombre: 'Tena', lat: -0.9938, lon: -77.8129, rango: 3 },
  { nombre: 'Coca', lat: -0.4667, lon: -76.9873, rango: 3 },
  { nombre: 'Nueva Loja', lat: 0.0847, lon: -76.8950, rango: 3 },
  { nombre: 'Zamora', lat: -4.0692, lon: -78.9567, rango: 3 },
  { nombre: 'Santa Elena', lat: -2.2267, lon: -80.8590, rango: 3 },
  { nombre: 'Puerto Ayora', lat: -0.7430, lon: -90.3150, rango: 3 },
  // Capital de Galápagos (Puerto Baquerizo Moreno, ~-0,90 / -89,61): el contorno local está simplificado y
  // deja ese punto en el mar, así que se rotula la isla en su centro aproximado.
  { nombre: 'Isla San Cristóbal', lat: -0.8300, lon: -89.4300, rango: 3 },
]

/** Ciudades visibles a un zoom dado: pocas con el país entero, todas al acercar. */
export function ciudadesVisibles(zoom: number): Ciudad[] {
  const maxRango = zoom < 7 ? 1 : zoom < 8.5 ? 2 : 3
  return CIUDADES.filter((c) => c.rango <= maxRango)
}

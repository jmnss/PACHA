/**
 * Pareja de pasadas por defecto de una historia: la API no recomienda un intervalo, así que se elige con los
 * datos del propio escenario. Criterio: sobre la primera serie del resultado (su primera etiqueta, como el
 * hallazgo), la pareja ordenada (antes < después) con mayor diferencia absoluta; a igualdad, la más temprana.
 * Con la inundación eso lleva a «pico de la crecida frente a la pasada más seca»; con el incendio, a «antes del
 * fuego frente a la primera pasada tras el fuego». Si no hay criterio fiable, devuelve null (primera y última).
 */
export function parejaDeMayorCambio(
  puntos: [string, number, string][] | undefined,
  pasadas: { instante: string }[],
): [number, number] | null {
  if (!puntos || puntos.length === 0 || pasadas.length < 2) return null
  const etiqueta = puntos[0][2]
  const ts = pasadas.map((p) => Date.parse(p.instante))
  const valores: (number | null)[] = ts.map(() => null)
  for (const [fecha, v, e] of puntos) {
    if (e !== etiqueta || !Number.isFinite(v)) continue
    const t = Date.parse(fecha)
    let i = 0
    for (let k = 1; k < ts.length; k++) if (Math.abs(ts[k] - t) < Math.abs(ts[i] - t)) i = k
    valores[i] = v
  }
  let mejor: [number, number] | null = null
  let dif = 0
  for (let i = 0; i < valores.length; i++) {
    for (let j = i + 1; j < valores.length; j++) {
      const a = valores[i], b = valores[j]
      if (a === null || b === null) continue
      const d = Math.abs(b - a)
      if (d > dif + 1e-9) { dif = d; mejor = [i, j] }
    }
  }
  return mejor
}

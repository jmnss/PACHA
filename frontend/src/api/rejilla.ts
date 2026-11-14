import type { components } from './tipos'

export type Rejilla = components['schemas']['Rejilla']

/** Decodifica `datos_b64` a uint8 (0 = sin dato, 1..255 lineal entre vmin y vmax). */
export function decodificarRejilla(r: Rejilla): Uint8Array {
  let binario: string
  try {
    binario = atob(r.datos_b64)
  } catch {
    throw new Error('La rejilla recibida no es válida: datos base64 corruptos.')
  }
  const esperado = r.filas * r.columnas
  if (!Number.isInteger(esperado) || esperado < 0 || binario.length !== esperado) {
    throw new Error(
      `La rejilla recibida no es válida: se esperaban ${r.filas}×${r.columnas} = ${esperado} valores y llegaron ${binario.length}.`,
    )
  }
  const datos = new Uint8Array(esperado)
  for (let i = 0; i < esperado; i++) datos[i] = binario.charCodeAt(i)
  return datos
}

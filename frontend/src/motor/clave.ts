/** Clave canónica de una petición a la API y su hash (sin dependencias del navegador: la usa también Node). */

function ordenar(valor: unknown): unknown {
  if (Array.isArray(valor)) return valor.map(ordenar)
  if (valor && typeof valor === 'object') {
    const o = valor as Record<string, unknown>
    return Object.fromEntries(Object.keys(o).sort().map((k) => [k, ordenar(o[k])]))
  }
  return valor
}

/** `METODO ruta?consulta` (consulta ordenada por nombre) + `\n` + JSON del cuerpo con claves ordenadas. */
export function claveDePeticion(metodo: string, ruta: string, cuerpo: unknown): string {
  const i = ruta.indexOf('?')
  const camino = i < 0 ? ruta : ruta.slice(0, i)
  const parametros = new URLSearchParams(i < 0 ? '' : ruta.slice(i + 1))
  parametros.sort()
  const consulta = parametros.toString()
  const json = cuerpo === undefined || cuerpo === null ? '' : JSON.stringify(ordenar(cuerpo))
  return `${metodo.toUpperCase()} ${camino}${consulta ? `?${consulta}` : ''}\n${json}`
}

/** SHA-256 en hexadecimal minúsculas. */
export async function hashClave(clave: string): Promise<string> {
  const huella = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(clave))
  return Array.from(new Uint8Array(huella), (b) => b.toString(16).padStart(2, '0')).join('')
}

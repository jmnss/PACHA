/** Cliente mínimo de la API: fetch a /api con errores tipados en español. */

export class ErrorApi extends Error {
  readonly estado: number
  readonly mensaje: string
  readonly reintentable: boolean

  constructor(estado: number, mensaje: string, reintentable: boolean) {
    super(mensaje)
    this.name = 'ErrorApi'
    this.estado = estado
    this.mensaje = mensaje
    this.reintentable = reintentable
  }
}

export const MENSAJE_RED = 'No se pudo conectar con el servidor.'
const MENSAJE_GENERICO = 'El servidor no pudo completar la solicitud.'

async function mensajeDelServidor(r: Response): Promise<string | null> {
  try {
    const cuerpo: unknown = await r.json()
    if (cuerpo && typeof cuerpo === 'object' && 'mensaje' in cuerpo) {
      const m = (cuerpo as { mensaje: unknown }).mensaje
      if (typeof m === 'string' && m.trim()) return m
    }
  } catch {
    // cuerpo vacío o no JSON: se usa el mensaje genérico
  }
  return null
}

/** GET sin cuerpo; POST con JSON si se pasa `cuerpo`. */
export async function llamar<T>(ruta: string, cuerpo?: unknown): Promise<T> {
  const url = ruta.startsWith('/api') ? ruta : `/api${ruta.startsWith('/') ? '' : '/'}${ruta}`
  let r: Response
  try {
    r = await fetch(
      url,
      cuerpo === undefined
        ? { method: 'GET' }
        : {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(cuerpo),
          },
    )
  } catch {
    throw new ErrorApi(0, MENSAJE_RED, true)
  }
  if (!r.ok) {
    const delServidor = await mensajeDelServidor(r)
    const mensaje = delServidor ?? MENSAJE_GENERICO
    throw new ErrorApi(r.status, mensaje, r.status >= 500)
  }
  try {
    return (await r.json()) as T
  } catch {
    throw new ErrorApi(r.status, 'La respuesta del servidor no es válida.', false)
  }
}

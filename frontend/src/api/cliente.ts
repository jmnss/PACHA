/** Cliente mínimo de la API: fetch a /api con errores tipados en español. */
import { es } from '../idioma/catalogos/es'
import type { Valores } from '../idioma/interpolar'
import { transporteNavegador, type Transporte } from '../motor/transporte'
import { traductor, type Clave, type T } from '../idioma/traductor'

export class ErrorApi extends Error {
  readonly estado: number
  readonly mensaje: string
  readonly reintentable: boolean
  readonly clave: string | null
  readonly valores: Valores | null

  constructor(estado: number, mensaje: string, reintentable: boolean, clave: string | null = null, valores: Valores | null = null) {
    super(mensaje)
    this.name = 'ErrorApi'
    this.estado = estado
    this.mensaje = mensaje
    this.reintentable = reintentable
    this.clave = clave
    this.valores = valores
  }
}

const ES = traductor('es').t
/** Texto en español de «sin conexión»; los llamadores antiguos lo usan hasta migrar a `mensajeDeError`. */
export const MENSAJE_RED = ES('exportar.error.red')
const MENSAJE_GENERICO = ES('exportar.error.generico')

interface CuerpoError {
  mensaje: string | null
  clave: string | null
  valores: Valores | null
}

async function cuerpoDelServidor(r: Response): Promise<CuerpoError> {
  const vacio: CuerpoError = { mensaje: null, clave: null, valores: null }
  try {
    const cuerpo: unknown = await r.json()
    if (cuerpo && typeof cuerpo === 'object') {
      const c = cuerpo as { mensaje?: unknown; clave_texto?: unknown; valores_texto?: unknown }
      const valores =
        c.valores_texto && typeof c.valores_texto === 'object' && !Array.isArray(c.valores_texto)
          ? (c.valores_texto as Valores)
          : null
      return {
        mensaje: typeof c.mensaje === 'string' && c.mensaje.trim() ? c.mensaje : null,
        clave: typeof c.clave_texto === 'string' && c.clave_texto ? c.clave_texto : null,
        valores,
      }
    }
  } catch {
    // cuerpo vacío o no JSON: se usa el mensaje genérico
  }
  return vacio
}

const transporte: Transporte = import.meta.env.VITE_MOTOR === 'navegador' ? transporteNavegador : (url, init) => fetch(url, init)

/** GET sin cuerpo; POST con JSON si se pasa `cuerpo`. */
export async function llamar<T>(ruta: string, cuerpo?: unknown): Promise<T> {
  const url = ruta.startsWith('/api') ? ruta : `/api${ruta.startsWith('/') ? '' : '/'}${ruta}`
  let r: Response
  try {
    r = await transporte(
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
    throw new ErrorApi(0, MENSAJE_RED, true, 'exportar.error.red')
  }
  if (!r.ok) {
    const d = await cuerpoDelServidor(r)
    if (d.mensaje === null) throw new ErrorApi(r.status, MENSAJE_GENERICO, r.status >= 500, d.clave ?? 'exportar.error.generico', d.valores)
    throw new ErrorApi(r.status, d.mensaje, r.status >= 500, d.clave, d.valores)
  }
  try {
    return (await r.json()) as T
  } catch {
    throw new ErrorApi(r.status, ES('exportar.error.respuesta_invalida'), false, 'exportar.error.respuesta_invalida')
  }
}

/** Mensaje de un error y si quedó traducido: con `traducido: false` es el español de la API y quien lo
 * muestra lo marca con lang="es" (Review Focus 3). */
export interface MensajeError {
  texto: string
  traducido: boolean
}

/** Mensaje de un error de la API traducido si su clave es conocida (si no, el mensaje en español) o,
 * si no es de la API, el de red caída. Equivale a `textoApi(e.mensaje, e.clave, e.valores)`. */
export function mensajeDeError(e: unknown, t: T = ES): MensajeError {
  if (!(e instanceof ErrorApi)) return { texto: t('exportar.error.red'), traducido: true }
  if (e.clave && Object.prototype.hasOwnProperty.call(es, e.clave)) return { texto: t(e.clave as Clave, e.valores ?? undefined), traducido: true }
  return { texto: e.mensaje, traducido: false }
}

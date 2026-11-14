/** Transporte de `llamar()` en modo `navegador`: la petición la responde el motor (la API Python en Pyodide). */
import { es } from '../idioma/catalogos/es'
import { conBase } from '../rutaBase'
import { claveDePeticion, hashClave } from './clave'
import { motor, MotorNoDisponible, type ClienteMotor, type RespuestaMotor } from './clienteMotor'

export type Transporte = (url: string, init: RequestInit) => Promise<Response>

const CABECERAS = { 'content-type': 'application/json' }

export interface DependenciasTransporte {
  pedirAlMotor: ClienteMotor['pedir']
  cargarIndice: () => Promise<Record<string, string>>
  descargar: (hash: string) => Promise<RespuestaMotor | null>
}

/** Primero el precálculo (si el hash de la petición está en el índice); si no, el motor. */
export function crearTransporteNavegador(dep: DependenciasTransporte): Transporte {
  let indice: Promise<Record<string, string>> | null = null
  const cargarIndice = () => (indice ??= dep.cargarIndice().catch(() => ({})))
  const precalculada = async (clave: string): Promise<RespuestaMotor | null> => {
    try {
      const hash = await hashClave(clave)
      if (!Object.prototype.hasOwnProperty.call(await cargarIndice(), hash)) return null
      return await dep.descargar(hash)
    } catch {
      return null
    }
  }
  return async (url, init) => {
    const metodo = (init.method ?? 'GET').toUpperCase() === 'POST' ? 'POST' : 'GET'
    const cuerpo = typeof init.body === 'string' ? init.body : null
    let json: unknown
    try { json = cuerpo === null ? undefined : JSON.parse(cuerpo) } catch { json = cuerpo }
    const guardada = await precalculada(claveDePeticion(metodo, url, json))
    if (guardada) return new Response(guardada.cuerpo, { status: guardada.estado, headers: CABECERAS })
    try {
      const r = await dep.pedirAlMotor(metodo, url, cuerpo)
      return new Response(r.cuerpo, { status: r.estado, headers: CABECERAS })
    } catch (e) {
      if (!(e instanceof MotorNoDisponible)) throw e
      const cuerpoError = JSON.stringify({
        mensaje: es['estructura.motor.no_disponible'],
        clave_texto: 'estructura.motor.no_disponible',
      })
      return new Response(cuerpoError, { status: 503, headers: CABECERAS })
    }
  }
}

async function cargarIndice(): Promise<Record<string, string>> {
  const r = await fetch(conBase('/precalculado/indice.json'))
  if (!r.ok) throw new Error(`indice.json: ${r.status}`)
  return (await r.json()) as Record<string, string>
}

async function descargar(hash: string): Promise<RespuestaMotor | null> {
  const r = await fetch(conBase(`/precalculado/${hash}.json`))
  return r.ok ? ((await r.json()) as RespuestaMotor) : null
}

export const transporteNavegador: Transporte = crearTransporteNavegador({ pedirAlMotor: motor.pedir, cargarIndice, descargar })

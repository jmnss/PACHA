/** Transporte de `llamar()` en modo `navegador`: la petición la responde el motor (la API Python en Pyodide). */
import { es } from '../idioma/catalogos/es'
import { motor, MotorNoDisponible, type ClienteMotor } from './clienteMotor'

export type Transporte = (url: string, init: RequestInit) => Promise<Response>

const CABECERAS = { 'content-type': 'application/json' }

export function crearTransporteNavegador(dep: { pedirAlMotor: ClienteMotor['pedir'] }): Transporte {
  return async (url, init) => {
    const metodo = (init.method ?? 'GET').toUpperCase() === 'POST' ? 'POST' : 'GET'
    const cuerpo = typeof init.body === 'string' ? init.body : null
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

export const transporteNavegador: Transporte = crearTransporteNavegador({ pedirAlMotor: motor.pedir })

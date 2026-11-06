/** Cliente del motor de cálculo: crea el worker, correlaciona respuestas por id y expone su estado. */
import { useSyncExternalStore } from 'react'
import { conBase } from '../rutaBase'
import type { EstadoMotor, MensajeDelMotor, PuertoMotor } from './protocolo'

export class MotorNoDisponible extends Error {
  constructor(mensaje = 'El motor de cálculo no está disponible') {
    super(mensaje)
    this.name = 'MotorNoDisponible'
  }
}

export interface RespuestaMotor { estado: number; cuerpo: string }

export interface ClienteMotor {
  iniciar(): void
  pedir(metodo: 'GET' | 'POST', ruta: string, cuerpo: string | null): Promise<RespuestaMotor>
  estado(): EstadoMotor
  pendientes(): number
  suscribir(fn: () => void): () => void
}

interface Espera { resolver: (r: RespuestaMotor) => void; rechazar: (e: Error) => void }

export function crearClienteMotor(crearPuerto: () => PuertoMotor, motorUrl: string): ClienteMotor {
  let puerto: PuertoMotor | null = null
  let estado: EstadoMotor = 'inactivo'
  let siguienteId = 1
  const esperas = new Map<number, Espera>()
  const oyentes = new Set<() => void>()
  const avisar = () => oyentes.forEach((f) => f())

  const fallar = (detalle?: string) => {
    estado = 'error'
    const e = new MotorNoDisponible(detalle)
    esperas.forEach((w) => w.rechazar(e))
    esperas.clear()
    avisar()
  }

  const iniciar = () => {
    if (puerto) return
    try {
      puerto = crearPuerto()
    } catch (e) {
      puerto = null
      fallar(e instanceof Error ? e.message : String(e))
      return
    }
    estado = 'cargando'
    puerto.onmessage = (ev) => {
      const m: MensajeDelMotor = ev.data
      if (m.tipo === 'estado') {
        if (m.estado === 'error') fallar(m.detalle)
        else { estado = m.estado; avisar() }
      } else if (m.tipo === 'respuesta') {
        const w = esperas.get(m.id)
        if (!w) return
        esperas.delete(m.id)
        w.resolver({ estado: m.estado, cuerpo: m.cuerpo })
        avisar()
      }
    }
    puerto.onerror = (e) => fallar(e instanceof Error ? e.message : undefined)
    puerto.postMessage({ tipo: 'iniciar', motorUrl })
    avisar()
  }

  const pedir: ClienteMotor['pedir'] = (metodo, ruta, cuerpo) => {
    iniciar()
    if (estado === 'error') return Promise.reject(new MotorNoDisponible())
    const id = siguienteId++
    return new Promise<RespuestaMotor>((resolver, rechazar) => {
      esperas.set(id, { resolver, rechazar })
      puerto!.postMessage({ tipo: 'pedir', id, metodo, ruta, cuerpo })
      avisar()
    })
  }

  return {
    iniciar,
    pedir,
    estado: () => estado,
    pendientes: () => esperas.size,
    suscribir: (fn) => { oyentes.add(fn); return () => { oyentes.delete(fn) } },
  }
}

/** Un solo motor por pestaña (y entre marcos): `SharedWorker` si existe; si no, un `Worker` por documento. */
export function elegirPuerto(): PuertoMotor {
  // Vite solo empaqueta el worker si `new URL(..., import.meta.url)` va escrito dentro de la llamada.
  if (typeof SharedWorker !== 'undefined') {
    const puerto = new SharedWorker(new URL('./motor.worker.ts', import.meta.url), { type: 'module', name: 'nisar-motor' }).port
    puerto.start()
    return puerto as unknown as PuertoMotor
  }
  return new Worker(new URL('./motor.worker.ts', import.meta.url), { type: 'module' }) as unknown as PuertoMotor
}

/** Instancia de la app. */
export const motor: ClienteMotor = crearClienteMotor(
  elegirPuerto,
  new URL(conBase('/motor/'), globalThis.location?.origin ?? 'http://localhost').href,
)

/** Estado del motor para la interfaz (`esperando`: hay peticiones sin responder). */
export function useEstadoMotor(): { estado: EstadoMotor; esperando: boolean } {
  const estado = useSyncExternalStore(motor.suscribir, motor.estado)
  const pendientes = useSyncExternalStore(motor.suscribir, motor.pendientes)
  return { estado, esperando: pendientes > 0 }
}

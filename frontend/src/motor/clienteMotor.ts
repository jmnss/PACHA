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

export function crearClienteMotor(crearPuerto: () => PuertoMotor, motorUrl: string, respaldo?: () => PuertoMotor): ClienteMotor {
  let puerto: PuertoMotor | null = null
  // Si el primer puerto (SharedWorker) falla al cargar, se prueba una vez el respaldo (Worker dedicado).
  let fabrica = crearPuerto
  let quedaRespaldo = respaldo
  let estado: EstadoMotor = 'inactivo'
  let siguienteId = 1
  const esperas = new Map<number, Espera>()
  const oyentes = new Set<() => void>()
  const avisar = () => oyentes.forEach((f) => f())

  const fallar = (detalle?: string) => {
    if (quedaRespaldo && estado === 'cargando') {
      fabrica = quedaRespaldo
      quedaRespaldo = undefined
      const pendientes = [...esperas.values()]
      esperas.clear()
      try { (puerto as { close?: () => void } | null)?.close?.() } catch { /* sin cerrar */ }
      puerto = null
      estado = 'inactivo'
      iniciar()
      // Las peticiones en curso se rechazan para que la capa de datos las reintente con el motor nuevo.
      pendientes.forEach((w) => w.rechazar(new MotorNoDisponible(detalle)))
      return
    }
    estado = 'error'
    const e = new MotorNoDisponible(detalle)
    esperas.forEach((w) => w.rechazar(e))
    esperas.clear()
    avisar()
  }

  const iniciar = () => {
    if (puerto) return
    try {
      puerto = fabrica()
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
    // El nombre lleva el hash de la app Python: una pestaña nueva tras un despliegue no se engancha al motor
    // (con otra app cargada) de una pestaña vieja. Los errores de carga del worker llegan al objeto SharedWorker,
    // no a su puerto: se reenvían a `onerror` del puerto.
    const nombre = `nisar-motor-${import.meta.env.VITE_APP_HASH ?? ''}`
    const compartido = new SharedWorker(new URL('./motor.worker.ts', import.meta.url), /* @vite-ignore */ { type: 'module', name: nombre })
    const puerto = compartido.port as unknown as PuertoMotor
    compartido.onerror = (e) => puerto.onerror?.(e)
    compartido.port.start()
    return puerto
  }
  return new Worker(new URL('./motor.worker.ts', import.meta.url), { type: 'module' }) as unknown as PuertoMotor
}

/** Instancia de la app. */
export const motor: ClienteMotor = crearClienteMotor(
  elegirPuerto,
  new URL(conBase('/motor/'), globalThis.location?.origin ?? 'http://localhost').href,
  typeof SharedWorker !== 'undefined'
    ? () => new Worker(new URL('./motor.worker.ts', import.meta.url), { type: 'module' }) as unknown as PuertoMotor
    : undefined,
)

/** Estado del motor para la interfaz (`esperando`: hay peticiones sin responder). */
export function useEstadoMotor(): { estado: EstadoMotor; esperando: boolean } {
  const estado = useSyncExternalStore(motor.suscribir, motor.estado)
  const pendientes = useSyncExternalStore(motor.suscribir, motor.pendientes)
  return { estado, esperando: pendientes > 0 }
}

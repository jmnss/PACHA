/** Mensajes entre la página y el worker que ejecuta la API Python (Pyodide). */
export type EstadoMotor = 'inactivo' | 'cargando' | 'listo' | 'error'

export type MensajeAlMotor =
  | { tipo: 'iniciar'; motorUrl: string }
  | { tipo: 'pedir'; id: number; metodo: 'GET' | 'POST'; ruta: string; cuerpo: string | null }

export type MensajeDelMotor =
  | { tipo: 'estado'; estado: EstadoMotor; detalle?: string }
  | { tipo: 'respuesta'; id: number; estado: number; cuerpo: string }

export interface PuertoMotor {
  postMessage(m: MensajeAlMotor): void
  onmessage: ((e: { data: MensajeDelMotor }) => void) | null
  onerror?: ((e: unknown) => void) | null
}

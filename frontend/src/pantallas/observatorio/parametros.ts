import type { TipoCambio } from '../../api/consultas'

/** Parámetros de una simulación: solo los que difieren del valor por defecto, con los nombres de la API. */
export type Valor = number | string | boolean
export type Valores = Record<string, Valor>
export type Control = NonNullable<TipoCambio['controles']>[number]

export const ORBITAS = ['Ascendente', 'Descendente'] as const
export const SEMILLA_MAX = 2147483647

/**
 * Parámetros genéricos del simulador de demostración y sus valores por defecto: los mismos que
 * `PARAMETROS_DEMO` (datos/generador.py) y los rangos que valida `datos/proveedores/demo.py`.
 */
export const GENERICOS = {
  semilla: { defecto: 7, min: 0, max: SEMILLA_MAX },
  looks: { defecto: 12, min: 1, max: 100 },
  orbita: { defecto: 'Ascendente' as string },
  estacional: { defecto: true },
  /** Fecha del evento (AAAA-MM-DD): no tiene valor por defecto aquí; el servidor decide si coincide con el catálogo. */
  fecha_evento: { min: '2024-01-01', max: '2030-12-31' },
} as const

const MAX_PAR = 600

/** Valor por defecto de un control en las unidades que se muestran y se envían (valor × escala). */
export function defectoDe(c: Control): number {
  return redondear((c.valor_defecto ?? c.minimo ?? 0) * (c.escala ?? 1))
}

/** Quita el ruido de coma flotante de los pasos del deslizador (0.1 + 0.2). */
export function redondear(n: number): number {
  return Number(n.toFixed(6))
}

/** `AAAA-MM-DD` real (no 2026-02-30) dentro del rango que acepta el servidor. */
export function fechaValida(v: unknown): v is string {
  if (typeof v !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return false
  const d = new Date(`${v}T00:00:00Z`)
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === v && v >= GENERICOS.fecha_evento.min && v <= GENERICOS.fecha_evento.max
}

const esNumero = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v)

function valido(clave: string, v: unknown, controles: Control[]): v is Valor {
  if (clave === 'semilla') return Number.isInteger(v) && esNumero(v) && v >= 0 && v <= SEMILLA_MAX
  if (clave === 'looks') return esNumero(v) && v >= GENERICOS.looks.min && v <= GENERICOS.looks.max
  if (clave === 'orbita') return typeof v === 'string' && (ORBITAS as readonly string[]).includes(v)
  if (clave === 'estacional') return typeof v === 'boolean'
  if (clave === 'fecha_evento') return fechaValida(v)
  if (clave === 'lat') return esNumero(v) && v >= -90 && v <= 90
  if (clave === 'lon') return esNumero(v) && v >= -180 && v <= 180
  const c = controles.find((x) => x.id === clave)
  if (!c || !esNumero(v)) return false
  if (c.tipo === 'selector') return !!c.opciones?.some((o) => o.valor === v)
  if (c.tipo === 'hora') return v >= 0 && v < 24
  if (c.tipo === 'interruptor') return false
  return v >= (c.minimo ?? -Infinity) && v <= (c.maximo ?? Infinity)
}

function esDefecto(clave: string, v: Valor, controles: Control[]): boolean {
  if (clave === 'semilla' || clave === 'looks' || clave === 'orbita' || clave === 'estacional') {
    return v === GENERICOS[clave].defecto
  }
  const c = controles.find((x) => x.id === clave)
  return !!c && typeof v === 'number' && Math.abs(v - defectoDe(c)) < 1e-9
}

/** Deja solo parámetros válidos y distintos del valor por defecto (lat y lon van siempre juntos). */
export function normalizar(v: Valores, controles: Control[]): Valores {
  const salida: Valores = {}
  for (const [k, x] of Object.entries(v)) {
    if (!valido(k, x, controles)) continue
    if (k !== 'lat' && k !== 'lon' && esDefecto(k, x, controles)) continue
    salida[k] = typeof x === 'number' ? redondear(x) : x
  }
  if (!('lat' in salida && 'lon' in salida)) {
    delete salida.lat
    delete salida.lon
  }
  return salida
}

const aBase64Url = (s: string) =>
  btoa(String.fromCharCode(...new TextEncoder().encode(s))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
const deBase64Url = (s: string) => {
  const b = atob(s.replace(/-/g, '+').replace(/_/g, '/'))
  return new TextDecoder().decode(Uint8Array.from(b, (c) => c.charCodeAt(0)))
}

/** Forma compacta para la URL: JSON con claves ordenadas en base64url; vacío si no hay nada. */
export function codificar(v: Valores): string {
  const claves = Object.keys(v).sort()
  if (!claves.length) return ''
  return aBase64Url(JSON.stringify(Object.fromEntries(claves.map((k) => [k, v[k]]))))
}

/** Lee `par=` con validación estricta: texto inválido o valores fuera de rango se descartan. */
export function decodificar(texto: string, controles: Control[]): Valores {
  if (!texto || texto.length > MAX_PAR) return {}
  try {
    const crudo: unknown = JSON.parse(deBase64Url(texto))
    if (!crudo || typeof crudo !== 'object' || Array.isArray(crudo)) return {}
    return normalizar(crudo as Valores, controles)
  } catch {
    return {}
  }
}

/** Horas decimales a «HH:MM» (campo de hora) y de vuelta. */
export function horaATexto(h: number): string {
  const total = Math.round(h * 60)
  return `${String(Math.floor(total / 60) % 24).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`
}
export function textoAHora(t: string): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(t)
  if (!m) return null
  const h = Number(m[1]) + Number(m[2]) / 60
  return h >= 0 && h < 24 ? redondear(h) : null
}

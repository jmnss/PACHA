import type { CapaDto, Escenario, ParamsCapa, ResumenSitio } from '../../api/consultas'
import type { Origen } from '../../diseno/origen'
import type { ClavePaso, ContenidoHistoria } from './contenido/tipos'

/**
 * La cifra visible de cada paso. Solo ELIGE un número que ya calculó la API (`/resumen`); no calcula nada.
 * `null` = aún cargando; `undefined` = el paso no lleva cifra (Simular).
 */
export interface Cifra {
  /** Número (se formatea con `decimales`) o fecha ISO (`esFecha`). */
  valor: number | string | null
  decimales?: number
  esFecha?: boolean
  unidad: string
  /** Fecha ISO a la que se refiere la cifra (rellena `{fecha}` del rótulo). */
  fecha?: string
  origen?: Origen
  /** Fuente publicada (datos de la ficha). */
  fuente?: { nombre: string; url: string; cita: string }
}

export function cifraDePaso(c: ContenidoHistoria, paso: ClavePaso, res: ResumenSitio | undefined, pol: string | undefined): Cifra | null | undefined {
  if (paso === 'simular') return undefined
  if (!res) return null
  // El origen del resumen lleva la fecha de una sola imagen: el sello de cada cifra lleva la de la cifra (o ninguna).
  const base = res.origen as NonNullable<Origen>
  const origenEn = (fecha?: string): Origen => ({ ...base, procedencia: base.procedencia ? { ...base.procedencia, fecha: fecha ?? null, fecha_adquisicion: null } : base.procedencia })
  const sinDato: Cifra = { valor: null, unidad: '' }
  if (c.historiaApi === 'embalse') {
    if (paso === 'datos') {
      const f = res.fechas.find((x) => x.superficie_km2 != null)
      return f ? { valor: f.superficie_km2!, decimales: 2, unidad: 'km²', fecha: f.fecha, origen: origenEn(f.fecha) } : sinDato
    }
    if (paso === 'satelite') {
      for (const f of res.fechas) {
        const e = f.retrodispersion.find((r) => r.polarizacion === pol && r.mediana_clase_db != null)
        if (e) return { valor: e.mediana_clase_db!, decimales: 1, unidad: 'dB', fecha: f.fecha, origen: origenEn(f.fecha) }
      }
      return sinDato
    }
    const v = res.variacion
    return v && v.relativa_pct != null ? { valor: v.relativa_pct, decimales: 1, unidad: '%', origen: origenEn() } : sinDato
  }
  // Incendio
  if (paso === 'datos') {
    const d = res.ficha.find((x) => x.id === 'fecha_inicio')
    return d ? { valor: String(d.valor), esFecha: true, unidad: '', fuente: d.fuente } : sinDato
  }
  if (paso === 'satelite') {
    for (const f of [...res.fechas].reverse()) {
      const e = f.retrodispersion.find((r) => r.polarizacion === pol && r.mediana_clase_db != null)
      if (e) return { valor: e.mediana_clase_db!, decimales: 1, unidad: 'dB', fecha: f.fecha, origen: origenEn(f.fecha) }
    }
    return sinDato
  }
  const inc = res.incendio
  return inc ? { valor: inc.area_marcada_ha, decimales: 0, unidad: 'ha', fecha: inc.fecha, origen: origenEn(inc.fecha) } : sinDato
}

/** Lo que muestra el visor: dos capas lado a lado (por fechas o por polarizaciones) o una sola. */
export type PlanVisor =
  | { modo: 'fechas' | 'polarizaciones'; a: ParamsCapa; b: ParamsCapa }
  | { modo: 'sola'; a: ParamsCapa }

export type CapaIncendio = 'mascara' | 'delta_rfdi'

/**
 * Elige las capas del visor para un paso SOLO entre las que cada fecha tiene: la máscara donde el resumen trae
 * superficie, γ⁰ donde la adquisición trae esa polarización, ΔRFDI donde el resumen del incendio lo sitúa.
 */
export function planVisor(
  c: ContenidoHistoria, paso: ClavePaso, esc: Escenario, res: ResumenSitio | undefined, pol: string | undefined, capaIncendio: CapaIncendio,
): PlanVisor | null {
  const radar = (): PlanVisor | null => {
    const con = esc.adquisiciones.filter((a) => pol && a.polarizaciones.includes(pol))
    if (con.length >= 2) {
      return { modo: 'fechas', a: { adquisicion: con[0].id, variable: 'gamma0', polarizacion: pol }, b: { adquisicion: con[con.length - 1].id, variable: 'gamma0', polarizacion: pol } }
    }
    const una = esc.adquisiciones.find((a) => a.polarizaciones.includes('HH') && a.polarizaciones.includes('HV'))
    if (una) return { modo: 'polarizaciones', a: { adquisicion: una.id, variable: 'gamma0', polarizacion: 'HH' }, b: { adquisicion: una.id, variable: 'gamma0', polarizacion: 'HV' } }
    return null
  }
  if (!res) return null
  const conMascara = esc.variables.includes('mascara') ? res.fechas.filter((f) => f.superficie_km2 != null).map((f) => f.adquisicion_id) : []
  if (c.historiaApi === 'embalse') {
    if (paso === 'satelite') return radar()
    if (conMascara.length >= 2) {
      return { modo: 'fechas', a: { adquisicion: conMascara[0], variable: 'mascara' }, b: { adquisicion: conMascara[conMascara.length - 1], variable: 'mascara' } }
    }
    if (conMascara.length === 1) return { modo: 'sola', a: { adquisicion: conMascara[0], variable: 'mascara' } }
    return radar()
  }
  if (paso === 'impactos' && res.incendio) {
    const variable = capaIncendio === 'delta_rfdi' && esc.variables.includes('delta_rfdi') ? 'delta_rfdi' : 'mascara'
    if (variable === 'delta_rfdi' || conMascara.includes(res.incendio.adquisicion_id)) {
      return { modo: 'sola', a: { adquisicion: res.incendio.adquisicion_id, variable } }
    }
  }
  return radar()
}

const NOMBRE_VARIABLE: Record<string, string> = { sigma0: 'σ⁰', gamma0: 'γ⁰' }

/** Título de una capa de radar: «γ⁰ HV, dB». */
export function tituloCapa(c: CapaDto | undefined): string {
  if (!c) return ''
  return `${NOMBRE_VARIABLE[c.variable] ?? c.variable}${c.polarizacion ? ` ${c.polarizacion}` : ''}${c.unidad ? `, ${c.unidad}` : ''}`
}

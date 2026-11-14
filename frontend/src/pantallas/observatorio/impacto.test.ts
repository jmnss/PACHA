import { describe, expect, it } from 'vitest'
import type { Impacto } from '../../api/consultas'
import { lineasInformeImpacto } from './informeImpacto'

const base = {
  titulo: 'Superficie inundada', tipo: 'inundacion', escenario: 'La Segua', antes: '2026-04-12', despues: '2026-04-24',
  cifras: [{ etiqueta: 'Superficie inundada al final', valor: '548', unidad: 'ha', ayuda: '' }],
  lectura: ['En este escenario de demostración, el radar marca unas 548 ha.'], acciones: ['Si esto fuera un evento real, contrastar con la autoridad.'],
} as unknown as Impacto
const sintetico = { ...base, origen: { tipo: 'sintetico', fuente: 'demo', fecha_generacion: '2026-11-01T00:00:00Z' } } as Impacto
const real = { ...base, origen: { tipo: 'real', fuente: 'NISAR', fecha_generacion: '2026-11-01T00:00:00Z' } } as Impacto

describe('informe de impacto', () => {
  it('con datos sintéticos lleva siempre el aviso de ejemplo ilustrativo', () => {
    const l = lineasInformeImpacto(sintetico)
    expect(l[l.length - 1]).toMatch(/Ejemplo ilustrativo con datos de demostración/)
    expect(l[0]).toContain('La Segua')
    expect(l.some((x) => x.includes('548 ha'))).toBe(true)
  })
  it('sin sintéticos no inventa el aviso', () => {
    expect(lineasInformeImpacto(real).join('\n')).not.toMatch(/demostración: no es/)
  })
})

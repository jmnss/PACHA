import { describe, expect, it } from 'vitest'
import { formatoFecha, formatoNumero } from './formato'
import { esCodigoIdioma } from './idiomas'
import { formaPlural, interpolar } from './interpolar'
import { traductor } from './traductor'

describe('núcleo del idioma', () => {
  it('interpola valores', () => {
    expect(interpolar('Hay {n} capas de {total}', { n: 2, total: 6 })).toBe('Hay 2 capas de 6')
  })
  it('muestra — si falta un valor', () => {
    expect(interpolar('Hola {nombre}', {})).toBe('Hola —')
  })
  it('formatea números según el idioma', () => {
    expect(interpolar('{n} ha', { n: 1234.5 }, (n) => formatoNumero('es', n))).toBe('1.234,5 ha')
    expect(formatoNumero('qu', 1234.5)).toBe(formatoNumero('es', 1234.5))
  })
  it('plurales', () => {
    expect(formaPlural('es', 1)).toBe('uno')
    expect(formaPlural('en', 2)).toBe('otros')
    expect(formaPlural('qu', 1)).toBe('otros')
  })
  it('fechas', () => {
    const { t } = traductor('qu')
    expect(formatoFecha('qu', '2026-01-05', 'larga', t)).toContain(t('fecha.mes.1'))
    expect(formatoFecha('qu', '2026-01-05', 'mes-anio', t)).toBe(`${t('fecha.mes.1')} 2026`)
    expect(formatoFecha('es', '2026-01-05', 'corta', traductor('es').t)).toBe('2026-01-05')
    expect(formatoFecha('en', '2026-01-05', 'larga', traductor('en').t)).toContain('January')
  })
  it('traductor', () => {
    expect(traductor('en').t('comun.cerrar')).toBe('Close')
    expect(traductor('es').tn('comun.capas', 1)).toBe('1 capa')
    expect(traductor('es').tn('comun.capas', 3)).toBe('3 capas')
  })
  it('código de idioma', () => {
    expect(esCodigoIdioma('qu')).toBe(true)
    expect(esCodigoIdioma('fr')).toBe(false)
  })
})

describe('formatoHora', () => {
  it('kichwa escribe la hora como es-EC (sin el «a.m.» del quechua de CLDR) y 0 es «sin dato»', async () => {
    const { formatoHora } = await import('./formato')
    const ms = Date.UTC(2026, 0, 5, 15, 7)
    expect(formatoHora('qu', ms)).toBe(formatoHora('es', ms))
    expect(formatoHora('qu', ms)).toBe(new Date(ms).toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit' }))
    expect(formatoHora('en', ms)).toBe(new Date(ms).toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit' }))
    expect(formatoHora('es', 0)).toBeUndefined()
  })
})

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Impacto } from '../../api/consultas'
import { renderPseudo, textosSinTraducir } from '../../idioma/pruebas'
import { traductor } from '../../idioma/traductor'
import { generarInformeImpacto, lineasInformeImpacto } from './informeImpacto'
import { VistaImpacto } from './VistaImpacto'

const BBOX = [-80.24, -0.74, -80.16, -0.66]
const origen = { tipo: 'sintetico', fuente: 'Generador de demostración', generador: 'datos/generador.py', version: '1', semilla: 7, fecha_generacion: '2026-11-04T00:00:00Z' }
const capa = {
  escenario_id: 'ec_x', adquisicion_id: null, instante: null, polarizacion: 'HH', origen, variable: 'sigma0', paleta: 'gris', unidad: 'dB', leyenda: null,
  rejilla: { filas: 1, columnas: 1, vmin: 0, vmax: 1, bbox: BBOX, datos_b64: btoa(String.fromCharCode(1)) },
}
const IMPACTO = {
  titulo: 'Superficie inundada', tipo: 'inundacion', escenario: 'La Segua', antes: '2026-04-12', despues: '2026-04-24', origen, capa,
  cifras: [{ etiqueta: 'Superficie inundada al final', valor: '548', unidad: 'ha', ayuda: '' }],
  lectura: ['En este escenario de demostración, el radar marca unas 548 ha.'],
  acciones: ['Si esto fuera un evento real, contrastar con la autoridad.'], notas: ['Nota del modelo.'],
  categorias: [{ etiqueta: 'Agua abierta (A)', ha: 300 }, { etiqueta: 'Vegetación inundada', ha: 248 }],
  evolucion: [{ instante: '2026-04-12T00:00:00Z', ha: 100 }, { instante: '2026-04-24T00:00:00Z', ha: 548 }],
} as unknown as Impacto

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn(() => Promise.resolve(new Response(JSON.stringify(IMPACTO)))))
})
afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks() })

describe('Impacto · idioma', () => {
  it('la vista de impacto pasa por el traductor', async () => {
    const esc = { id: 'ec_x', historia: 'inundacion', polarizaciones: ['HH'] } as never
    const cliente = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const { container } = renderPseudo(
      <QueryClientProvider client={cliente}><VistaImpacto esc={esc} antesId="2026-04-12" despuesId="2026-04-24" polarizacion="HH" /></QueryClientProvider>,
    )
    await screen.findByText('⟦Hectáreas por categoría⟧')
    // Etiquetas de categoría: datos de la API dentro del gráfico de barras.
    const sin = textosSinTraducir(container).filter((x) => !/^[A-Z][a-z]{2} \d{1,2}$|^Agua abierta|^Vegetación inundada|^Agua$|^Vegetación$/.test(x))
    expect(sin).toEqual([])
  })

  it('el informe en inglés lleva el aviso de ejemplo ilustrativo en inglés', () => {
    const l = lineasInformeImpacto(IMPACTO, traductor('en').t)
    expect(l[l.length - 1]).toBe('Illustrative example with demonstration data: this is not a real NISAR observation.')
    expect(l[1]).toBe('Passes compared: 2026-04-12 → 2026-04-24')
  })

  it('el PNG del informe en inglés lleva la franja de demostración en inglés', async () => {
    const textos: string[] = []
    const ctx = new Proxy({} as Record<string, unknown>, {
      get: (o, k: string) => (k in o ? o[k] : k === 'measureText' ? (x: string) => ({ width: x.length * 6 }) : k === 'fillText' ? (x: string) => textos.push(x) : () => {}),
      set: (o, k: string, v) => { o[k] = v; return true },
    })
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(() => ctx as never)
    vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation((cb) => cb(new Blob(['x'], { type: 'image/png' })))
    await generarInformeImpacto(IMPACTO, traductor('en').t)
    expect(textos.some((x) => x.startsWith('DEMONSTRATION DATA'))).toBe(true)
    expect(textos.some((x) => x.startsWith('Illustrative example'))).toBe(true)
    expect(textos.some((x) => x.includes('DATOS DE DEMOSTRACIÓN'))).toBe(false)
  })
})

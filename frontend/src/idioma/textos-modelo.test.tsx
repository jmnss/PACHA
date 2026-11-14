import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { NotasModelo } from '../diseno/NotasModelo'
import { AyudaRadar } from '../pantallas/observatorio/AyudaRadar'
import { Bitacora } from '../pantallas/simulador/Bitacora'
import { entradaDeEvento } from '../pantallas/simulador/bitacora'
import { GemeloRadar } from '../pantallas/simulador/GemeloRadar'
import { INCENDIO, MUNDO, ORIGEN } from '../pantallas/simulador/fixtures'
import type { Origen } from '../diseno/origen'
import { en } from './catalogos/en'
import { es } from './catalogos/es'
import { UnidadMetrica } from './MetricaApi'
import { renderConIdioma } from './pruebas'

// Textos que escribe el modelo heredado (`modelo/`): llegan con clave derivada y solo se traducen si el español coincide.

describe('notas del modelo', () => {
  it('con el escenario, la nota se traduce y conserva la marca «sin verificar» decidida sobre el español', () => {
    const nota = es['api.nota.ec_pedernales.1']
    renderConIdioma(<NotasModelo notas={[nota]} escenarioId="ec_pedernales~x1" />, 'en')
    expect(screen.getByText(en['api.nota.ec_pedernales.1'])).not.toHaveAttribute('lang')
    expect(screen.getByText(en['origen.notas.sin_verificar'], { exact: false })).toBeInTheDocument()
  })

  it('una nota distinta (otros parámetros) se queda en español con lang="es"', () => {
    const { container } = renderConIdioma(<NotasModelo notas={['Vector LOS distinto.']} escenarioId="ec_pedernales" />, 'en')
    expect(container.querySelector('li [lang="es"]')?.textContent).toBe('Vector LOS distinto.')
  })

  it('el aviso de la ayuda del radar va ya traducido: sin lang="es" ni marca redundante', () => {
    const { container } = renderConIdioma(<AyudaRadar />, 'en')
    const aviso = screen.getByText(en['obs.ayuda.aviso'])
    expect(aviso.closest('li')!.querySelector('[lang="es"]')).toBeNull()
    expect(aviso.closest('li')!.textContent).not.toContain(en['origen.notas.sin_verificar'])
    expect(container.querySelector('.notas-modelo [lang="es"]')).toBeNull()
  })
})

describe('simulador', () => {
  it('los títulos de los paneles del gemelo se traducen', () => {
    renderConIdioma(<GemeloRadar evento={INCENDIO} />, 'en')
    expect(screen.getAllByText(en['api.sim.panel.razon_logaritmica_hv_despues_antes']).length).toBeGreaterThan(0)
    expect(screen.queryByText('Razón logarítmica HV después/antes')).toBeNull()
  })

  it('la bitácora guarda clave y valores del título y lo muestra en el idioma activo', () => {
    const evento = { ...INCENDIO, titulo: 'Terremoto Mw 7,0', clave_texto: 'api.sim.titulo.terremoto', valores_texto: { mw: 7 } }
    const entrada = entradaDeEvento(evento, MUNDO, '?x=1')
    expect(entrada).toMatchObject({ titulo: 'Terremoto Mw 7,0', titulo_clave: 'api.sim.titulo.terremoto', titulo_valores: { mw: 7 } })
    // Una entrada antigua, sin clave, sigue viéndose (en español, marcada).
    const antigua = { ...entrada, titulo: 'Incendio viejo', titulo_clave: undefined, titulo_valores: undefined, enlace: '?x=2' }
    renderConIdioma(<Bitacora entradas={[entrada, antigua]} origen={ORIGEN as unknown as Origen} onVaciar={() => {}} />, 'en')
    expect(screen.getByText('Earthquake Mw 7.0')).toBeInTheDocument()
    expect(screen.getAllByText(en['api.contexto.temporada.seca'])).toHaveLength(2)
    expect(screen.getByText('Incendio viejo')).toHaveAttribute('lang', 'es')
  })
})

describe('unidades', () => {
  it('las unidades con palabras se traducen; los símbolos quedan tal cual', () => {
    const { container } = renderConIdioma(<><UnidadMetrica unidad="días" /> <UnidadMetrica unidad="km²" /></>, 'en')
    expect(container.textContent).toBe('days km²')
  })
})

describe('hallazgo de la cabecera', () => {
  it('traduce el título de la serie si el español coincide', async () => {
    const { hallazgo } = await import('../pantallas/observatorio/derivados')
    const { traductor } = await import('./traductor')
    const r = {
      series: [{ titulo: 'Superficie inundada', unidad: 'km²', puntos: [['2025-12-13T00:00:00Z', 18.3, 'A'], ['2026-11-26T00:00:00Z', 5.5, 'A']] }],
      origen: { tipo: 'sintetico' },
    } as unknown as Parameters<typeof hallazgo>[0]
    const f = hallazgo(r, '2025-12-13T00:00:00Z', '2026-11-26T00:00:00Z', traductor('en').t, 'en')
    expect(f).toContain('flooded area')
    expect(f).not.toContain('superficie')
    const otra = { ...r!, series: [{ ...r!.series[0], titulo: 'Serie nueva' }] }
    expect(hallazgo(otra, '2025-12-13T00:00:00Z', '2026-11-26T00:00:00Z', traductor('en').t, 'en')).toContain('serie nueva')
  })
})

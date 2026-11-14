import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { Rejilla } from '../api/rejilla'
import { Barras } from '../graficos/Barras'
import { Linea } from '../graficos/Linea'
import { formatoMarcas } from '../diseno/rampas'
import { renderConIdioma, renderPseudo, textosSinTraducir } from '../idioma/pruebas'
import { Localizador } from '../mapa/Localizador'
import { ControlesMapa } from '../mapa/ControlesMapa'
import { CintaPasadas } from '../tiempo/CintaPasadas'
import { ControlesReproductor } from '../tiempo/ControlesReproductor'
import { Comparador } from './Comparador'

const origen = { tipo: 'sintetico', fuente: 'prueba', fecha_generacion: '2026-01-01T00:00:00Z' } as never
const rejilla = (v: number[]): Rejilla => ({
  bbox: [-80, -3, -79, -2], columnas: 2, filas: 2, vmin: -30, vmax: 0, datos_b64: btoa(String.fromCharCode(...v)),
})
const A = rejilla([1, 64, 128, 255])
const adq = [0, 1, 2].map((i) => ({ id: `a${i}`, instante: new Date(Date.UTC(2026, 3, 1 + i * 12)).toISOString() }))
const noop = () => {}
// Fechas ya formateadas por el idioma activo (datos, no texto de catálogo).
const FECHA = /^(\d{1,2} )?[A-Z][a-z]{2}( \d{1,2})?( \d{4})?( \d{2}:\d{2} UTC)?$/
const sinFechas = (c: HTMLElement) => textosSinTraducir(c).filter((x) => !FECHA.test(x))

describe('piezas con renderPseudo', () => {
  it('Comparador', () => {
    const { container } = renderPseudo(
      <Comparador antes={A} despues={rejilla([1, 2, 3, 4])} rampa="gris" etiquetaAntes="⟦a⟧" etiquetaDespues="⟦d⟧" origen={origen} />,
    )
    expect(sinFechas(container)).toEqual([])
  })
  it('Comparador con zonas distintas', () => {
    const otra = { ...A, bbox: [-70, -3, -69, -2] as [number, number, number, number] }
    const { container } = renderPseudo(
      <Comparador antes={A} despues={otra} rampa="gris" etiquetaAntes="⟦a⟧" etiquetaDespues="⟦d⟧" origen={origen} />,
    )
    expect(sinFechas(container)).toEqual([])
  })
  it('CintaPasadas y reproductor', () => {
    const { container } = renderPseudo(
      <>
        <CintaPasadas adquisiciones={adq} evento={adq[1].instante} instante={adq[0].instante} onCambio={noop}
          temporadas={[{ inicio: adq[0].instante, fin: adq[2].instante, tipo: 'lluviosa' }]} />
        <ControlesReproductor pasoMin={60} onPaso={noop} velocidad="normal" onVelocidad={noop} reproduciendo={false}
          onPlay={noop} onPausa={noop} onInicio={noop} onFinal={noop} onAtras={noop} onAdelante={noop} onEvento={noop} />
        <CintaPasadas adquisiciones={[]} instante="" onCambio={noop} />
      </>,
    )
    expect(sinFechas(container)).toEqual([])
  })
  it('Linea y Barras', () => {
    const { container } = renderPseudo(
      <>
        <Linea series={[{ nombre: '⟦s⟧', puntos: [['2026-04-01', 1], ['2026-04-20', 3]] }]} unidad="⟦u⟧" origen={origen}
          marcas={[{ instante: '2026-04-10', etiqueta: '⟦m⟧' }, { instante: '2027-04-10', etiqueta: '⟦f⟧' }]} />
        <Linea series={[{ nombre: '⟦s⟧', puntos: [] }]} unidad="⟦u⟧" origen={origen} />
        <Barras datos={[{ etiqueta: '⟦b⟧', valor: 3 }]} unidad="⟦u⟧" origen={origen} />
        <Barras datos={[]} unidad="⟦u⟧" origen={origen} />
      </>,
    )
    expect(sinFechas(container)).toEqual([])
    const resumenes = Array.from(container.querySelectorAll('svg[role="img"]')).map((s) => s.getAttribute('aria-label'))
    for (const r of resumenes) expect(r).toContain('⟦')
  })
  it('ControlesMapa y Localizador', () => {
    const { container } = renderPseudo(
      <>
        <ControlesMapa base="oscuro" onBase={noop} opacidad={0.8} onOpacidad={noop} conBases />
        <Localizador bbox={[-80.3, -0.8, -80.1, -0.6]} />
      </>,
    )
    expect(sinFechas(container)).toEqual([])
  })
})

describe('piezas en inglés y kichwa', () => {
  it('el deslizador del comparador anuncia su valor en inglés', () => {
    renderConIdioma(
      <Comparador antes={A} despues={A} rampa="gris" etiquetaAntes="a" etiquetaDespues="d" origen={origen} />, 'en')
    expect(screen.getByRole('slider')).toHaveAttribute('aria-valuetext', '50 % of the image is "before"')
  })
  it('las marcas de la leyenda usan los decimales del idioma', () => {
    expect(formatoMarcas(0, 1)).toEqual(['0,00', '0,25', '0,50', '0,75', '1,00'])
    expect(formatoMarcas(0, 1, 'en')).toEqual(['0.00', '0.25', '0.50', '0.75', '1.00'])
  })
  it('el resumen del gráfico y su sello salen en el idioma activo', () => {
    const { container } = renderConIdioma(
      <Barras datos={[{ etiqueta: 'x', valor: 3.5 }]} unidad="ha" origen={origen} />, 'en')
    const r = container.querySelector('svg')!.getAttribute('aria-label')!
    expect(r).toMatch(/^Bars: x \d+ ha\./)
    expect(r).not.toContain('Sintético')
  })
})

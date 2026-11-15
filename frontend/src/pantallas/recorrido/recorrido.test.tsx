import { act, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { traductor } from '../../idioma/traductor'
import type { CodigoIdioma } from '../../idioma/idiomas'
import { renderConIdioma, renderPseudo, textosSinTraducir } from '../../idioma/pruebas'
import { GUION, guionDe } from './guion'
import Recorrido from './Recorrido'

const montar = (ruta = '/aprender/recorrido') => render(<MemoryRouter initialEntries={[ruta]}><Recorrido /></MemoryRouter>)

describe('guion', () => {
  it('tiene pasos con rutas internas únicas y duración razonable (< 2 min en total)', () => {
    expect(new Set(GUION.map((p) => p.id)).size).toBe(GUION.length)
    expect(GUION.every((p) => p.ruta.startsWith('/') && p.segundos > 0)).toBe(true)
    expect(GUION.reduce((s, p) => s + p.segundos, 0)).toBeLessThanOrEqual(120)
  })
  it('nunca presenta los datos como reales de NISAR', () => {
    for (const p of GUION) expect(p.texto).not.toMatch(/datos reales|NISAR (midió|observó|detectó)/i)
  })
})

describe('Recorrido', () => {
  it('incrusta la pantalla del paso con ?incrustado=1 y avanza con el teclado', () => {
    const { container } = montar()
    const marco = () => container.querySelector('iframe')!
    expect(marco().getAttribute('src')).toBe('/explorar/historias?incrustado=1')
    fireEvent.keyDown(container.querySelector('.recorrido')!, { key: 'ArrowRight' })
    expect(screen.getByText(GUION[1].titulo)).toBeInTheDocument()
    expect(marco().getAttribute('src')).toBe('/aprender/laboratorio?nubes=70&incrustado=1')
  })
  it('pausa y reanuda', () => {
    montar()
    fireEvent.click(screen.getByRole('button', { name: 'Pausar' }))
    expect(screen.getByRole('button', { name: 'Reanudar' })).toBeInTheDocument()
  })
  it('un paso fuera de rango cae al primero', () => {
    montar('/aprender/recorrido?paso=99')
    expect(screen.getByText(GUION[0].titulo)).toBeInTheDocument()
  })
})

describe('Recorrido · avance automático', () => {
  afterEach(() => vi.useRealTimers())
  it('avanza de uno en uno (no se salta pasos) y se detiene en el último', () => {
    vi.useFakeTimers()
    vi.stubGlobal('matchMedia', () => ({ matches: false, addEventListener() {}, removeEventListener() {} }))
    montar()
    for (let i = 1; i < GUION.length; i++) {
      act(() => { vi.advanceTimersByTime(GUION[i - 1].segundos * 1000) })
      expect(screen.getByText(GUION[i].titulo)).toBeInTheDocument()
    }
    act(() => { vi.advanceTimersByTime(GUION[GUION.length - 1].segundos * 1000) })
    expect(screen.getByRole('button', { name: 'Reanudar' })).toBeInTheDocument()
    vi.unstubAllGlobals()
  })
})

describe('Recorrido · idiomas', () => {
  it('el español es el guion de siempre', () => {
    expect(guionDe('es')).toBe(GUION)
    expect(GUION.map((p) => p.id)).toEqual(['problema', 'nubes', 'polarizacion', 'mapa', 'incendio', 'simulador'])
    expect(GUION[0].titulo).toBe('Un río crece y nadie ve hasta dónde')
  })
  for (const idioma of ['en', 'qu'] as CodigoIdioma[]) {
    it(`${idioma}: mismos pasos, rutas y duraciones; textos llenos`, () => {
      const g = guionDe(idioma)
      expect(g.map((p) => [p.id, p.ruta, p.segundos])).toEqual(GUION.map((p) => [p.id, p.ruta, p.segundos]))
      for (const p of g) { expect(p.titulo.trim()).not.toBe(''); expect(p.texto.trim()).not.toBe('') }
      for (const p of g) expect(p.texto).not.toMatch(/datos reales|NISAR (midió|observó|detectó)/i)
      expect(g[0].texto).not.toBe(GUION[0].texto)
    })
    it(`${idioma}: la pantalla muestra el guion y los controles traducidos`, () => {
      const { t } = traductor(idioma)
      const { container } = renderConIdioma(<MemoryRouter initialEntries={['/aprender/recorrido']}><Recorrido /></MemoryRouter>, idioma)
      expect(screen.getByRole('heading', { level: 2 }).textContent).toBe(guionDe(idioma)[0].titulo)
      expect(screen.getByRole('button', { name: t('recorrido.pausar') })).toBeInTheDocument()
      expect(container.querySelector('[data-contenido-largo]')).not.toBeNull()
    })
  }
  it('renderPseudo no deja texto de interfaz sin traducir', () => {
    const { container } = renderPseudo(<MemoryRouter initialEntries={['/aprender/recorrido']}><Recorrido /></MemoryRouter>)
    expect(textosSinTraducir(container)).toEqual([])
  })
})

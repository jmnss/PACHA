import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { traductor } from '../../idioma/traductor'
import type { CodigoIdioma } from '../../idioma/idiomas'
import { renderConIdioma, renderPseudo, textosSinTraducir } from '../../idioma/pruebas'
import { BANDAS, FENOMENOS, PENDIENTE, contenidoDe, type Parrafo } from './contenido'
import Fundamentos from './Fundamentos'

describe('Fundamentos', () => {
  it('marca lo no verificado de NISAR como pendiente de confirmar', () => {
    render(<Fundamentos />)
    expect(screen.getByText(new RegExp(PENDIENTE))).toBeInTheDocument()
  })
  it('explica los tipos de cambio del challenge', () => {
    render(<Fundamentos />)
    for (const t of ['Inundaciones y humedales', 'Glaciares y hielo marino', 'Terremotos y subsidencia']) expect(screen.getByText(t)).toBeInTheDocument()
  })
  it('no afirma fechas ni órbita de la misión', () => {
    const { container } = render(<Fundamentos />)
    expect(container.textContent).not.toMatch(/lanz(ó|amiento el)|\b20(2[4-9]|3\d)\b/)
  })
})

const terminos = (p: Parrafo) => p.flatMap((s) => (typeof s === 'string' ? [] : [s.nombre])).length

describe('Fundamentos · idiomas', () => {
  const es = contenidoDe('es')
  it('el español es el contenido de siempre', () => {
    expect(PENDIENTE).toBe('pendiente de confirmar con la documentación oficial')
    expect(FENOMENOS).toBe(es.fenomenos)
    expect(BANDAS.map((b) => b.nombre)).toEqual(['X', 'C', 'S', 'L'])
    expect(FENOMENOS[0].cambio).toBe('Inundaciones y humedales')
  })
  for (const idioma of ['en', 'qu'] as CodigoIdioma[]) {
    const c = contenidoDe(idioma)
    it(`${idioma}: mismas secciones, filas y términos`, () => {
      expect(c.fenomenos.map((f) => f.pol !== '')).toEqual(es.fenomenos.map(() => true))
      expect(c.fenomenos).toHaveLength(es.fenomenos.length)
      expect(c.bandas.map((b) => b.nombre)).toEqual(es.bandas.map((b) => b.nombre))
      expect([...c.radar, c.polBandas, c.mision].map(terminos)).toEqual([...es.radar, es.polBandas, es.mision].map(terminos))
      for (const f of c.fenomenos) { expect(f.cambio.trim()).not.toBe(''); expect(f.que_ve.trim()).not.toBe('') }
    })
    it(`${idioma}: conserva la marca «pendiente de confirmar» y no afirma fechas`, () => {
      const { t } = traductor(idioma)
      expect(c.pendiente).toBe(t('historias.marca.pendiente'))
      const { container } = renderConIdioma(<Fundamentos />, idioma)
      expect(screen.getByText(new RegExp(c.pendiente))).toBeInTheDocument()
      expect(container.querySelector('[data-contenido-largo]')).not.toBeNull()
      expect(container.textContent).not.toMatch(/\b20(2[4-9]|3\d)\b/)
      expect(screen.getByRole('heading', { level: 1 }).textContent).toBe(t('fundamentos.titulo'))
    })
  }
  it('renderPseudo no deja texto de interfaz sin traducir', () => {
    const { container } = renderPseudo(<Fundamentos />)
    expect(textosSinTraducir(container)).toEqual([])
  })
})

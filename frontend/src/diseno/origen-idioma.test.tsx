import { fireEvent, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { en } from '../idioma/catalogos/en'
import { qu } from '../idioma/catalogos/qu'
import { renderConIdioma, renderPseudo, textosSinTraducir } from '../idioma/pruebas'
import { traductor } from '../idioma/traductor'
import { Leyenda } from './Leyenda'
import { NotasModelo } from './NotasModelo'
import { textoSello, type Origen } from './origen'
import { SelloOrigen } from './SelloOrigen'
import { Termino } from './Termino'

const origenDemo = {
  tipo: 'sintetico', fuente: 'Generador de demostración NISAR·Ecuador', producto: null,
  generador: 'datos/generador.py', version: '1', semilla: 7, fecha_generacion: '2026-11-05T08:00:00Z', notas: null,
} as Origen

describe('textoSello por idioma', () => {
  it('sin t devuelve el español de siempre', () => {
    expect(textoSello(origenDemo)).toBe(
      'Sintético · Generador de demostración NISAR·Ecuador · generador v1 · semilla 7 · generado 2026-11-05',
    )
    expect(textoSello(null)).toBe('Sintético (no verificado)')
  })
  it('en inglés empieza por Synthetic', () => {
    expect(textoSello(origenDemo, traductor('en').t)).toMatch(/^Synthetic · /)
    expect(textoSello(null, traductor('en').t)).toBe('Synthetic (unverified)')
  })
  it('en kichwa no deja «Sintético»', () => {
    expect(textoSello(origenDemo, traductor('qu').t)).not.toContain('Sintético')
  })
  it('real en kichwa', () => {
    const real = { ...origenDemo, tipo: 'real', generador: null } as Origen
    expect(textoSello(real, traductor('qu').t)).toMatch(/^Chiqan · /)
  })
})

describe('NotasModelo', () => {
  it.each([['en', en], ['qu', qu]] as const)('muestra el aviso de pendiente en %s', (id, cat) => {
    renderConIdioma(<NotasModelo notas={['Producto GUNW enmascarado.']} />, id)
    expect(screen.getByText(cat['origen.notas.aviso'])).toBeInTheDocument()
    expect(screen.getByText(cat['origen.notas.sin_verificar'], { exact: false })).toBeInTheDocument()
  })
  it('las notas del modelo quedan en español con lang="es" fuera de es', () => {
    renderConIdioma(<NotasModelo notas={['Se ve agua.']} />, 'en')
    expect(screen.getByText('Se ve agua.')).toHaveAttribute('lang', 'es')
  })
})

describe('sin textos sueltos', () => {
  it('SelloOrigen', () => {
    const { container } = renderPseudo(<SelloOrigen origen={origenDemo} />)
    expect(textosSinTraducir(container)).toEqual([])
  })
  it('Leyenda continua y de categorías', () => {
    const { container } = renderPseudo(<>
      <Leyenda paleta="gris" vmin={-30} vmax={0} unidad="dB" />
      <Leyenda paleta="divergente" vmin={-6} vmax={6} unidad="dB" />
      <Leyenda paleta="categorias" vmin={0} vmax={2} unidad="dB" variable="cambio_por_parcela"
        leyenda={[['Sin cambio', '#000'], ['Crecimiento', '#000']]} />
    </>)
    expect(container.querySelector('[aria-label^="⟦Leyenda"]')).not.toBeNull()
    expect(textosSinTraducir(container)).toEqual([])
  })
  it('Termino abierto', () => {
    const { container } = renderPseudo(<Termino nombre="dB" explicacion="⟦Decibelios.⟧" />)
    fireEvent.click(screen.getByRole('button'))
    expect(textosSinTraducir(container)).toEqual([])
  })
})

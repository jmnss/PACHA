import { fireEvent, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { en } from '../idioma/catalogos/en'
import { es } from '../idioma/catalogos/es'
import { qu } from '../idioma/catalogos/qu'
import { renderConIdioma, renderPseudo, textosSinTraducir } from '../idioma/pruebas'
import { traductor, type Clave } from '../idioma/traductor'
import { Leyenda } from './Leyenda'
import { NotasModelo } from './NotasModelo'
import { textoSello, type Origen } from './origen'
import { SelloOrigen } from './SelloOrigen'
import { Termino } from './Termino'

const origenDemo = {
  tipo: 'sintetico', fuente: 'Generador de demostración PACHA', producto: null,
  generador: 'datos/generador.py', version: '1', semilla: 7, fecha_generacion: '2026-11-05T08:00:00Z', notas: null,
} as Origen

describe('textoSello por idioma', () => {
  it('sin t devuelve el español de siempre', () => {
    expect(textoSello(origenDemo)).toBe('Simulación · semilla 7')
    expect(textoSello(null)).toBe('Simulación')
  })
  it('en inglés empieza por Simulation', () => {
    expect(textoSello(origenDemo, traductor('en').t)).toMatch(/^Simulation · /)
    expect(textoSello(null, traductor('en').t)).toBe('Simulation')
  })
  it('en kichwa no deja «Sintético»', () => {
    expect(textoSello(origenDemo, traductor('qu').t)).toMatch(/muju 7/)
  })
  it('real de NISAR: producto, polarizaciones, fecha y quién lo procesó; granulo y madurez solo si vienen', () => {
    const real = {
      ...origenDemo, tipo: 'real', clase: 'nisar', generador: null,
      procedencia: { producto: 'GCOV', polarizaciones: ['HH', 'HV'], fecha_adquisicion: '2026-10-29T10:00:00Z', granulos: [] },
    } as unknown as Origen
    expect(textoSello(real)).toBe('NISAR · GCOV · HH/HV · 2026-10-29 · procesado por el equipo PACHA')
    const completo = { ...real, procedencia: { ...real.procedencia, granulos: ['G1'], madurez: 'BETA' } } as unknown as Origen
    expect(textoSello(completo)).toBe('NISAR · GCOV · HH/HV · 2026-10-29 · procesado por el equipo PACHA · granulo G1 · madurez BETA')
    expect(textoSello(real, traductor('qu').t)).toMatch(/^NISAR · GCOV/)
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
  it('Leyenda con extremos por clave, en tres idiomas', () => {
    const ext: [Clave, Clave] = ['origen.leyenda.desplazamiento_menos', 'origen.leyenda.desplazamiento_mas']
    for (const [id, cat] of [['en', en], ['qu', qu]] as const) {
      const { unmount } = renderConIdioma(<Leyenda paleta="divergente" vmin={-1} vmax={1} unidad="dB" extremos={ext} />, id)
      expect(screen.getByText(cat['origen.leyenda.desplazamiento_mas'])).toBeInTheDocument()
      // Distingue: el texto de cada idioma no es el español (si lo fuera, quedaría sin lang="es").
      for (const k of ext) expect(cat[k], `${id}:${k}`).not.toBe(es[k])
      unmount()
    }
    const { container } = renderPseudo(<Leyenda paleta="divergente" vmin={-1} vmax={1} unidad="dB" extremos={ext} />)
    expect(textosSinTraducir(container)).toEqual([])
  })
  it('la unidad es texto plano sin marca de sin traducir', () => {
    const { container } = renderConIdioma(<Leyenda paleta="gris" vmin={-30} vmax={0} unidad="dB" />, 'en')
    expect(container.querySelector('.leyenda__unidad [lang]')).toBeNull()
  })
  it('Termino abierto', () => {
    const { container } = renderPseudo(<Termino nombre="dB" explicacion="⟦Decibelios.⟧" />)
    fireEvent.click(screen.getByRole('button'))
    expect(textosSinTraducir(container)).toEqual([])
  })
})

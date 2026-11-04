import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Barras } from './Barras'
import { colocarEtiquetas, escalaRedonda, ANCHO_CARACTER } from './escala'
import { Linea } from './Linea'

const origen = {
  tipo: 'sintetico' as const, fuente: 'Generador de demostración NISAR·Ecuador', producto: null,
  generador: 'datos/generador.py', version: '1', semilla: 7, fecha_generacion: '2026-11-05T08:00:00Z', notas: null,
}
const pts = (vs: (number | null)[]): [string, number | null][] =>
  vs.map((v, i) => [`2026-04-${String(i * 6 + 1).padStart(2, '0')}`, v])

describe('escalaRedonda', () => {
  it('ticks redondos y tope sobre el máximo', () => {
    for (const [min, max] of [[0, 97], [3, 8.4], [-12.3, -4.1], [0.002, 0.0071], [120, 340], [0, 5], [-3, 9]] as const) {
      const { ticks, tope } = escalaRedonda(min, max, 5)
      expect(ticks.length).toBeGreaterThanOrEqual(3)
      expect(ticks.length).toBeLessThanOrEqual(5)
      expect(tope).toBeGreaterThan(max)
      expect(tope).toBe(ticks[ticks.length - 1])
      const paso = ticks[1] - ticks[0]
      const mant = paso / Math.pow(10, Math.floor(Math.log10(paso)))
      expect([1, 2, 5]).toContain(Math.round(mant * 1e6) / 1e6)
      expect(ticks[0]).toBeLessThanOrEqual(min)
    }
  })
  it('incluye el cero si los datos están cerca o lo cruzan', () => {
    expect(escalaRedonda(2, 97, 5).ticks[0]).toBe(0)
    expect(escalaRedonda(-3, 9, 5).ticks).toContain(0)
    expect(escalaRedonda(0, 0, 5).ticks[0]).toBe(0)
  })
})

describe('colocarEtiquetas', () => {
  it('las etiquetas de marcas no se solapan', () => {
    const marcas = [
      { x: 100, texto: 'inundación' }, { x: 110, texto: 'antes' }, { x: 130, texto: 'después' }, { x: 330, texto: 'evento final largo' },
    ]
    const c = colocarEtiquetas(marcas, 400, 3)
    const cajas = c.map((e) => {
      const w = e.texto.length * ANCHO_CARACTER
      return { fila: e.fila, l: e.ancla === 'start' ? e.x + 3 : e.x - 3 - w, r: e.ancla === 'start' ? e.x + 3 + w : e.x - 3 }
    })
    for (let i = 0; i < cajas.length; i++)
      for (let j = i + 1; j < cajas.length; j++)
        if (cajas[i].fila === cajas[j].fila) expect(cajas[i].r <= cajas[j].l || cajas[j].r <= cajas[i].l).toBe(true)
    expect(cajas.every((b) => b.l >= 0 && b.r <= 400)).toBe(true)
  })
  it('recorta con elipsis cuando no hay filas libres', () => {
    const c = colocarEtiquetas([{ x: 10, texto: 'etiqueta muy larga' }, { x: 30, texto: 'otra' }], 300, 1)
    expect(c[0].texto.endsWith('…')).toBe(true)
    expect(c[0].x + 3 + c[0].texto.length * ANCHO_CARACTER).toBeLessThanOrEqual(30)
  })
})

describe('Linea', () => {
  it('sin leyenda con una serie', () => {
    const { container } = render(<Linea series={[{ nombre: 'Área', puntos: pts([1, 3, 2, 5]) }]} unidad="km²" origen={origen} />)
    expect(container.querySelector('.grafico__leyenda')).toBeNull()
    expect(container.querySelectorAll('path.grafico__linea')).toHaveLength(1)
  })
  it('la verdad sintética va punteada y nombrada «verdad sintética»', () => {
    const { container } = render(
      <Linea series={[{ nombre: 'Área', puntos: pts([1, 3, 2, 5]) }, { nombre: 'verdad del modelo', puntos: pts([1, 2, 2, 4]) }]} unidad="km²" origen={origen} />,
    )
    expect(screen.getByText('verdad sintética')).toBeInTheDocument()
    const v = container.querySelector('path[data-serie="verdad sintética"]')!
    expect(v.getAttribute('stroke-dasharray')).toBeTruthy()
    expect(v.getAttribute('stroke')).toBe('var(--chart-2)')
    expect(container.querySelector('path[data-serie="Área"]')!.getAttribute('stroke-dasharray')).toBeNull()
  })
  it('lleva sello de origen y descripción accesible', () => {
    render(<Linea series={[{ nombre: 'Área', puntos: pts([1, 3]) }]} unidad="km²" origen={origen} titulo="Área inundada" />)
    expect(screen.getByText(/^Sintético · /)).toBeInTheDocument()
    expect(screen.getByRole('img').getAttribute('aria-label')).toMatch(/Área inundada.*km².*Sintético/)
  })
  it('interrumpe la línea en los nulos y dibuja el cero como línea plana', () => {
    const { container } = render(<Linea series={[{ nombre: 'A', puntos: pts([1, null, 3, 4]) }, { nombre: 'B', puntos: pts([0, 0, 0, 0]) }]} unidad="u" origen={origen} />)
    const d = container.querySelector('path[data-serie="A"]')!.getAttribute('d')!
    expect(d.match(/M/g)).toHaveLength(2)
    expect(container.querySelector('path[data-serie="B"]')!.getAttribute('d')).toMatch(/^M[\d.,]+L/)
  })
  it('vacío: línea de cero con texto, y sigue con sello', () => {
    const { container } = render(<Linea series={[{ nombre: 'A', puntos: [] }]} unidad="u" origen={origen} />)
    expect(screen.getByText('Sin datos en este rango')).toBeInTheDocument()
    expect(container.querySelector('.grafico__cero')).not.toBeNull()
    expect(screen.getByText(/^Sintético · /)).toBeInTheDocument()
  })
  it('dibuja marcas con etiqueta', () => {
    render(<Linea series={[{ nombre: 'A', puntos: pts([1, 2, 3, 4]) }]} marcas={[{ instante: '2026-04-07', etiqueta: 'evento', tipo: 'evento' }]} unidad="u" origen={origen} />)
    expect(screen.getByText('evento')).toBeInTheDocument()
  })
})

describe('Barras', () => {
  it('barras con escala, etiquetas y sello', () => {
    const { container } = render(<Barras datos={[{ etiqueta: 'HH', valor: 12 }, { etiqueta: 'HV', valor: 7 }]} unidad="km²" origen={origen} />)
    expect(container.querySelectorAll('rect.grafico__barra')).toHaveLength(2)
    expect(screen.getByText('HH')).toBeInTheDocument()
    expect(screen.getByText(/^Sintético · /)).toBeInTheDocument()
  })
})

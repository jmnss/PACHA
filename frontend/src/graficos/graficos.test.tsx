import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Barras } from './Barras'
import { colocarEtiquetas, escalaRedonda } from './escala'
import { formatoNumero } from './formato'
import { ANCHO_CARACTER, SEPARACION } from './geometria'
import { fechaEje, parseInstante } from './fechas'
import { Linea } from './Linea'

const origen = {
  tipo: 'sintetico' as const, fuente: 'Generador de demostración PACHA', producto: null,
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

function cajas(c: ReturnType<typeof colocarEtiquetas>) {
  return c.filter((e) => e.texto).map((e) => {
    const w = e.texto.length * ANCHO_CARACTER
    return { fila: e.fila, l: e.ancla === 'start' ? e.x + 3 : e.x - 3 - w, r: e.ancla === 'start' ? e.x + 3 + w : e.x - 3 }
  })
}
function expectSinSolape(c: ReturnType<typeof colocarEtiquetas>, ancho: number) {
  const b = cajas(c)
  for (let i = 0; i < b.length; i++) {
    expect(b[i].l).toBeGreaterThanOrEqual(0)
    expect(b[i].r).toBeLessThanOrEqual(ancho)
    for (let j = i + 1; j < b.length; j++)
      if (b[i].fila === b[j].fila) expect(b[i].r + SEPARACION <= b[j].l || b[j].r + SEPARACION <= b[i].l).toBe(true)
  }
}

describe('colocarEtiquetas', () => {
  it('muchas marcas juntas: nunca solapan ni salen del lienzo', () => {
    const marcas = Array.from({ length: 14 }, (_, i) => ({ x: 20 + i * 9, texto: `marca ${i}` }))
    const c = colocarEtiquetas(marcas, 300, 3)
    expect(c).toHaveLength(14)
    expectSinSolape(c, 300)
  })
  it('ancla end larga cerca del borde izquierdo: l >= 0', () => {
    const c = colocarEtiquetas([{ x: 15, texto: 'una etiqueta bastante larga' }], 60, 2)
    expectSinSolape(c, 60)
    expect(cajas(c).every((b) => b.l >= 0)).toBe(true)
    const d = colocarEtiquetas([{ x: 290, texto: 'etiqueta larga al borde' }], 300, 2)
    expect(d[0].ancla).toBe('end')
    expectSinSolape(d, 300)
  })
  it('filas agotadas: recorta o, en último caso, omite (la marca permanece en la lista)', () => {
    const marcas = Array.from({ length: 6 }, (_, i) => ({ x: 50 + i, texto: 'evento importante' }))
    const c = colocarEtiquetas(marcas, 200, 1)
    expect(c).toHaveLength(6)
    expect(c.some((e) => e.texto === '')).toBe(true)
    expectSinSolape(c, 200)
  })
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
    const c = colocarEtiquetas([{ x: 10, texto: 'etiqueta muy larga' }, { x: 200, texto: 'otra larga cosa' }], 260, 1)
    expect(c.some((e) => e.texto.endsWith('…'))).toBe(true)
    expectSinSolape(c, 260)
  })
})

describe('formato y escala pequeña', () => {
  it('escala 0,002–0,0071: etiquetas únicas con los decimales del paso', () => {
    const { ticks, decimales } = escalaRedonda(0.002, 0.0071, 5)
    expect(decimales).toBeGreaterThanOrEqual(3)
    const et = ticks.map((v) => formatoNumero(v, decimales))
    expect(new Set(et).size).toBe(et.length)
  })
  it('el eje de Linea muestra etiquetas únicas', () => {
    const { container } = render(<Linea series={[{ nombre: 'A', puntos: pts([0.002, 0.004, 0.0071]) }]} unidad="u" origen={origen} />)
    const et = [...container.querySelectorAll('text.grafico__eje')].map((t) => t.textContent).filter((t) => t?.includes(','))
    expect(new Set(et).size).toBe(et.length)
  })
})

describe('fechas', () => {
  it('ISO sin zona se interpreta como UTC', () => {
    expect(parseInstante('2026-04-12T06:00')).toBe(Date.parse('2026-04-12T06:00:00Z'))
  })
  it('rangos < 2 días usan hora', () => {
    expect(fechaEje(Date.parse('2026-04-12T06:00:00Z'), { conHora: true })).toBe('12 abr 06:00 UTC')
    const { container } = render(<Linea series={[{ nombre: 'A', puntos: [['2026-04-12T06:00', 1], ['2026-04-12T18:00', 3]] }]} unidad="u" origen={origen} />)
    expect(container.textContent).toMatch(/12 abr 06:00 UTC/)
  })
})

describe('Linea', () => {
  it('con origen real una serie «verdad…» conserva su nombre', () => {
    const { container } = render(
      <Linea series={[{ nombre: 'A', puntos: pts([1, 2]) }, { nombre: 'verdad de campo', puntos: pts([1, 3]) }]} unidad="u" origen={{ ...origen, tipo: 'real' }} />,
    )
    expect(screen.getByText('verdad de campo')).toBeInTheDocument()
    expect(screen.queryByText('verdad sintética')).toBeNull()
    expect(container.querySelector('path[data-serie="verdad de campo"]')!.getAttribute('stroke-dasharray')).toBeNull()
  })
  it('el aria-label menciona las marcas y avisa de las que quedan fuera del rango', () => {
    render(<Linea series={[{ nombre: 'A', puntos: pts([1, 2, 3, 4]) }]} marcas={[{ instante: '2026-04-07', etiqueta: 'crecida' }, { instante: '2027-01-01', etiqueta: 'lejana' }]} unidad="u" origen={origen} />)
    const aria = screen.getByRole('img').getAttribute('aria-label')!
    expect(aria).toMatch(/Marcas: crecida/)
    expect(aria).toMatch(/Fuera del rango temporal: lejana/)
    expect(screen.getByText(/fuera del rango de fechas: lejana/)).toBeInTheDocument()
  })
  it('puntos no equidistantes se ubican por fecha, no por posición', () => {
    const { container } = render(<Linea series={[{ nombre: 'A', puntos: [['2026-04-01', 1], ['2026-04-02', 2], ['2026-04-30', 3]] }]} unidad="u" origen={origen} />)
    const xs = container.querySelector('path[data-serie="A"]')!.getAttribute('d')!.match(/[ML]([\d.]+),/g)!.map((m) => Number(m.slice(1, -1)))
    expect((xs[1] - xs[0]) * 28).toBeLessThan(xs[2] - xs[1] + 1)
  })
  it('NaN interrumpe la línea', () => {
    const { container } = render(<Linea series={[{ nombre: 'A', puntos: pts([1, NaN, 3, 4]) }]} unidad="u" origen={origen} />)
    expect(container.querySelector('path[data-serie="A"]')!.getAttribute('d')!.match(/M/g)).toHaveLength(2)
  })
  it('el cursor dentro del rango dibuja una línea y no entra en el resumen de marcas', () => {
    const { container } = render(<Linea series={[{ nombre: 'A', puntos: pts([1, 2, 3, 4]) }]} cursor="2026-04-03" marcas={[{ instante: '2026-04-02', etiqueta: 'crecida' }]} unidad="u" origen={origen} />)
    expect(container.querySelectorAll('line.grafico__cursor')).toHaveLength(1)
    const aria = screen.getByRole('img').getAttribute('aria-label')!
    expect(aria).toMatch(/Marcas: crecida \(/)
    expect(aria).not.toMatch(/cursor/i)
  })
  it('el cursor fuera del rango no se dibuja', () => {
    const { container } = render(<Linea series={[{ nombre: 'A', puntos: pts([1, 2]) }]} cursor="2030-01-01" unidad="u" origen={origen} />)
    expect(container.querySelector('.grafico__cursor')).toBeNull()
  })
  it('marcas fuera de rango no se dibujan', () => {
    const { container } = render(<Linea series={[{ nombre: 'A', puntos: pts([1, 2]) }]} marcas={[{ instante: '2030-01-01', etiqueta: 'lejana' }]} unidad="u" origen={origen} />)
    expect(container.querySelector('.grafico__marca')).toBeNull()
  })
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
  it('omite valores no finitos y dibuja barras negativas bajo el cero', () => {
    const { container } = render(<Barras datos={[{ etiqueta: 'a', valor: -4 }, { etiqueta: 'b', valor: NaN }, { etiqueta: 'c', valor: 6 }]} unidad="u" origen={origen} />)
    const r = container.querySelectorAll('rect.grafico__barra')
    expect(r).toHaveLength(2)
    expect(Number(r[0].getAttribute('y'))).toBeGreaterThan(Number(r[1].getAttribute('y')))
    expect(container.textContent).not.toMatch(/NaN/)
    expect(screen.getByRole('img').getAttribute('aria-label')).not.toMatch(/b /)
  })
  it('barras con escala, etiquetas y sello', () => {
    const { container } = render(<Barras datos={[{ etiqueta: 'HH', valor: 12 }, { etiqueta: 'HV', valor: 7 }]} unidad="km²" origen={origen} />)
    expect(container.querySelectorAll('rect.grafico__barra')).toHaveLength(2)
    expect(screen.getByText('HH')).toBeInTheDocument()
    expect(screen.getByText(/^Sintético · /)).toBeInTheDocument()
  })
  it('usa el rótulo corto en el eje, deja el largo en el resumen y puede omitir los valores', () => {
    const { container } = render(<Barras datos={[{ etiqueta: 'enero', corta: 'E', valor: 12 }]} unidad="mm" origen={origen} valores={false} />)
    expect(container.querySelector('.grafico__eje--valor')).toBeNull()
    expect(screen.getByText('E')).toBeInTheDocument()
    expect(screen.getByRole('img').getAttribute('aria-label')).toMatch(/enero 12/)
  })
})

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { BandaDemostracion } from './BandaDemostracion'
import { Cargando, ErrorBloque, Vacio } from './Estados'
import { Estructura } from './Estructura'
import { CabeceraPantalla } from './CabeceraPantalla'
import { useEffect, useState } from 'react'
import { Pestanas } from './Pestanas'
import { SelloOrigen } from './SelloOrigen'
import { Tabla } from './Tabla'
import { Termino } from './Termino'

const origenSint = {
  tipo: 'sintetico' as const, fuente: 'Generador de demostración NISAR·Ecuador', producto: null,
  generador: 'datos/generador.py', version: '1', semilla: 7, fecha_generacion: '2026-11-05T08:00:00Z', notas: null,
}
const salud = (hay: boolean) => ({ estado: 'ok', hay_sinteticos: hay, origen_tipo: hay ? 'sintetico' : 'real', proveedor: 'x', version: '1' })

function simularApi(hay: boolean) {
  vi.stubGlobal('fetch', vi.fn().mockImplementation((url: string) =>
    Promise.resolve(new Response(JSON.stringify(
      url.includes('/api/salud') ? salud(hay) : [{ id: 'a', nombre: 'A', origen: hay ? origenSint : { ...origenSint, tipo: 'real' }, adquisiciones: [] }],
    )))))
}
function envolver(ui: React.ReactElement, ruta = '/', cliente = new QueryClient({ defaultOptions: { queries: { retry: false } } })) {
  return render(
    <QueryClientProvider client={cliente}><MemoryRouter initialEntries={[ruta]}>{ui}</MemoryRouter></QueryClientProvider>,
  )
}
afterEach(() => vi.unstubAllGlobals())

describe('BandaDemostracion', () => {
  it('aparece con datos sintéticos y no tiene botón de cerrar', async () => {
    simularApi(true)
    envolver(<BandaDemostracion />)
    expect(await screen.findByText('DATOS DE DEMOSTRACIÓN · no son observaciones reales de NISAR')).toBeInTheDocument()
    expect(screen.getAllByRole('button').map((b) => b.textContent)).toEqual(['Qué significa'])
    expect(screen.queryByRole('button', { name: /cerrar|ocultar/i })).toBeNull()
  })

  it('«Qué significa» abre el panel con generador, semilla y fecha', async () => {
    simularApi(true)
    envolver(<BandaDemostracion />)
    fireEvent.click(await screen.findByRole('button', { name: 'Qué significa' }))
    const panel = await screen.findByRole('dialog')
    await waitFor(() => expect(within(panel).getByText('2026-11-05')).toBeInTheDocument())
    expect(within(panel).getByText('7')).toBeInTheDocument()
    expect(within(panel).getByText(/datos\/generador\.py v1/)).toBeInTheDocument()
  })

  it('con un escenario simulado activo muestra su semilla y generador', async () => {
    simularApi(true)
    const cliente = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    cliente.setQueryData(['escenario', 'a~x1'], { id: 'a~x1', nombre: 'Simulado', origen: { ...origenSint, semilla: 4242, generador: 'datos/generador.py (simulado)' } })
    envolver(<BandaDemostracion />, '/observatorio?escenario=a%7Ex1', cliente)
    fireEvent.click(await screen.findByRole('button', { name: 'Qué significa' }))
    const panel = await screen.findByRole('dialog')
    expect(within(panel).getByText('4242')).toBeInTheDocument()
    expect(within(panel).getByText(/\(simulado\)/)).toBeInTheDocument()
  })

  it('Escape cierra el panel y devuelve el foco al botón; el foco entra al abrir', async () => {
    simularApi(true)
    envolver(<BandaDemostracion />)
    const boton = await screen.findByRole('button', { name: 'Qué significa' })
    fireEvent.click(boton)
    const panel = await screen.findByRole('dialog')
    expect(panel).toHaveFocus()
    fireEvent.keyDown(panel, { key: 'Escape' })
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(boton).toHaveFocus()
  })

  it('un clic fuera cierra el panel', async () => {
    simularApi(true)
    envolver(<BandaDemostracion />)
    fireEvent.click(await screen.findByRole('button', { name: 'Qué significa' }))
    await screen.findByRole('dialog')
    fireEvent.mouseDown(document.body)
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('no aparece si todo es real', async () => {
    simularApi(false)
    const { container } = envolver(<BandaDemostracion />)
    await waitFor(() => expect(fetch).toHaveBeenCalled())
    await new Promise((r) => setTimeout(r, 30))
    expect(container.querySelector('.banda-demo')).toBeNull()
  })
})

describe('SelloOrigen', () => {
  it('muestra tipo, fuente y fecha', () => {
    render(<SelloOrigen origen={origenSint} />)
    expect(screen.getByText(
      'Sintético · Generador de demostración NISAR·Ecuador · generador v1 · semilla 7 · generado 2026-11-05',
    )).toBeInTheDocument()
  })
  it('para origen real sin generador, solo fuente y fecha', () => {
    render(<SelloOrigen origen={{ ...origenSint, tipo: 'real', fuente: 'NASA POWER', generador: null, version: null, semilla: null }} />)
    expect(screen.getByText('Real · NASA POWER · 2026-11-05')).toBeInTheDocument()
  })
})

describe('Pestanas', () => {
  it('marca solo la activa', () => {
    render(<Pestanas etiqueta="Vistas" activa="b" onCambiar={() => {}} pestanas={[{ id: 'a', etiqueta: 'A' }, { id: 'b', etiqueta: 'B' }, { id: 'c', etiqueta: 'C' }]} />)
    const marcadas = screen.getAllByRole('tab').filter((t) => t.getAttribute('aria-selected') === 'true')
    expect(marcadas).toHaveLength(1)
    expect(marcadas[0]).toHaveTextContent('B')
    expect(document.querySelectorAll('.pestanas__pestana--activa')).toHaveLength(1)
    expect(document.querySelectorAll('.pestanas__linea')).toHaveLength(1)
  })
  it('las flechas cambian de pestaña', () => {
    const cambiar = vi.fn()
    render(<Pestanas etiqueta="Vistas" activa="a" onCambiar={cambiar} pestanas={[{ id: 'a', etiqueta: 'A' }, { id: 'b', etiqueta: 'B' }]} />)
    fireEvent.keyDown(screen.getByRole('tab', { name: 'A' }), { key: 'ArrowRight' })
    expect(cambiar).toHaveBeenCalledWith('b')
  })
})

describe('Tabla', () => {
  const columnas = [
    { clave: 'n', etiqueta: 'Nombre', identidad: true },
    { clave: 'v', etiqueta: 'Valor', numerica: true },
  ]
  it('alinea a la derecha las columnas numéricas', () => {
    render(<Tabla titulo="t" columnas={columnas} filas={[{ n: 'x', v: 1.5 }, { n: 'y', v: null }]} />)
    expect(screen.getByRole('columnheader', { name: 'Valor' })).toHaveClass('tabla__num')
    expect(screen.getByText('1.5')).toHaveClass('tabla__num', 'num')
    expect(screen.getByLabelText('sin dato')).toHaveTextContent('—')
    expect(screen.getByRole('columnheader', { name: 'Nombre' })).not.toHaveClass('tabla__num')
  })
  it('con 50 o más filas pagina «1–50 de N»', () => {
    const filas = Array.from({ length: 120 }, (_, i) => ({ n: `f${i}`, v: i }))
    render(<Tabla titulo="t" columnas={columnas} filas={filas} />)
    expect(screen.getByText('1–50 de 120')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Siguiente' }))
    expect(screen.getByText('51–100 de 120')).toBeInTheDocument()
  })
  it('con 50 filas o menos no pagina', () => {
    render(<Tabla titulo="t" columnas={columnas} filas={[{ n: 'x', v: 0 }]} />)
    expect(screen.queryByRole('button', { name: 'Siguiente' })).toBeNull()
    expect(screen.getByText('0')).toBeInTheDocument()
  })
})

describe('Estructura', () => {
  it('Riel da nombre accesible a cada icono', async () => {
    simularApi(true)
    envolver(
      <Routes><Route element={<Estructura />}><Route index element={<p>hola</p>} /></Route></Routes>,
    )
    const nav = screen.getByRole('navigation', { name: 'Principal' })
    // WCAG 2.5.3: el nombre empieza por la etiqueta corta visible en móvil y sigue con la larga.
    expect(within(nav).getByRole('link', { name: 'Inicio · Historias' })).toHaveAttribute('href', '/')
    expect(within(nav).getByRole('link', { name: 'Observ. · Observatorio' })).toHaveAttribute('href', '/observatorio')
    expect(within(nav).getByRole('link', { name: 'Simul. · Simulador de eventos' })).toHaveAttribute('href', '/simulador')
    expect(within(nav).getAllByRole('link')).toHaveLength(6)
    expect(within(nav).getByRole('link', { name: 'Inicio · Historias' })).toHaveAttribute('aria-current', 'page')
    for (const l of within(nav).getAllByRole('link')) {
      const visible = l.querySelector('.riel__etiqueta')!.textContent!
      expect(within(nav).getAllByRole('link', { name: (nombre) => nombre.startsWith(`${visible} · `) })).toContain(l)
    }
  })
})

/** Pantalla que monta una cabecera mientras «carga» y la cambia por la definitiva (como el Observatorio). */
function PantallaQueCarga() {
  const [lista, setLista] = useState(false)
  useEffect(() => { const id = setTimeout(() => setLista(true), 30); return () => clearTimeout(id) }, [])
  return lista ? <section><CabeceraPantalla titulo="Definitiva" /></section> : <CabeceraPantalla titulo="Cargando" />
}

describe('foco al navegar (spec §4.3)', () => {
  const rutas = (
    <Routes>
      <Route element={<Estructura />}>
        <Route index element={<CabeceraPantalla titulo="Inicio" />} />
        <Route path="observatorio" element={<PantallaQueCarga />} />
        <Route path="fundamentos" element={<CabeceraPantalla titulo="Base" />} />
      </Route>
    </Routes>
  )
  const enlace = (nombre: RegExp) => within(screen.getByRole('navigation', { name: 'Principal' })).getByRole('link', { name: nombre })

  it('en la carga inicial no mueve el foco', async () => {
    simularApi(true)
    envolver(rutas)
    await new Promise((r) => setTimeout(r, 30))
    expect(document.activeElement).toBe(document.body)
  })

  it('va al h1 en cada visita, también al volver a la misma ruta', async () => {
    simularApi(true)
    envolver(rutas)
    for (const [destino, titulo] of [[/Fundamentos/, 'Base'], [/Historias/, 'Inicio'], [/Fundamentos/, 'Base'], [/Fundamentos/, 'Base']] as const) {
      enlace(destino).focus()
      fireEvent.click(enlace(destino))
      await waitFor(() => expect(document.activeElement).toBe(screen.getByRole('heading', { level: 1, name: titulo })))
    }
  })

  it('desde una pantalla que carga, acaba en el h1 definitivo y no en <body>', async () => {
    simularApi(true)
    envolver(rutas)
    enlace(/Observatorio/).focus()
    fireEvent.click(enlace(/Observatorio/))
    await screen.findByRole('heading', { level: 1, name: 'Definitiva' })
    await waitFor(() => expect(document.activeElement).toBe(screen.getByRole('heading', { level: 1, name: 'Definitiva' })))
  })
})

describe('Termino', () => {
  it('se abre con teclado y se cierra con Escape', () => {
    render(<Termino nombre="dB" explicacion="Decibelios." />)
    const b = screen.getByRole('button', { name: 'dB' })
    expect(b).toHaveAttribute('aria-expanded', 'false')
    fireEvent.keyDown(b, { key: 'Enter' })
    expect(b).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByRole('note')).toHaveTextContent('Decibelios.')
    expect(b).toHaveAttribute('aria-controls', screen.getByRole('note').id)
    fireEvent.keyDown(b, { key: 'Escape' })
    expect(screen.queryByRole('note')).toBeNull()
    fireEvent.keyDown(b, { key: ' ' })
    expect(screen.getByRole('note')).toBeInTheDocument()
  })
  it('se abre con clic', () => {
    render(<Termino nombre="HH" explicacion="Horizontal." />)
    fireEvent.click(screen.getByRole('button', { name: 'HH' }))
    expect(screen.getByRole('note')).toBeInTheDocument()
  })
})

describe('Estados', () => {
  it('Cargando anuncia su texto y está ocupado', () => {
    render(<Cargando texto="Calculando 120 fotogramas…" />)
    expect(screen.getByRole('status')).toHaveAttribute('aria-busy', 'true')
    expect(screen.getByText('Calculando 120 fotogramas…')).toBeInTheDocument()
  })
  it('Error ofrece Reintentar', () => {
    const f = vi.fn()
    render(<ErrorBloque mensaje="Falló." onReintentar={f} />)
    expect(screen.getByRole('alert')).toHaveTextContent('Falló.')
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }))
    expect(f).toHaveBeenCalledOnce()
  })
  it('Error con un mensaje de la API sin traducir lo marca con lang="es"', () => {
    const { container } = render(<ErrorBloque mensaje={{ texto: 'Mensaje nuevo del proveedor.', traducido: false }} onReintentar={() => {}} />)
    expect(screen.getByText('Mensaje nuevo del proveedor.')).toHaveAttribute('lang', 'es')
    const { container: b } = render(<ErrorBloque mensaje={{ texto: 'Could not connect.', traducido: true }} onReintentar={() => {}} />)
    expect(b.querySelector('[lang]')).toBeNull()
    expect(container).toBeTruthy()
  })
  it('Vacío muestra título y frase', () => {
    render(<Vacio titulo="Nada" texto="Elige otro rango." />)
    expect(screen.getByText('Nada')).toBeInTheDocument()
    expect(screen.getByText('Elige otro rango.')).toBeInTheDocument()
  })
})

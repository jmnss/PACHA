import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { Estructura } from '../diseno/Estructura'
import { AvisoTraduccion } from './AvisoTraduccion'
import { datosAvisoQu } from './aviso'
import { qu } from './catalogos/qu'
import { VALIDADAS_QU } from './catalogos/validadas'
import { IDIOMAS } from './idiomas'
import { ProveedorIdioma } from './ProveedorIdioma'
import { renderConIdioma } from './pruebas'
import { SelectorIdioma } from './SelectorIdioma'

afterEach(() => {
  vi.unstubAllGlobals()
  document.documentElement.lang = 'es'
})

describe('SelectorIdioma', () => {
  it('el botón dice el idioma activo y controla su panel', () => {
    renderConIdioma(<SelectorIdioma />, 'es')
    const b = screen.getByRole('button', { name: 'Idioma: ES' })
    expect(b).toHaveAttribute('aria-expanded', 'false')
    fireEvent.click(b)
    expect(b).toHaveAttribute('aria-expanded', 'true')
    const grupo = screen.getByRole('group', { name: 'Idioma' })
    expect(b).toHaveAttribute('aria-controls', grupo.closest('[id]')!.id)
    const radios = within(grupo).getAllByRole('radio')
    expect(radios).toHaveLength(3)
    expect(within(grupo).getByRole('radio', { name: 'Español' })).toBeChecked()
    expect(within(grupo).getByText('Kichwa').closest('label')).toHaveAttribute('lang', 'qu-EC')
    expect(within(grupo).getByText('English').closest('label')).toHaveAttribute('lang', 'en')
  })

  it('elegir English cierra, devuelve el foco y cambia el lang del documento', () => {
    renderConIdioma(<SelectorIdioma />, 'es')
    fireEvent.click(screen.getByRole('button', { name: 'Idioma: ES' }))
    fireEvent.click(screen.getByRole('radio', { name: 'English' }), { detail: 1 })
    expect(screen.queryByRole('group')).toBeNull()
    const b = screen.getByRole('button', { name: 'Language: EN' })
    expect(b).toHaveFocus()
    expect(document.documentElement.lang).toBe('en')
  })

  it('con teclado, cambiar de radio no cierra; Intro cierra y devuelve el foco', () => {
    renderConIdioma(<SelectorIdioma />, 'es')
    fireEvent.click(screen.getByRole('button', { name: 'Idioma: ES' }))
    const kichwa = screen.getByRole('radio', { name: 'Kichwa' })
    fireEvent.click(kichwa, { detail: 0 })
    expect(document.documentElement.lang).toBe('qu-EC')
    expect(screen.getByRole('group')).toBeInTheDocument()
    fireEvent.keyDown(kichwa, { key: 'Enter' })
    expect(screen.queryByRole('group')).toBeNull()
    expect(screen.getByRole('button', { name: 'Shimi: QU' })).toHaveFocus()
  })

  it('Escape cierra y devuelve el foco', () => {
    renderConIdioma(<SelectorIdioma />, 'es')
    const b = screen.getByRole('button', { name: 'Idioma: ES' })
    fireEvent.click(b)
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.queryByRole('group')).toBeNull()
    expect(b).toHaveFocus()
  })

  it('un clic fuera cierra el panel', () => {
    renderConIdioma(<><SelectorIdioma /><p>fuera</p></>, 'es')
    fireEvent.click(screen.getByRole('button', { name: 'Idioma: ES' }))
    fireEvent.mouseDown(screen.getByText('fuera'))
    expect(screen.queryByRole('group')).toBeNull()
  })

  it('Review Focus 5: los códigos cortos caben en la barra inferior (≤ 7 caracteres)', () => {
    for (const i of IDIOMAS) expect(i.corto.length).toBeLessThanOrEqual(7)
  })
})

describe('AvisoTraduccion', () => {
  it('no aparece en español ni en inglés', () => {
    const { container: a } = renderConIdioma(<AvisoTraduccion />, 'es')
    expect(a).toBeEmptyDOMElement()
    const { container: b } = renderConIdioma(<AvisoTraduccion />, 'en')
    expect(b).toBeEmptyDOMElement()
  })

  it('en kichwa cuenta las claves validadas sobre el total', () => {
    renderConIdioma(<AvisoTraduccion />, 'qu')
    const texto = qu['idioma.aviso_qu']
      .replace('{validadas}', String(VALIDADAS_QU.size))
      .replace('{total}', String(Object.keys(qu).length))
    expect(screen.getByRole('note')).toHaveTextContent(texto)
  })

  it('con un catálogo pequeño: se oculta solo si todo está validado y el contenido largo también', () => {
    const claves = ['a.b', 'a.c']
    expect(datosAvisoQu(claves, new Set(['a.b', 'a.c']), true)).toBeNull()
    expect(datosAvisoQu(claves, new Set(['a.b', 'a.c']), false)).toEqual({ validadas: 2, total: 2 })
    expect(datosAvisoQu(claves, new Set(['a.b']), true)).toEqual({ validadas: 1, total: 2 })
    expect(datosAvisoQu([], new Set(), false)).toEqual({ validadas: 0, total: 0 })
  })
})

describe('Estructura y el selector', () => {
  const salud = { estado: 'ok', hay_sinteticos: true, origen_tipo: 'sintetico', proveedor: 'x', version: '1' }
  function montar(ruta: string) {
    vi.stubGlobal('fetch', vi.fn().mockImplementation((url: string) =>
      Promise.resolve(new Response(JSON.stringify(url.includes('/api/salud') ? salud : []))),
    ))
    const cliente = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    return render(
      <ProveedorIdioma inicial="es">
        <QueryClientProvider client={cliente}>
          <MemoryRouter initialEntries={[ruta]}>
            <Routes><Route element={<Estructura />}><Route index element={<p>hola</p>} /></Route></Routes>
          </MemoryRouter>
        </QueryClientProvider>
      </ProveedorIdioma>,
    )
  }

  it('el selector va en el riel, tras los destinos', () => {
    montar('/')
    const nav = screen.getByRole('navigation', { name: 'Principal' })
    expect(within(nav).getByRole('button', { name: 'Idioma: ES' })).toBeInTheDocument()
    expect(within(nav).getAllByRole('listitem')).toHaveLength(7)
  })

  it('con ?incrustado=1 no se muestra', () => {
    montar('/?incrustado=1')
    expect(screen.queryByRole('button', { name: /^Idioma/ })).toBeNull()
  })
})

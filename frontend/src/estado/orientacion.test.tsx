import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Estructura } from '../diseno/Estructura'
import { ProveedorIdioma } from '../idioma/ProveedorIdioma'
import type { CodigoIdioma } from '../idioma/idiomas'
import { useT } from '../idioma/useT'
import Fundamentos from '../pantallas/fundamentos/Fundamentos'
import Laboratorio from '../pantallas/laboratorio/Laboratorio'
import Recorrido from '../pantallas/recorrido/Recorrido'
import { useTituloPagina } from './useTituloPagina'

const SALTAR: Record<CodigoIdioma, string> = { es: 'Saltar al contenido', en: 'Skip to content', qu: 'Willaykunaman pasay' }

beforeEach(() => {
  // La API nunca responde: basta con la cabecera de cada pantalla.
  vi.stubGlobal('fetch', vi.fn(() => new Promise(() => {})))
})
afterEach(() => vi.unstubAllGlobals())

const cliente = () => new QueryClient({ defaultOptions: { queries: { retry: false } } })
const PRIMER_FOCO = 'a[href], button:not([disabled]), input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])'

function Pantalla() {
  useTituloPagina('titulos.observatorio')
  const { cambiarIdioma } = useT()
  return <button onClick={() => cambiarIdioma('en')}>cambiar</button>
}
function montarEstructura(idioma: CodigoIdioma) {
  return render(
    <ProveedorIdioma inicial={idioma}>
      <QueryClientProvider client={cliente()}>
        <MemoryRouter>
          <Routes><Route element={<Estructura />}><Route index element={<Pantalla />} /></Route></Routes>
        </MemoryRouter>
      </QueryClientProvider>
    </ProveedorIdioma>,
  )
}

describe('orientación', () => {
  it.each(['es', 'en', 'qu'] as CodigoIdioma[])('%s: el primer elemento enfocable es «Saltar al contenido» y lleva a #contenido', (idioma) => {
    const { container } = montarEstructura(idioma)
    const primero = container.querySelector<HTMLElement>(PRIMER_FOCO)!
    expect(primero).toHaveTextContent(SALTAR[idioma])
    fireEvent.click(primero)
    expect(document.activeElement).toBe(container.querySelector('main#contenido'))
  })

  it('document.title = «Observatorio · PACHA» y cambia con el idioma', () => {
    montarEstructura('es')
    expect(document.title).toBe('Observatorio · PACHA')
    act(() => { fireEvent.click(screen.getByText('cambiar')) })
    expect(document.title).toBe('Observatory · PACHA')
  })

  describe('encabezados', () => {
    const niveles = (raiz: HTMLElement) => [...raiz.querySelectorAll('h1,h2,h3,h4,h5,h6')].map((h) => Number(h.tagName[1]))
    const verificar = (raiz: HTMLElement) => {
      const n = niveles(raiz)
      expect(n.filter((x) => x === 1)).toHaveLength(1)
      n.forEach((x, i) => { if (i > 0) expect(x - n[i - 1]).toBeLessThanOrEqual(1) })
    }
    const envolver = (ui: React.ReactElement) => (
      <ProveedorIdioma inicial="es"><QueryClientProvider client={cliente()}><MemoryRouter>{ui}</MemoryRouter></QueryClientProvider></ProveedorIdioma>
    )
    it.each([['Fundamentos', <Fundamentos />], ['Recorrido', <Recorrido />], ['Laboratorio', <Laboratorio />]] as const)(
      '%s: un solo h1 y sin saltos de nivel', (_, ui) => {
        const { container } = render(envolver(ui))
        verificar(container)
      })
  })
})

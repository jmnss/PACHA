import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useHayDatosSinteticos } from './useHayDatosSinteticos'

const origen = (tipo: string) => ({ tipo, fuente: 't', fecha_generacion: '2026-01-01T00:00:00Z' })
const salud = (hay: boolean) => ({ estado: 'ok', hay_sinteticos: hay, origen_tipo: 'real', proveedor: 'x', version: '1' })

function montar(sal: unknown) {
  vi.stubGlobal('fetch', vi.fn().mockImplementation(() => Promise.resolve(new Response(JSON.stringify(sal)))))
  const cliente = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={cliente}>{children}</QueryClientProvider>
  )
  return { cliente, ...renderHook(() => useHayDatosSinteticos(), { wrapper }) }
}

afterEach(() => vi.unstubAllGlobals())

describe('useHayDatosSinteticos', () => {
  it('es true por defecto (fail-safe) y se activa con un origen sintético', async () => {
    const { result, cliente } = montar(salud(false))
    expect(result.current).toBe(true) // aún sin respuesta
    await waitFor(() => expect(result.current).toBe(false))
    act(() => cliente.setQueryData(['capa', 'a'], { origen: origen('sintetico') }))
    expect(result.current).toBe(true)
  })

  it('ignora orígenes reales', async () => {
    const { result, cliente } = montar(salud(false))
    await waitFor(() => expect(result.current).toBe(false))
    act(() => cliente.setQueryData(['capa', 'a'], { origen: origen('real') }))
    expect(result.current).toBe(false)
  })

  it('true si salud dice hay_sinteticos', async () => {
    const { result } = montar(salud(true))
    await new Promise((r) => setTimeout(r, 20))
    expect(result.current).toBe(true)
  })

  it('true si salud falla', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('x')))
    const cliente = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const { result } = renderHook(() => useHayDatosSinteticos(), {
      wrapper: ({ children }: { children: ReactNode }) => (
        <QueryClientProvider client={cliente}>{children}</QueryClientProvider>
      ),
    })
    await new Promise((r) => setTimeout(r, 20))
    expect(result.current).toBe(true)
  })
})

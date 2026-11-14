import { MutationObserver, QueryClient, QueryClientProvider } from '@tanstack/react-query'
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

  it.each(['synthetic', 'Sintetico', '', 'desconocido'])('un origen de tipo «%s» cuenta como sintético', async (tipo) => {
    const { result, cliente } = montar(salud(false))
    await waitFor(() => expect(result.current).toBe(false))
    act(() => cliente.setQueryData(['capa', 'a'], { origen: origen(tipo) }))
    expect(result.current).toBe(true)
  })

  it('un origen null o sin tipo cuenta como sintético', async () => {
    const { result, cliente } = montar(salud(false))
    await waitFor(() => expect(result.current).toBe(false))
    act(() => cliente.setQueryData(['capa', 'a'], { origen: null }))
    expect(result.current).toBe(true)
    act(() => cliente.setQueryData(['capa', 'a'], { origen: {} }))
    expect(result.current).toBe(true)
  })

  it('true si salud dice hay_sinteticos', async () => {
    const { result, cliente } = montar(salud(true))
    await waitFor(() => expect(cliente.getQueryState(['salud'])?.status).toBe('success'))
    expect(result.current).toBe(true)
  })

  it('false con hay_sinteticos=false y la caché sin datos de origen', async () => {
    const { result, cliente } = montar(salud(false))
    await waitFor(() => expect(cliente.getQueryState(['salud'])?.status).toBe('success'))
    expect(cliente.getQueryCache().getAll().filter((q) => q.queryKey[0] !== 'salud')).toHaveLength(0)
    expect(result.current).toBe(false)
  })

  it('una simulación (mutación) sintética en caché activa la banda', async () => {
    const { result, cliente } = montar(salud(false))
    await waitFor(() => expect(result.current).toBe(false))
    await act(async () => {
      await new MutationObserver(cliente, { mutationFn: async () => ({ origen: origen('sintetico') }) }).mutate()
    })
    await waitFor(() => expect(result.current).toBe(true))
  })

  it('una simulación real en caché no la activa', async () => {
    const { result, cliente } = montar(salud(false))
    await waitFor(() => expect(result.current).toBe(false))
    await act(async () => {
      await new MutationObserver(cliente, { mutationFn: async () => ({ origen: origen('real') }) }).mutate()
    })
    expect(cliente.getMutationCache().getAll()).toHaveLength(1)
    expect(result.current).toBe(false)
  })

  it('true si salud falla', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('x')))
    const cliente = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const { result } = renderHook(() => useHayDatosSinteticos(), {
      wrapper: ({ children }: { children: ReactNode }) => (
        <QueryClientProvider client={cliente}>{children}</QueryClientProvider>
      ),
    })
    await waitFor(() => expect(cliente.getQueryState(['salud'])?.status).toBe('error'))
    expect(result.current).toBe(true)
  })
})

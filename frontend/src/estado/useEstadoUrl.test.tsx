import { act, renderHook } from '@testing-library/react'
import type { ReactNode } from 'react'
import { MemoryRouter, useLocation } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { useEstadoUrl, type Esquema } from './useEstadoUrl'

const esquema = {
  escenario: { tipo: 'string', porDefecto: 'guayas' },
  modo: { tipo: 'enum', valores: ['antes', 'despues', 'cambio'] as const, porDefecto: 'cambio' },
  zoom: { tipo: 'number', porDefecto: 8, min: 1, max: 15 },
} as const satisfies Esquema

function montar(url: string) {
  const wrapper = ({ children }: { children: ReactNode }) => (
    <MemoryRouter initialEntries={[url]}>{children}</MemoryRouter>
  )
  return renderHook(() => ({ e: useEstadoUrl(esquema), loc: useLocation() }), { wrapper })
}

describe('useEstadoUrl', () => {
  it('ida y vuelta e ignora valores inválidos', () => {
    const { result } = montar('/?modo=roto&zoom=abc&escenario=manabi')
    expect(result.current.e[0]).toEqual({ escenario: 'manabi', modo: 'cambio', zoom: 8 })

    act(() => result.current.e[1]({ modo: 'antes', zoom: 12 }))
    expect(result.current.e[0]).toMatchObject({ modo: 'antes', zoom: 12, escenario: 'manabi' })
    expect(result.current.loc.search).toContain('modo=antes')
    expect(result.current.loc.search).toContain('zoom=12')

    // valor por defecto se quita de la URL
    act(() => result.current.e[1]({ modo: 'cambio' }))
    expect(result.current.loc.search).not.toContain('modo=')
  })

  it('fuera de rango numérico cae al valor por defecto', () => {
    const { result } = montar('/?zoom=99')
    expect(result.current.e[0].zoom).toBe(8)
  })
})

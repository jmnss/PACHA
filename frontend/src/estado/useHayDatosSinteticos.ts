import { useQueryClient } from '@tanstack/react-query'
import { useCallback, useSyncExternalStore } from 'react'
import type { Salud } from '../api/consultas'
import { useSalud } from '../api/consultas'

/** ¿Algún valor (a poca profundidad) lleva `origen.tipo === 'sintetico'`? */
export function contieneSintetico(valor: unknown, profundidad = 4): boolean {
  if (!valor || typeof valor !== 'object' || profundidad < 0) return false
  if (Array.isArray(valor)) return valor.some((v) => contieneSintetico(v, profundidad - 1))
  const o = valor as Record<string, unknown>
  const origen = o.origen
  if (origen && typeof origen === 'object' && (origen as { tipo?: unknown }).tipo === 'sintetico') {
    return true
  }
  return Object.values(o).some((v) => contieneSintetico(v, profundidad - 1))
}

/**
 * Fail-safe de honestidad: true mientras no se sepa lo contrario. Solo es false cuando
 * `/api/salud` respondió `hay_sinteticos === false` y ninguna respuesta cacheada es sintética.
 */
export function useHayDatosSinteticos(): boolean {
  const cliente = useQueryClient()
  useSalud()

  const suscribir = useCallback(
    (aviso: () => void) => {
      const a = cliente.getQueryCache().subscribe(aviso)
      const b = cliente.getMutationCache().subscribe(aviso)
      return () => {
        a()
        b()
      }
    },
    [cliente],
  )

  const calcular = useCallback((): boolean => {
    const salud = cliente.getQueryData<Salud>(['salud'])
    if (!salud || salud.hay_sinteticos !== false) return true
    const consultas = cliente.getQueryCache().getAll()
    if (consultas.some((q) => contieneSintetico(q.state.data))) return true
    return cliente.getMutationCache().getAll().some((m) => contieneSintetico(m.state.data))
  }, [cliente])

  return useSyncExternalStore(suscribir, calcular, () => true)
}

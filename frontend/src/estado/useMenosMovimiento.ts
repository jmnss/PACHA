import { useEffect, useState } from 'react'

const CONSULTA = '(prefers-reduced-motion: reduce)'

/** ¿El usuario pidió menos movimiento? Lectura puntual; sin matchMedia (pruebas) es falso. */
export function prefiereMenosMovimiento(): boolean {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function'
    && !!window.matchMedia(CONSULTA)?.matches
}

/** Verdadero con `prefers-reduced-motion: reduce`; escucha los cambios del sistema (docs/diseno.md §9). */
export function useMenosMovimiento(): boolean {
  const [reducido, setReducido] = useState(prefiereMenosMovimiento)
  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return
    const m = window.matchMedia(CONSULTA)
    if (!m) return
    const alCambiar = () => setReducido(m.matches)
    alCambiar()
    m.addEventListener?.('change', alCambiar)
    return () => m.removeEventListener?.('change', alCambiar)
  }, [])
  return reducido
}

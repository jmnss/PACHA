import { useEffect, useState } from 'react'

const CONSULTA = '(max-width: 699px)'

/** Verdadero en móvil (menos de 700 px, docs/diseno.md §10); sin matchMedia (pruebas) es falso. */
export function useMovil(): boolean {
  const leer = () => typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia(CONSULTA).matches
  const [movil, setMovil] = useState(leer)
  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return
    const m = window.matchMedia(CONSULTA)
    const alCambiar = () => setMovil(m.matches)
    alCambiar()
    m.addEventListener?.('change', alCambiar)
    return () => m.removeEventListener?.('change', alCambiar)
  }, [])
  return movil
}

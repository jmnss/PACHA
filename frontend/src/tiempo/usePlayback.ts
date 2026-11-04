import { useCallback, useEffect, useRef, useState } from 'react'

/** ¿El usuario pidió menos movimiento? Se consulta en cada uso, no al montar. */
export function prefiereMenosMovimiento(): boolean {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

interface Opciones {
  total: number
  intervaloMs: number
}

/**
 * Reproductor por índices (0 … total-1).
 * - Avanza un índice cada `intervaloMs` y se detiene en el último.
 * - `play` estando en el último índice reinicia desde 0.
 * - Con `prefers-reduced-motion: reduce` nada arranca solo: `play` avanza UN paso por pulsación
 *   (y desde el final vuelve a 0) y `reproduciendo` nunca pasa a verdadero (docs/diseno.md §9).
 * - Los temporizadores se limpian al desmontar o al cambiar de intervalo.
 */
export function usePlayback({ total, intervaloMs }: Opciones) {
  const [indice, setIndice] = useState(0)
  const [reproduciendo, setReproduciendo] = useState(false)
  const ultimo = Math.max(0, total - 1)
  const indiceRef = useRef(indice)
  indiceRef.current = indice

  const ir = useCallback((i: number) => {
    setIndice(Math.min(ultimo, Math.max(0, Math.round(i))))
  }, [ultimo])

  const pausa = useCallback(() => setReproduciendo(false), [])

  const paso = useCallback((delta: number) => {
    setReproduciendo(false)
    ir(indiceRef.current + delta)
  }, [ir])

  const play = useCallback(() => {
    if (total < 2) return
    if (prefiereMenosMovimiento()) {
      setReproduciendo(false)
      ir(indiceRef.current >= ultimo ? 0 : indiceRef.current + 1)
      return
    }
    if (indiceRef.current >= ultimo) setIndice(0)
    setReproduciendo(true)
  }, [total, ultimo, ir])

  useEffect(() => {
    if (!reproduciendo) return
    const t = setTimeout(() => {
      const siguiente = Math.min(ultimo, indiceRef.current + 1)
      setIndice(siguiente)
      if (siguiente >= ultimo) setReproduciendo(false)
    }, intervaloMs)
    return () => clearTimeout(t)
  }, [reproduciendo, indice, intervaloMs, ultimo])

  // Si el total se reduce, el índice se recorta.
  useEffect(() => {
    setIndice((i) => Math.min(i, ultimo))
  }, [ultimo])

  return { indice, reproduciendo, play, pausa, ir, paso }
}

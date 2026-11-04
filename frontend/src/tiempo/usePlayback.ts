import { useCallback, useEffect, useRef, useState } from 'react'

/** ¿El usuario pidió menos movimiento? Se consulta en cada uso, no al montar. */
export function prefiereMenosMovimiento(): boolean {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

interface Opciones {
  total: number
  intervaloMs: number
  /** Se llama con el índice nuevo cuando el propio reproductor lo mueve (temporizador, play, paso).
   *  `ir` no lo llama: es la vía para sincronizar desde fuera sin eco (p. ej. tras un arrastre). */
  onIndice?: (i: number) => void
}

/**
 * Reproductor por índices (0 … total-1).
 * - Avanza un índice cada `intervaloMs` y se detiene en el último.
 * - `play` estando en el último índice reinicia desde 0.
 * - Con `prefers-reduced-motion: reduce` nada arranca solo: `play` avanza UN paso por pulsación
 *   (y desde el final vuelve a 0) y `reproduciendo` nunca pasa a verdadero (docs/diseno.md §9).
 * - Los temporizadores se limpian al desmontar o al cambiar de intervalo.
 */
export function usePlayback({ total, intervaloMs, onIndice }: Opciones) {
  const [indice, setIndice] = useState(0)
  const [reproduciendo, setReproduciendo] = useState(false)
  const ultimo = Math.max(0, total - 1)
  const indiceRef = useRef(indice)
  indiceRef.current = indice
  const onIndiceRef = useRef(onIndice)
  onIndiceRef.current = onIndice

  const ir = useCallback((i: number) => {
    setIndice(Math.min(ultimo, Math.max(0, Math.round(i))))
  }, [ultimo])

  /** Mueve el índice por iniciativa del reproductor y avisa. */
  const mover = useCallback((i: number) => {
    const j = Math.min(ultimo, Math.max(0, Math.round(i)))
    setIndice(j)
    onIndiceRef.current?.(j)
    return j
  }, [ultimo])

  const pausa = useCallback(() => setReproduciendo(false), [])

  const paso = useCallback((delta: number) => {
    setReproduciendo(false)
    mover(indiceRef.current + delta)
  }, [mover])

  const play = useCallback(() => {
    if (total < 2) return
    if (prefiereMenosMovimiento()) {
      setReproduciendo(false)
      mover(indiceRef.current >= ultimo ? 0 : indiceRef.current + 1)
      return
    }
    if (indiceRef.current >= ultimo) mover(0)
    setReproduciendo(true)
  }, [total, ultimo, mover])

  useEffect(() => {
    if (!reproduciendo) return
    const t = setTimeout(() => {
      const siguiente = mover(indiceRef.current + 1)
      if (siguiente >= ultimo) setReproduciendo(false)
    }, intervaloMs)
    return () => clearTimeout(t)
  }, [reproduciendo, indice, intervaloMs, ultimo, mover])

  // Si el total se reduce, el índice se recorta.
  useEffect(() => {
    setIndice((i) => Math.min(i, ultimo))
  }, [ultimo])

  return { indice, reproduciendo, play, pausa, ir, paso }
}

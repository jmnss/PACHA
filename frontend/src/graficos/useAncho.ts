import { useEffect, useRef, useState } from 'react'

/** Ancho real del contenedor (el SVG se dibuja 1:1 para que el texto mida siempre 12 px). */
export function useAncho(inicial = 640) {
  const ref = useRef<HTMLDivElement>(null)
  const [ancho, setAncho] = useState(inicial)
  useEffect(() => {
    const el = ref.current
    if (!el || typeof ResizeObserver === 'undefined') return
    const medir = () => {
      const w = Math.round(el.getBoundingClientRect().width)
      if (w > 0) setAncho(w)
    }
    medir()
    const ro = new ResizeObserver(medir)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  return { ref, ancho }
}

const NUM = new Intl.NumberFormat('es-EC', { maximumFractionDigits: 2 })
export const formatoNumero = (v: number) => NUM.format(v)

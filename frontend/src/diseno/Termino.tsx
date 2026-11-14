import { useEffect, useId, useLayoutEffect, useRef, useState, type CSSProperties, type KeyboardEvent } from 'react'

interface Props {
  nombre: string
  explicacion: string
}

/** Término técnico: subrayado punteado; clic, Enter o Espacio abre la explicación; Escape la cierra. */
export function Termino({ nombre, explicacion }: Props) {
  const [abierto, setAbierto] = useState(false)
  const id = useId()
  const raiz = useRef<HTMLSpanElement>(null)
  const boton = useRef<HTMLButtonElement>(null)
  const panel = useRef<HTMLSpanElement>(null)
  const [desfase, setDesfase] = useState(0)

  // Mantiene el panel dentro de la pantalla (margen de 16 px, la escala --space-4).
  useLayoutEffect(() => {
    if (!abierto || !panel.current) return
    const margen = 16
    const r = panel.current.getBoundingClientRect()
    const sinDesfase = r.left - desfase
    const ancho = r.width
    const maxIzq = window.innerWidth - margen - ancho
    setDesfase(Math.max(margen, Math.min(sinDesfase, maxIzq)) - sinDesfase)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [abierto])

  useEffect(() => {
    if (!abierto) return
    const fuera = (e: MouseEvent) => {
      if (raiz.current && !raiz.current.contains(e.target as Node)) setAbierto(false)
    }
    document.addEventListener('mousedown', fuera)
    return () => document.removeEventListener('mousedown', fuera)
  }, [abierto])

  const alTeclear = (e: KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      setAbierto((a) => !a)
    } else if (e.key === 'Escape' && abierto) {
      setAbierto(false)
      boton.current?.focus()
    }
  }

  return (
    <span className="termino" ref={raiz}>
      <button
        ref={boton}
        type="button"
        className="termino__nombre"
        aria-expanded={abierto}
        aria-controls={id}
        onClick={() => setAbierto((a) => !a)}
        onKeyDown={alTeclear}
        onKeyUp={(e) => (e.key === ' ') && e.preventDefault()}
      >
        {nombre}
      </button>
      {abierto && (
        <span
          id={id}
          ref={panel}
          role="note"
          className="termino__panel"
          style={{ '--desfase-termino': `${desfase}px` } as CSSProperties}
        >
          {explicacion}
        </span>
      )}
    </span>
  )
}

import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react'

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
      e.stopPropagation()
      setAbierto(false)
      boton.current?.focus()
    }
  }

  return (
    <span className="termino" ref={raiz} onKeyDown={(e) => e.key === 'Escape' && alTeclear(e)}>
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
        <span id={id} role="note" className="termino__panel">
          {explicacion}
        </span>
      )}
    </span>
  )
}

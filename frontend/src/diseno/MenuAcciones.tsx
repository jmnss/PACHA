import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react'
import { IconoMasAcciones } from './iconos'

export interface AccionMenu {
  id: string
  texto: string
  alElegir: () => void
  presionada?: boolean
}

interface Props {
  etiqueta: string
  acciones: AccionMenu[]
}

/**
 * Menú de acciones secundarias para móvil: botón de tres puntos y lista `role="menu"`.
 * Escape o un clic fuera lo cierran y el foco vuelve al botón; las flechas recorren los elementos.
 */
export function MenuAcciones({ etiqueta, acciones }: Props) {
  const [abierto, setAbierto] = useState(false)
  const idLista = useId()
  const raiz = useRef<HTMLDivElement>(null)
  const botonRef = useRef<HTMLButtonElement>(null)
  const lista = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!abierto) return
    lista.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus()
    const fuera = (e: MouseEvent) => {
      if (raiz.current && !raiz.current.contains(e.target as Node)) setAbierto(false)
    }
    document.addEventListener('mousedown', fuera)
    return () => document.removeEventListener('mousedown', fuera)
  }, [abierto])

  const alTeclear = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.stopPropagation()
      setAbierto(false)
      botonRef.current?.focus()
      return
    }
    const items = Array.from(lista.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? [])
    const i = items.indexOf(document.activeElement as HTMLElement)
    if (e.key === 'ArrowDown') { e.preventDefault(); items[(i + 1) % items.length]?.focus() }
    else if (e.key === 'ArrowUp') { e.preventDefault(); items[(i - 1 + items.length) % items.length]?.focus() }
    else if (e.key === 'Home') { e.preventDefault(); items[0]?.focus() }
    else if (e.key === 'End') { e.preventDefault(); items[items.length - 1]?.focus() }
    else if (e.key === 'Tab') setAbierto(false)
  }

  const elegir = (a: AccionMenu) => {
    botonRef.current?.focus()
    setAbierto(false)
    a.alElegir()
  }

  return (
    <div className="menu-acciones" ref={raiz}>
      <button
        type="button"
        className="boton boton--terciario menu-acciones__boton"
        ref={botonRef}
        aria-label={etiqueta}
        aria-haspopup="menu"
        aria-expanded={abierto}
        aria-controls={abierto ? idLista : undefined}
        onClick={() => setAbierto((a) => !a)}
      >
        <IconoMasAcciones />
      </button>
      {abierto && (
        <div className="menu-acciones__lista" role="menu" id={idLista} aria-label={etiqueta} ref={lista} onKeyDown={alTeclear}>
          {acciones.map((a) => (
            <button
              key={a.id}
              type="button"
              role="menuitem"
              className="menu-acciones__item"
              aria-pressed={a.presionada}
              onClick={() => elegir(a)}
            >
              {a.texto}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

import { useEffect, useId, useRef, type KeyboardEvent, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { useT } from '../idioma/useT'
import { Boton } from './Boton'
import { IconoCerrar } from './iconos'

interface Props {
  titulo: string
  onCerrar: () => void
  children: ReactNode
}

const ENFOCABLES = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

/**
 * Hoja inferior de móvil (docs/diseno.md §10): diálogo modal que se cierra con el botón, con Escape
 * o tocando el fondo; atrapa el foco y lo devuelve a quien la abrió. Se monta solo cuando está abierta.
 */
export function HojaInferior({ titulo, onCerrar, children }: Props) {
  const { t } = useT()
  const idTitulo = useId()
  const hoja = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const previo = document.activeElement as HTMLElement | null
    hoja.current?.focus()
    return () => previo?.focus?.()
  }, [])

  const alTeclear = (e: KeyboardEvent) => {
    if (e.key === 'Escape') { e.stopPropagation(); onCerrar(); return }
    if (e.key !== 'Tab' || !hoja.current) return
    const lista = Array.from(hoja.current.querySelectorAll<HTMLElement>(ENFOCABLES))
    if (!lista.length) return
    const [primero, ultimo] = [lista[0], lista[lista.length - 1]]
    const activo = document.activeElement
    if (e.shiftKey && (activo === primero || !hoja.current.contains(activo))) { e.preventDefault(); ultimo.focus() }
    else if (!e.shiftKey && (activo === ultimo || !hoja.current.contains(activo))) { e.preventDefault(); primero.focus() }
  }

  return createPortal(
    <div className="hoja" onKeyDown={alTeclear}>
      <div className="hoja__fondo" onClick={onCerrar} aria-hidden="true" />
      <div className="hoja__panel" role="dialog" aria-modal="true" aria-labelledby={idTitulo} ref={hoja} tabIndex={-1}>
        <div className="hoja__cabecera">
          <h2 className="hoja__titulo" id={idTitulo}>{titulo}</h2>
          <Boton variante="terciario" aria-label={t('comun.cerrar')} icono={<IconoCerrar tamano={14} />} onClick={onCerrar} />
        </div>
        <div className="hoja__cuerpo">{children}</div>
      </div>
    </div>,
    document.body,
  )
}

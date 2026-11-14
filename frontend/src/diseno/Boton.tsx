import type { ButtonHTMLAttributes, ReactNode } from 'react'

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variante?: 'primario' | 'secundario' | 'terciario'
  icono?: ReactNode
}

/** Un solo primario por pantalla (píldora blanca, texto negro). Foco: anillo de 2 px blanco. */
export function Boton({ variante = 'secundario', icono, children, className, type = 'button', ...resto }: Props) {
  return (
    <button type={type} className={`boton boton--${variante} ${className ?? ''}`.trim()} {...resto}>
      {icono}
      {children}
    </button>
  )
}

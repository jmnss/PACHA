import type { ReactNode } from 'react'

interface Props {
  titulo?: string
  children: ReactNode
  pie?: ReactNode
  className?: string
}

/** Tarjeta de 6 px más oscura que el fondo, sin sombra. El pie suele ser el SelloOrigen. */
export function Tarjeta({ titulo, children, pie, className }: Props) {
  return (
    <section className={`tarjeta ${className ?? ''}`.trim()}>
      {titulo && <h2 className="tarjeta__titulo">{titulo}</h2>}
      <div className="tarjeta__cuerpo">{children}</div>
      {pie && <div className="tarjeta__pie">{pie}</div>}
    </section>
  )
}

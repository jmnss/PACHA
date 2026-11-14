import { useEffect, useRef, type ReactNode } from 'react'
import { enfocarTitulo } from '../estado/navegacion'

interface Props {
  titulo: string
  hallazgo?: string
  /** Línea de apoyo bajo el hallazgo (p. ej. qué observa el radar). */
  detalle?: ReactNode
  acciones?: ReactNode
  frescura?: string
}

/** Título 26/700, línea gris con el hallazgo, a la derecha solo acciones reales y la frescura. */
export function CabeceraPantalla({ titulo, hallazgo, detalle, acciones, frescura }: Props) {
  const h1 = useRef<HTMLHeadingElement>(null)
  useEffect(() => { enfocarTitulo(h1.current) }, [])
  return (
    <header className="cabecera">
      <div className="cabecera__texto">
        <h1 ref={h1} tabIndex={-1} className="cabecera__titulo">{titulo}</h1>
        {hallazgo && <p className="cabecera__hallazgo">{hallazgo}</p>}
        {detalle && <p className="cabecera__detalle">{detalle}</p>}
      </div>
      {(acciones || frescura) && (
        <div className="cabecera__lado">
          {acciones}
          {frescura && <span className="cabecera__frescura num">{frescura}</span>}
        </div>
      )}
    </header>
  )
}

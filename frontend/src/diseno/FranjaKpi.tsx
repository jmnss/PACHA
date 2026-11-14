import type { ReactNode } from 'react'

export interface Kpi {
  etiqueta: ReactNode
  valor: ReactNode
  unidad?: string
  /** Base de una cifra relativa: «frente a la pasada anterior, 24 abr». */
  base?: string
  /** La cifra de la respuesta: 1,3 veces mayor que sus vecinas. */
  principal?: boolean
}

/** Contenedor dividido por líneas de 1 px: sin tarjeta propia, sin iconos, sin sparklines. */
export function FranjaKpi({ items }: { items: Kpi[] }) {
  return (
    <dl className="franja-kpi">
      {items.map((k, i) => (
        <div key={i} className={`franja-kpi__item${k.principal ? ' franja-kpi__item--principal' : ''}`}>
          <dt className="franja-kpi__etiqueta">{k.etiqueta}</dt>
          <dd className="franja-kpi__valor num">
            {k.valor}
            {k.unidad && <span className="franja-kpi__unidad"> {k.unidad}</span>}
          </dd>
          {k.base && <dd className="franja-kpi__base">{k.base}</dd>}
        </div>
      ))}
    </dl>
  )
}

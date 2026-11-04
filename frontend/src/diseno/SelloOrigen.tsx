import { textoSello, type Origen } from './origen'

/** Línea de 12 px --muted al pie de cada mapa, gráfico, comparador y tabla. Nunca se omite. */
export function SelloOrigen({ origen }: { origen: Origen }) {
  return (
    <p className="sello-origen" data-origen={origen.tipo}>
      {textoSello(origen)}
    </p>
  )
}

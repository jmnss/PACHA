import { useT } from '../idioma/useT'
import { textoSello, type Origen } from './origen'

/** Línea de 12 px --muted al pie de cada mapa, gráfico, comparador y tabla. Nunca se omite. */
export function SelloOrigen({ origen }: { origen: Origen }) {
  const { t } = useT()
  return (
    <p className="sello-origen" data-origen={origen.tipo} {...(origen.tipo === 'real' ? { 'data-no-traducir': '' } : {})}>
      {textoSello(origen, t)}
    </p>
  )
}

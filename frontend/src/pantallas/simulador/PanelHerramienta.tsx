import type { Control, Herramienta } from '../../api/simulador'
import { Campo } from '../../diseno/Campo'
import { Deslizador } from '../../diseno/Deslizador'
import { Interruptor } from '../../diseno/Interruptor'
import { Selector } from '../../diseno/Selector'
import { TextoApi } from '../../idioma/TextoApi'
import { useT } from '../../idioma/useT'
import type { ValorParametro } from './estadoSimulador'
import type { Valores } from './valores'

interface Props {
  herramienta: Herramienta
  valores: Valores
  onCambio: (id: string, valor: ValorParametro) => void
  /** Control con valor por defecto que depende del mundo (p. ej. la humedad del combustible). */
  defectos?: Valores
}

function Control({ c, valor, onCambio }: { c: Control; valor: ValorParametro; onCambio: Props['onCambio'] }) {
  const { formatoNumero, textoApi } = useT()
  // Etiqueta y ayuda las escribe la API: sin clave se ven en español marcados con lang="es".
  const etiqueta = <TextoApi texto={c.etiqueta} />
  const ayuda = c.ayuda ? <TextoApi texto={c.ayuda} /> : undefined
  if (c.tipo === 'numero' && c.minimo !== null && c.maximo !== null && c.paso !== null) {
    const num = Number(valor)
    const texto = `${formatoNumero(num * c.escala, { maximumFractionDigits: 2 })}${c.unidad ? ` ${c.unidad}` : ''}`
    return (
      <Deslizador etiqueta={etiqueta} valorTexto={texto} limite={ayuda}
        min={c.minimo} max={c.maximo} step={c.paso} value={num}
        onChange={(e) => onCambio(c.id, Number(e.target.value))} />
    )
  }
  if (c.tipo === 'seleccion') {
    return (
      <Selector etiqueta={etiqueta} value={String(valor)} limite={ayuda}
        opciones={(c.opciones ?? []).map((o) => { const r = textoApi(o); return { valor: o, texto: r.texto, lang: r.traducido ? undefined : 'es' } })} onChange={(e) => onCambio(c.id, e.target.value)} />
    )
  }
  if (c.tipo === 'interruptor') return <Interruptor etiqueta={etiqueta} activo={valor === true} onCambiar={(a) => onCambio(c.id, a)} />
  return <Campo etiqueta={etiqueta} value={String(valor)} maxLength={40} limite={ayuda} onChange={(e) => onCambio(c.id, e.target.value)} />
}

/** Controles de la herramienta elegida, generados desde el catálogo de la API. */
export function PanelHerramienta({ herramienta, valores, onCambio }: Props) {
  return (
    <div className="panel-herramienta">
      {herramienta.controles.map((c) => (
        <Control key={c.id} c={c} valor={valores[c.id] ?? (c.defecto as ValorParametro)} onCambio={onCambio} />
      ))}
    </div>
  )
}

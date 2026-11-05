import type { Control, Herramienta } from '../../api/simulador'
import { Campo } from '../../diseno/Campo'
import { Deslizador } from '../../diseno/Deslizador'
import { Interruptor } from '../../diseno/Interruptor'
import { Selector } from '../../diseno/Selector'
import type { ValorParametro } from './estadoSimulador'
import type { Valores } from './valores'

const formato = new Intl.NumberFormat('es-EC', { maximumFractionDigits: 2 })

interface Props {
  herramienta: Herramienta
  valores: Valores
  onCambio: (id: string, valor: ValorParametro) => void
  /** Control con valor por defecto que depende del mundo (p. ej. la humedad del combustible). */
  defectos?: Valores
}

function Control({ c, valor, onCambio }: { c: Control; valor: ValorParametro; onCambio: Props['onCambio'] }) {
  if (c.tipo === 'numero' && c.minimo !== null && c.maximo !== null && c.paso !== null) {
    const num = Number(valor)
    const texto = `${formato.format(num * c.escala)}${c.unidad ? ` ${c.unidad}` : ''}`
    return (
      <Deslizador etiqueta={c.etiqueta} valorTexto={texto} limite={c.ayuda || undefined}
        min={c.minimo} max={c.maximo} step={c.paso} value={num}
        onChange={(e) => onCambio(c.id, Number(e.target.value))} />
    )
  }
  if (c.tipo === 'seleccion') {
    return (
      <Selector etiqueta={c.etiqueta} value={String(valor)} limite={c.ayuda || undefined}
        opciones={(c.opciones ?? []).map((o) => ({ valor: o, texto: o }))} onChange={(e) => onCambio(c.id, e.target.value)} />
    )
  }
  if (c.tipo === 'interruptor') return <Interruptor etiqueta={c.etiqueta} activo={valor === true} onCambiar={(a) => onCambio(c.id, a)} />
  return <Campo etiqueta={c.etiqueta} value={String(valor)} maxLength={40} limite={c.ayuda || undefined} onChange={(e) => onCambio(c.id, e.target.value)} />
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

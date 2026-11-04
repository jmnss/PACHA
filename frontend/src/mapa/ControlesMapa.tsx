import { Deslizador } from '../diseno/Deslizador'
import { Pestanas } from '../diseno/Pestanas'
import { MAPAS_BASE, type MapaBaseId } from './estilo'

interface Props {
  base: MapaBaseId
  onBase: (id: MapaBaseId) => void
  /** 0–1: opacidad de la capa de datos. */
  opacidad: number
  onOpacidad: (valor: number) => void
  /** Sin red no hay mapas base que elegir: solo queda la opacidad. */
  conBases: boolean
}

/** Selector de mapa base y opacidad de la capa de datos: placa flotante sobre el mapa. */
export function ControlesMapa({ base, onBase, opacidad, onOpacidad, conBases }: Props) {
  return (
    <div className="controles-mapa">
      {conBases && (
        <Pestanas etiqueta="Mapa base" pestanas={MAPAS_BASE.map((b) => ({ id: b.id, etiqueta: b.nombre }))}
          activa={base} onCambiar={(id) => onBase(id as MapaBaseId)} />
      )}
      <Deslizador etiqueta="Opacidad de la capa" valorTexto={`${Math.round(opacidad * 100)} %`}
        min={10} max={100} step={5} value={Math.round(opacidad * 100)}
        onChange={(e) => onOpacidad(Number(e.target.value) / 100)} />
    </div>
  )
}

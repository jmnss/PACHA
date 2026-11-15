import type { Clave } from '../idioma/traductor'
import { useT } from '../idioma/useT'
import { Deslizador } from '../diseno/Deslizador'
import { ControlSegmentado } from '../diseno/ControlSegmentado'
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
const CLAVE_BASE: Record<MapaBaseId, Clave> = {
  oscuro: 'piezas.mapa.base_oscuro',
  satelite: 'piezas.mapa.base_satelite',
  relieve: 'piezas.mapa.base_relieve',
}

export function ControlesMapa({ base, onBase, opacidad, onOpacidad, conBases }: Props) {
  const { t } = useT()
  return (
    <div className="controles-mapa">
      {conBases && (
        <ControlSegmentado etiqueta={t('piezas.mapa.base')} opciones={MAPAS_BASE.map((b) => ({ id: b.id, etiqueta: t(CLAVE_BASE[b.id]) }))}
          valor={base} onCambiar={(id) => onBase(id as MapaBaseId)} />
      )}
      <Deslizador etiqueta={t('piezas.mapa.opacidad')} valorTexto={`${Math.round(opacidad * 100)} %`}
        min={10} max={100} step={5} value={Math.round(opacidad * 100)}
        onChange={(e) => onOpacidad(Number(e.target.value) / 100)} />
    </div>
  )
}

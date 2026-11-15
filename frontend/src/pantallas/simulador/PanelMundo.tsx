import type { Catalogo } from '../../api/simulador'
import { Boton } from '../../diseno/Boton'
import { Campo } from '../../diseno/Campo'
import { Interruptor } from '../../diseno/Interruptor'
import { Selector } from '../../diseno/Selector'
import { useT } from '../../idioma/useT'
import { PROPIO, type BorradorMundo, type BorradorMundoEstado } from './useBorradorMundo'

export type { BorradorMundo }

interface Props {
  catalogo: Catalogo
  /** Borrador y preset, elevados a `Simulador`. */
  borrador: BorradorMundoEstado
  cargando: boolean
  /** Rehace el mundo con el borrador. */
  onCrear: (b: BorradorMundo) => void
}

/** Coordenadas propias, lado del mundo, fecha y relieve (dentro de «Avanzado»); se aplican con el botón. */
export function PanelMundo({ catalogo, borrador, cargando, onCrear }: Props) {
  const { t } = useT()
  const { b, setB, setPreset } = borrador
  const num = (campo: 'lat' | 'lon') => (e: React.ChangeEvent<HTMLInputElement>) => {
    setPreset(PROPIO)
    setB((v) => ({ ...v, [campo]: e.target.value === '' ? NaN : Number(e.target.value) }))
  }
  const valido = Number.isFinite(b.lat) && Number.isFinite(b.lon) && /^\d{4}-\d{2}-\d{2}$/.test(b.fecha)

  return (
    <form className="panel-herramienta" onSubmit={(e) => { e.preventDefault(); if (valido) onCrear(b) }}>
      <div className="simulador__fila">
        <Campo etiqueta={t('sim.mundo.latitud')} type="number" step="0.01" value={Number.isFinite(b.lat) ? b.lat : ''} onChange={num('lat')} />
        <Campo etiqueta={t('sim.mundo.longitud')} type="number" step="0.01" value={Number.isFinite(b.lon) ? b.lon : ''} onChange={num('lon')} />
      </div>
      <div className="simulador__fila">
        <Selector etiqueta={t('sim.mundo.lado')} value={String(b.ext)} onChange={(e) => setB({ ...b, ext: Number(e.target.value) })}
          opciones={catalogo.extensiones_km.map((k) => ({ valor: String(k), texto: t('sim.mundo.km', { k }) }))} />
        <Campo etiqueta={t('sim.mundo.fecha')} type="date" value={b.fecha} onChange={(e) => setB({ ...b, fecha: e.target.value })} />
      </div>
      <Interruptor etiqueta={t('sim.mundo.relieve_real')} activo={b.dem} onCambiar={(dem) => setB({ ...b, dem })} />
      <Boton variante="secundario" type="submit" disabled={!valido || cargando}>{cargando ? t('sim.mundo.creando') : t('sim.mundo.aplicar')}</Boton>
    </form>
  )
}

import { useEffect, useState } from 'react'
import type { Catalogo } from '../../api/simulador'
import { Boton } from '../../diseno/Boton'
import { Campo } from '../../diseno/Campo'
import { Interruptor } from '../../diseno/Interruptor'
import { Selector } from '../../diseno/Selector'
import { TextoApi } from '../../idioma/TextoApi'
import { useT } from '../../idioma/useT'
import type { EstadoSimulador } from './estadoSimulador'

export type BorradorMundo = Pick<EstadoSimulador, 'lat' | 'lon' | 'ext' | 'fecha' | 'dem'>
const PROPIO = '__propio__'

interface Props {
  catalogo: Catalogo
  actual: BorradorMundo
  cargando: boolean
  /** Crea el mundo con el borrador; `herramienta` viene de un mundo predefinido. */
  onCrear: (b: BorradorMundo, herramienta?: string) => void
}

/** Elección del lugar y de la fecha (temporada); el mundo solo se crea al pulsar el botón. */
export function PanelMundo({ catalogo, actual, cargando, onCrear }: Props) {
  const { t } = useT()
  const [b, setB] = useState<BorradorMundo>(actual)
  const [preset, setPreset] = useState(() => catalogo.mundos.find((m) => m.lat === actual.lat && m.lon === actual.lon)?.nombre ?? PROPIO)
  useEffect(() => { setB(actual) }, [actual])

  const elegirPreset = (nombre: string) => {
    setPreset(nombre)
    const m = catalogo.mundos.find((x) => x.nombre === nombre)
    if (m) setB((v) => ({ ...v, lat: m.lat, lon: m.lon, ext: m.extension_km }))
  }
  const num = (campo: 'lat' | 'lon') => (e: React.ChangeEvent<HTMLInputElement>) => {
    setPreset(PROPIO)
    setB((v) => ({ ...v, [campo]: e.target.value === '' ? NaN : Number(e.target.value) }))
  }
  const valido = Number.isFinite(b.lat) && Number.isFinite(b.lon) && /^\d{4}-\d{2}-\d{2}$/.test(b.fecha)
  const descripcion = catalogo.mundos.find((m) => m.nombre === preset)?.descripcion

  return (
    <form className="panel-herramienta" onSubmit={(e) => { e.preventDefault(); if (valido) onCrear(b, catalogo.mundos.find((m) => m.nombre === preset)?.herramienta) }}>
      <Selector etiqueta={t('sim.mundo.lugar')} value={preset} onChange={(e) => elegirPreset(e.target.value)}
        opciones={[...catalogo.mundos.map((m) => ({ valor: m.nombre, texto: m.nombre, lang: 'es' })), { valor: PROPIO, texto: t('sim.mundo.propio') }]} />
      {descripcion && <p className="simulador__nota"><TextoApi texto={descripcion} /></p>}
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
      <Boton variante="primario" type="submit" disabled={!valido || cargando}>{cargando ? t('sim.mundo.creando') : t('sim.mundo.crear')}</Boton>
    </form>
  )
}

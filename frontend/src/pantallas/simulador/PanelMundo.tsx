import { useEffect, useState } from 'react'
import type { Catalogo } from '../../api/simulador'
import { Boton } from '../../diseno/Boton'
import { Campo } from '../../diseno/Campo'
import { Interruptor } from '../../diseno/Interruptor'
import { Selector } from '../../diseno/Selector'
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
      <Selector etiqueta="Lugar" value={preset} onChange={(e) => elegirPreset(e.target.value)}
        opciones={[...catalogo.mundos.map((m) => ({ valor: m.nombre, texto: m.nombre })), { valor: PROPIO, texto: 'Coordenadas propias' }]} />
      {descripcion && <p className="simulador__nota">{descripcion}</p>}
      <div className="simulador__fila">
        <Campo etiqueta="Latitud" type="number" step="0.01" value={Number.isFinite(b.lat) ? b.lat : ''} onChange={num('lat')} />
        <Campo etiqueta="Longitud" type="number" step="0.01" value={Number.isFinite(b.lon) ? b.lon : ''} onChange={num('lon')} />
      </div>
      <div className="simulador__fila">
        <Selector etiqueta="Lado del mundo" value={String(b.ext)} onChange={(e) => setB({ ...b, ext: Number(e.target.value) })}
          opciones={catalogo.extensiones_km.map((k) => ({ valor: String(k), texto: `${k} km` }))} />
        <Campo etiqueta="Fecha (fija la temporada)" type="date" value={b.fecha} onChange={(e) => setB({ ...b, fecha: e.target.value })} />
      </div>
      <Interruptor etiqueta="Relieve real (SRTM)" activo={b.dem} onCambiar={(dem) => setB({ ...b, dem })} />
      <Boton variante="primario" type="submit" disabled={!valido || cargando}>{cargando ? 'Creando el mundo…' : 'Crear el mundo'}</Boton>
    </form>
  )
}

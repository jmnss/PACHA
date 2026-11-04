import { useEffect, useRef, useState, type ReactNode } from 'react'
import maplibregl, { type Map as MapaMapLibre } from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import './mapa.css'
import { ContextoMapa } from './contexto'
import { dentroDeEcuador } from './dentroDeEcuador'
import { construirEstilo, FUENTE_REMOTA, mapaRemotoActivo } from './estilo'

export type Bbox = readonly [number, number, number, number]
export type Marcador = { lat: number; lon: number; etiqueta?: string }

/** Caja aproximada de Ecuador (continente y Galápagos): vista inicial por defecto. */
const BBOX_ECUADOR: Bbox = [-92.2, -5.1, -75.1, 1.5]

type Props = {
  bbox?: Bbox
  onClic?: (lat: number, lon: number) => void
  onFueraDeEcuador?: (lat: number, lon: number) => void
  interactivo?: boolean
  marcadores?: Marcador[]
  children?: ReactNode
}

/** Mapa base local de Ecuador (MapLibre). El clic solo vale dentro de Ecuador. */
export function MapaBase({ bbox, onClic, onFueraDeEcuador, interactivo = true, marcadores = [], children }: Props) {
  const contenedor = useRef<HTMLDivElement>(null)
  const [mapa, setMapa] = useState<MapaMapLibre | null>(null)
  const [remotoCargado, setRemotoCargado] = useState(false)
  const clics = useRef({ onClic, onFueraDeEcuador })
  clics.current = { onClic, onFueraDeEcuador }

  useEffect(() => {
    if (!contenedor.current) return
    const remoto = mapaRemotoActivo()
    let m: MapaMapLibre
    try {
      m = new maplibregl.Map({
        container: contenedor.current,
        style: construirEstilo({ remoto }),
        bounds: (bbox ?? BBOX_ECUADOR) as [number, number, number, number],
        fitBoundsOptions: { padding: 16 },
        interactive: interactivo,
        attributionControl: false,
        renderWorldCopies: false,
      })
    } catch {
      return // sin WebGL: el contenedor queda vacío, la pantalla sigue funcionando
    }
    // La capa remota es opcional: cualquier error de tiles o de estilo se silencia.
    m.on('error', () => {})
    m.on('sourcedata', (e) => {
      if (remoto && e.sourceId === FUENTE_REMOTA && m.isSourceLoaded(FUENTE_REMOTA)) setRemotoCargado(true)
    })
    m.on('click', (e) => {
      const { lat, lng } = e.lngLat
      if (dentroDeEcuador(lat, lng)) clics.current.onClic?.(lat, lng)
      else clics.current.onFueraDeEcuador?.(lat, lng)
    })
    m.on('load', () => setMapa(m))
    return () => { setMapa(null); setRemotoCargado(false); m.remove() }
    // La vista inicial se fija al montar; los cambios de bbox se atienden abajo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [interactivo])

  const clave = (bbox ?? BBOX_ECUADOR).join(',')
  useEffect(() => {
    mapa?.fitBounds((bbox ?? BBOX_ECUADOR) as [number, number, number, number], { padding: 16, duration: 0 })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapa, clave])

  useEffect(() => {
    if (!mapa) return
    const puestos = marcadores.map((p) => {
      const el = document.createElement('div')
      el.className = 'mapa__marcador'
      if (p.etiqueta) el.title = p.etiqueta
      return new maplibregl.Marker({ element: el }).setLngLat([p.lon, p.lat]).addTo(mapa)
    })
    return () => puestos.forEach((p) => p.remove())
  }, [mapa, marcadores])

  return (
    <div className="mapa">
      <div className="mapa__lienzo" ref={contenedor} data-testid="mapa" />
      <p className="mapa__atribucion">
        © <a href="https://www.geoboundaries.org" target="_blank" rel="noreferrer">geoBoundaries</a>
        {remotoCargado && (
          <>
            {' · '}
            <a href="https://openfreemap.org" target="_blank" rel="noreferrer">OpenFreeMap</a>
            {' © '}
            <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a>
          </>
        )}
      </p>
      <ContextoMapa.Provider value={mapa}>{children}</ContextoMapa.Provider>
    </div>
  )
}

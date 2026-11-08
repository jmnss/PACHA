import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useT } from '../idioma/useT'
import type { Clave } from '../idioma/traductor'
import { provinciaEn, type ProvinciaBajoPuntero } from './provincia'
import maplibregl, { type Map as MapaMapLibre } from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import './mapa.css'
import { ContextoMapa } from './contexto'
import { dentroDeEcuador } from './dentroDeEcuador'
import { prefiereMenosMovimiento } from '../estado/useMenosMovimiento'
import { ciudadesVisibles } from './ciudades'
import { capasVisibles, construirEstilo, definicionDeBase, esCapaRaster, MAPA_BASE_INICIAL, mapaRemotoActivo, type MapaBaseId } from './estilo'

export type Bbox = readonly [number, number, number, number]
/** Con `onClic` el marcador es un botón (nombre accesible = `etiqueta`); `actual` lo hace más grande. */
export type Marcador = { lat: number; lon: number; etiqueta?: string; actual?: boolean; onClic?: () => void }

/** Región natural tal como viene del GeoJSON -> sufijo de su clave de texto. */
const regionClave = (r: string) => r.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()

/** Caja aproximada de Ecuador (continente y Galápagos): vista inicial por defecto. */
const BBOX_ECUADOR: Bbox = [-92.2, -5.1, -75.1, 1.5]

type Props = {
  bbox?: Bbox
  onClic?: (lat: number, lon: number) => void
  onFueraDeEcuador?: (lat: number, lon: number) => void
  interactivo?: boolean
  marcadores?: Marcador[]
  /** Mapa base remoto (Esri). Sin red o si las teselas fallan, queda el fondo local con provincias. */
  base?: MapaBaseId
  /** Muestra la provincia y la región bajo el puntero (o el último toque). */
  conProvincia?: boolean
  children?: ReactNode
}

/** Mapa de Ecuador (MapLibre): fondo local siempre, mapas base de Esri si hay red. El clic solo vale dentro de Ecuador. */
export function MapaBase({ bbox, onClic, onFueraDeEcuador, interactivo = true, marcadores = [], base = MAPA_BASE_INICIAL, conProvincia = false, children }: Props) {
  const { t } = useT()
  const [provincia, setProvincia] = useState<ProvinciaBajoPuntero | null>(null)
  const consultarProvincia = useRef(conProvincia)
  consultarProvincia.current = conProvincia
  const contenedor = useRef<HTMLDivElement>(null)
  const [mapa, setMapa] = useState<MapaMapLibre | null>(null)
  const [remoto] = useState(mapaRemotoActivo)
  const [fallo, setFallo] = useState(false)
  const baseInicial = useRef(base)
  const clics = useRef({ onClic, onFueraDeEcuador })
  clics.current = { onClic, onFueraDeEcuador }

  useEffect(() => {
    if (!contenedor.current) return
    let m: MapaMapLibre
    try {
      m = new maplibregl.Map({
        container: contenedor.current,
        style: construirEstilo({ remoto, base: baseInicial.current }),
        bounds: (bbox ?? BBOX_ECUADOR) as [number, number, number, number],
        fitBoundsOptions: { padding: 16 },
        interactive: interactivo,
        attributionControl: false,
        renderWorldCopies: false,
        fadeDuration: prefiereMenosMovimiento() ? 0 : 300,
      })
    } catch {
      return // sin WebGL: el contenedor queda vacío, la pantalla sigue funcionando
    }
    // Los mapas base remotos son opcionales: un error de teselas no rompe nada; con varios errores
    // seguidos y ninguna tesela cargada, se vuelve al fondo local (y a las ciudades de respaldo).
    let errores = 0
    let cargadas = 0
    m.on('error', (e) => {
      const id = (e as { sourceId?: string }).sourceId
      if (remoto && id && esCapaRaster(id) && cargadas === 0 && ++errores >= 4) setFallo(true)
    })
    m.on('data', (e) => {
      if (e.dataType === 'source' && 'tile' in e && esCapaRaster((e as { sourceId?: string }).sourceId ?? '')) { cargadas++; setFallo(false) }
    })
    const leerProvincia = (e: { point: { x: number; y: number } }) => {
      if (!consultarProvincia.current) return
      setProvincia(provinciaEn(m.queryRenderedFeatures([e.point.x, e.point.y], { layers: ['provincias'] })))
    }
    m.on('mousemove', leerProvincia)
    m.on('click', (e) => {
      // Un clic en un marcador del catálogo lo atiende el marcador: no crea un escenario derivado.
      if ((e.originalEvent.target as HTMLElement | null)?.closest('.mapa__marcador')) return
      leerProvincia(e)
      const { lat, lng } = e.lngLat
      if (dentroDeEcuador(lat, lng)) clics.current.onClic?.(lat, lng)
      else clics.current.onFueraDeEcuador?.(lat, lng)
    })
    m.on('load', () => setMapa(m))
    return () => { setMapa(null); m.remove() }
    // La vista inicial se fija al montar; los cambios de bbox se atienden abajo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [interactivo])

  const clave = (bbox ?? BBOX_ECUADOR).join(',')
  useEffect(() => {
    mapa?.fitBounds((bbox ?? BBOX_ECUADOR) as [number, number, number, number], { padding: 16, duration: 0 })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapa, clave])

  // Red: al perderla se pasa al fondo local; al volver, se retoman los mapas base.
  useEffect(() => {
    if (!remoto) return
    const sin = () => setFallo(true)
    const con = () => setFallo(false)
    window.addEventListener('offline', sin)
    window.addEventListener('online', con)
    return () => { window.removeEventListener('offline', sin); window.removeEventListener('online', con) }
  }, [remoto])

  const remotoVivo = remoto && !fallo
  useEffect(() => {
    if (!mapa || !remoto) return
    const visibles = capasVisibles(base)
    for (const capa of mapa.getStyle().layers) {
      if (esCapaRaster(capa.id)) mapa.setLayoutProperty(capa.id, 'visibility', remotoVivo && visibles.includes(capa.id) ? 'visible' : 'none')
    }
  }, [mapa, remoto, remotoVivo, base])

  // Ciudades de respaldo: solo cuando no hay etiquetas de Esri (sin red); menos ciudades con menos zoom.
  const [zoom, setZoom] = useState(0)
  useEffect(() => {
    if (!mapa || remotoVivo) return
    const leer = () => setZoom(mapa.getZoom())
    leer()
    mapa.on('zoom', leer)
    return () => { mapa.off('zoom', leer) }
  }, [mapa, remotoVivo])
  useEffect(() => {
    if (!mapa || remotoVivo) return
    const puestas = ciudadesVisibles(zoom).map((c) => {
      const el = document.createElement('div')
      el.className = 'mapa__ciudad'
      el.textContent = c.nombre
      return new maplibregl.Marker({ element: el, anchor: 'left' }).setLngLat([c.lon, c.lat]).addTo(mapa)
    })
    return () => puestas.forEach((p) => p.remove())
  }, [mapa, remotoVivo, zoom])

  useEffect(() => {
    if (!mapa) return
    const puestos = marcadores.map((p) => {
      const el = document.createElement(p.onClic ? 'button' : 'div')
      el.className = `mapa__marcador${p.actual ? ' mapa__marcador--actual' : ''}`
      if (p.etiqueta) el.title = p.etiqueta
      if (p.onClic) {
        (el as HTMLButtonElement).type = 'button'
        el.addEventListener('click', p.onClic)
      }
      const marcador = new maplibregl.Marker({ element: el }).setLngLat([p.lon, p.lat]).addTo(mapa)
      // MapLibre pone «Map marker» como nombre al añadirlo: el del escenario se fija después.
      if (p.onClic && p.etiqueta) el.setAttribute('aria-label', p.etiqueta)
      return marcador
    })
    return () => puestos.forEach((p) => p.remove())
  }, [mapa, marcadores])

  return (
    <div className="mapa">
      <div className="mapa__lienzo" ref={contenedor} data-testid="mapa" />
      {conProvincia && provincia && (
        <p className="mapa__provincia">
          {provincia.nombre}{provincia.region && <> · {t(`piezas.mapa.region.${regionClave(provincia.region)}` as Clave)}</>}
        </p>
      )}
      <p className="mapa__atribucion">
        © <a href="https://www.geoboundaries.org" target="_blank" rel="noreferrer">geoBoundaries</a>
        {remotoVivo && <>{' · '}{definicionDeBase(base).atribucion}</>}
      </p>
      <ContextoMapa.Provider value={mapa}>{children}</ContextoMapa.Provider>
    </div>
  )
}

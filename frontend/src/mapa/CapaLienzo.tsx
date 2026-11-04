import { useContext, useEffect, useId, useRef } from 'react'
import type { ImageSource } from 'maplibre-gl'
import type { Rejilla } from '../api/rejilla'
import type { ColorCategoria, NombreRampa } from '../diseno/rampas'
import { ContextoMapa } from './contexto'
import { ANCLA_DATOS_LOCAL, ANCLA_DATOS_REMOTA } from './estilo'
import { esquinas, pixelesDeRejilla } from './lienzo'

type Props = {
  rejilla: Rejilla
  bbox: readonly [number, number, number, number]
  rampa: NombreRampa
  categorias?: readonly ColorCategoria[]
  /** 0–1: deja ver el terreno bajo la capa. */
  opacidad?: number
}

/** Pinta una Rejilla de la API en un lienzo y la coloca sobre el mapa (sin suavizado: se ve el píxel). */
export function CapaLienzo({ rejilla, bbox, rampa, categorias, opacidad = 1 }: Props) {
  const mapa = useContext(ContextoMapa)
  const opacidadRef = useRef(opacidad)
  opacidadRef.current = opacidad
  const id = `lienzo-${useId().replace(/:/g, '')}`

  useEffect(() => {
    if (!mapa) return
    let url: string
    try {
      const px = pixelesDeRejilla(rejilla, rampa, categorias)
      const lienzo = document.createElement('canvas')
      lienzo.width = px.width
      lienzo.height = px.height
      lienzo.getContext('2d')?.putImageData(px, 0, 0)
      url = lienzo.toDataURL('image/png')
    } catch {
      return // rejilla inválida: el padre muestra su propio estado de error; el mapa base sigue
    }
    const coordinates = esquinas(bbox)
    const fuente = mapa.getSource(id) as ImageSource | undefined
    if (fuente) fuente.updateImage({ url, coordinates })
    else {
      mapa.addSource(id, { type: 'image', url, coordinates })
      // Orden: base → datos → etiquetas. Sin mapa base remoto, los datos van bajo la máscara de fuera de Ecuador.
      const antes = mapa.getLayer(ANCLA_DATOS_REMOTA) ? ANCLA_DATOS_REMOTA : ANCLA_DATOS_LOCAL
      mapa.addLayer({ id, type: 'raster', source: id,
        paint: { 'raster-resampling': 'nearest', 'raster-fade-duration': 0, 'raster-opacity': opacidadRef.current } }, antes)
    }
  }, [mapa, id, rejilla, bbox, rampa, categorias])

  useEffect(() => {
    if (mapa?.getLayer(id)) mapa.setPaintProperty(id, 'raster-opacity', opacidad)
  }, [mapa, id, opacidad])

  useEffect(() => () => {
    if (mapa && mapa.getStyle()) {
      if (mapa.getLayer(id)) mapa.removeLayer(id)
      if (mapa.getSource(id)) mapa.removeSource(id)
    }
  }, [mapa, id])

  return null
}

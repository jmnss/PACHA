import { useContext, useEffect, useId } from 'react'
import type { ImageSource } from 'maplibre-gl'
import type { Rejilla } from '../api/rejilla'
import type { ColorCategoria, NombreRampa } from '../diseno/rampas'
import { ContextoMapa } from './contexto'
import { esquinas, pixelesDeRejilla } from './lienzo'

type Props = {
  rejilla: Rejilla
  bbox: readonly [number, number, number, number]
  rampa: NombreRampa
  categorias?: readonly ColorCategoria[]
}

/** Pinta una Rejilla de la API en un lienzo y la coloca sobre el mapa (sin suavizado: se ve el píxel). */
export function CapaLienzo({ rejilla, bbox, rampa, categorias }: Props) {
  const mapa = useContext(ContextoMapa)
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
      mapa.addLayer({ id, type: 'raster', source: id, paint: { 'raster-resampling': 'nearest', 'raster-fade-duration': 0 } }, 'exterior')
    }
  }, [mapa, id, rejilla, bbox, rampa, categorias])

  useEffect(() => () => {
    if (mapa && mapa.getStyle()) {
      if (mapa.getLayer(id)) mapa.removeLayer(id)
      if (mapa.getSource(id)) mapa.removeSource(id)
    }
  }, [mapa, id])

  return null
}

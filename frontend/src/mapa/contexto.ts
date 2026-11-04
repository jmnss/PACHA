import { createContext } from 'react'
import type { Map as MapaMapLibre } from 'maplibre-gl'

/** El mapa de MapLibre, disponible para las capas hijas cuando el estilo ya cargó. */
export const ContextoMapa = createContext<MapaMapLibre | null>(null)

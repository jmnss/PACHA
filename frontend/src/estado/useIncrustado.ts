import { useSearchParams } from 'react-router-dom'

/** ¿La app corre dentro de un iframe (el recorrido)? Así el modo incrustado sobrevive a la navegación interna. */
function dentroDeMarco(): boolean {
  try { return window.self !== window.top } catch { return true }
}

/** `?incrustado=1` o dentro de un marco: pantalla dentro del recorrido, sin riel ni subnavegación. */
export function useIncrustado(): boolean {
  return useSearchParams()[0].get('incrustado') === '1' || dentroDeMarco()
}

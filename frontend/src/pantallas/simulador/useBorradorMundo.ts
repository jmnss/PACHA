import { useEffect, useState } from 'react'
import type { Catalogo } from '../../api/simulador'
import type { EstadoSimulador } from './estadoSimulador'

export type BorradorMundo = Pick<EstadoSimulador, 'lat' | 'lon' | 'ext' | 'fecha' | 'dem'>
export const PROPIO = '__propio__'

/**
 * Borrador del mundo y preset elegido. Vive en `Simulador` (no en `PanelMundo`) para que sobreviva
 * al cambio de orden en móvil, que desmonta y vuelve a montar la tarjeta.
 */
export function useBorradorMundo(catalogo: Catalogo | undefined, actual: BorradorMundo) {
  const [b, setB] = useState<BorradorMundo>(actual)
  const [preset, setPreset] = useState(() => catalogo?.mundos.find((m) => m.lat === actual.lat && m.lon === actual.lon)?.nombre ?? PROPIO)
  useEffect(() => { setB(actual) }, [actual])
  return { b, setB, preset, setPreset }
}
export type BorradorMundoEstado = ReturnType<typeof useBorradorMundo>

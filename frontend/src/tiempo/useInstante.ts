import { useCallback, useMemo, useState } from 'react'

/** Índice de la pasada más cercana a t (ms); -1 si no hay pasadas. */
export function indiceMasCercano(ts: number[], t: number): number {
  let mejor = -1
  for (let i = 0; i < ts.length; i++) if (mejor < 0 || Math.abs(ts[i] - t) < Math.abs(ts[mejor] - t)) mejor = i
  return mejor
}

/**
 * Instante actual (ms) con el índice de pasada derivado. Una sola fuente de verdad:
 * - `irAInstante` fija el instante exacto (arrastre de la cinta, en minutos) y el índice se deriva.
 * - `irAIndice` fija el instante de esa pasada (reproductor, ±pasada, ir al evento).
 * Se combina con `usePlayback({ onIndice: irAIndice })`: el reproductor avisa solo de los avances
 * que él mismo provoca, de modo que ningún efecto pisa un instante fijado por arrastre.
 * El instante se recorta al rango de las pasadas.
 */
export function useInstante(instantesIso: string[]) {
  const ts = useMemo(() => instantesIso.map((s) => Date.parse(s)), [instantesIso])
  const [bruto, setBruto] = useState<number | null>(null)
  const min = ts.length ? Math.min(...ts) : 0
  const max = ts.length ? Math.max(...ts) : 0
  const ms = Math.min(max, Math.max(min, bruto ?? min))
  const indice = Math.max(0, indiceMasCercano(ts, ms))

  const irAInstante = useCallback((t: number | string) => {
    const v = typeof t === 'string' ? Date.parse(t) : t
    if (Number.isFinite(v)) setBruto(v)
  }, [])
  const irAIndice = useCallback((i: number) => {
    if (ts.length === 0) return
    setBruto(ts[Math.min(ts.length - 1, Math.max(0, Math.round(i)))])
  }, [ts])

  return { ms, instante: new Date(ms).toISOString(), indice, irAInstante, irAIndice }
}

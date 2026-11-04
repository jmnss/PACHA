import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useInstante } from '../../tiempo/useInstante'
import { usePlayback } from '../../tiempo/usePlayback'
import { VELOCIDADES, type Velocidad } from '../../tiempo/ControlesReproductor'

/** Paso «12 días» de los controles: una pasada de la demostración. */
export const PASO_PASADA_MIN = 17280
const MIN_MS = 60_000
const ESPERA_URL_MS = 300

/**
 * Tiempo del Observatorio: instante, reproductor, paso y velocidad, y el instante en la URL (`t`).
 * Una sola fuente de verdad (`useInstante`); el reproductor solo avisa de lo que él mueve.
 */
export function useTiempoObservatorio(instantes: string[], tUrl: string, guardarT: (t: string) => void) {
  const [pasoMin, setPasoMin] = useState(PASO_PASADA_MIN)
  const [velocidad, setVelocidad] = useState<Velocidad>('normal')
  const inst = useInstante(instantes)
  const { irAIndice, irAInstante } = inst
  const pb = usePlayback({ total: instantes.length, intervaloMs: VELOCIDADES[velocidad].ms, onIndice: irAIndice })
  const { ir: irPb, pausa, play, reproduciendo } = pb
  const guardar = useRef(guardarT)
  guardar.current = guardarT

  const inicial = useRef(tUrl)
  useEffect(() => { if (inicial.current) irAInstante(inicial.current) }, [irAInstante])

  // El reproductor sigue al instante cuando éste lo fija otro (arrastre de la cinta, URL).
  useEffect(() => { if (!reproduciendo) irPb(inst.indice) }, [inst.indice, reproduciendo, irPb])

  // El instante se escribe en la URL (sin apilar historial) cuando se calma.
  const primero = useMemo(() => (instantes.length ? Date.parse(instantes[0]) : NaN), [instantes])
  useEffect(() => {
    if (reproduciendo) return
    const espera = setTimeout(() => guardar.current(inst.ms === primero ? '' : inst.instante), ESPERA_URL_MS)
    return () => clearTimeout(espera)
  }, [inst.ms, inst.instante, primero, reproduciendo])

  const desdeCinta = useCallback((iso: string) => { pausa(); irAInstante(iso) }, [pausa, irAInstante])
  const inicio = useCallback(() => { pausa(); irAIndice(0) }, [pausa, irAIndice])
  const final = useCallback(() => { pausa(); irAIndice(instantes.length - 1) }, [pausa, irAIndice, instantes.length])
  const mover = useCallback((signo: 1 | -1) => {
    pausa()
    if (pasoMin === PASO_PASADA_MIN) irAIndice(inst.indice + signo)
    else irAInstante(inst.ms + signo * pasoMin * MIN_MS)
  }, [pausa, pasoMin, irAIndice, irAInstante, inst.indice, inst.ms])

  return {
    ...inst, reproduciendo, play, pausa, pasoMin, setPasoMin, velocidad, setVelocidad,
    desdeCinta, inicio, final, atras: () => mover(-1), adelante: () => mover(1),
  }
}
export type TiempoObservatorio = ReturnType<typeof useTiempoObservatorio>

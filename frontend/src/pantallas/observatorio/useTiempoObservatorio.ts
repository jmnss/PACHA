import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { indiceAnterior } from './derivados'
import { useInstante } from '../../tiempo/useInstante'
import { prefiereMenosMovimiento, usePlayback } from '../../tiempo/usePlayback'
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
  /** La pantalla lo activa mientras llegan los fotogramas: el reproductor espera en vez de saltar. */
  const [esperando, setEsperando] = useState(false)
  const [pasoMin, setPasoMin] = useState(PASO_PASADA_MIN)
  const [velocidad, setVelocidad] = useState<Velocidad>('normal')
  const inst = useInstante(instantes)
  const { irAIndice, irAInstante } = inst
  const ts = useMemo(() => instantes.map((x) => Date.parse(x)), [instantes])
  /** Pasada que muestran el mapa y el KPI: la anterior o igual al instante, como el reloj. */
  const pasadaActiva = indiceAnterior(ts, inst.ms)
  const pb = usePlayback({ total: instantes.length, intervaloMs: VELOCIDADES[velocidad].ms, onIndice: irAIndice })
  const { ir: irPb, pausa: pausaPb, play: playPb } = pb
  // Con un paso menor que una pasada el reproductor avanza el instante (minutos) en vez del índice.
  const [corto, setCorto] = useState(false)
  const reproduciendo = pb.reproduciendo || corto
  const pausa = useCallback(() => { pausaPb(); setCorto(false) }, [pausaPb])
  const msRef = useRef(inst.ms)
  msRef.current = inst.ms
  const ultimoMs = ts.length ? Math.max(...ts) : 0
  const play = useCallback(() => {
    if (pasoMin === PASO_PASADA_MIN) { playPb(); return }
    if (instantes.length < 2) return
    if (prefiereMenosMovimiento()) { irAInstante(msRef.current >= ultimoMs ? ts[0] : msRef.current + pasoMin * MIN_MS); return }
    if (msRef.current >= ultimoMs) irAInstante(Math.min(...ts))
    setCorto(true)
  }, [pasoMin, playPb, instantes.length, irAInstante, ultimoMs, ts])
  useEffect(() => {
    if (!corto) return
    const espera = setTimeout(() => {
      if (esperando) return
      const siguiente = Math.min(ultimoMs, msRef.current + pasoMin * MIN_MS)
      irAInstante(siguiente)
      if (siguiente >= ultimoMs) setCorto(false)
    }, VELOCIDADES[velocidad].ms)
    return () => clearTimeout(espera)
  }, [corto, inst.ms, esperando, velocidad, pasoMin, ultimoMs, irAInstante])
  // Cambiar de paso detiene la reproducción en curso.
  useEffect(() => { setCorto(false) }, [pasoMin])
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
    ...inst, pasadaActiva, setEsperando, reproduciendo, play, pausa, pasoMin, setPasoMin, velocidad, setVelocidad,
    desdeCinta, inicio, final, atras: () => mover(-1), adelante: () => mover(1),
  }
}
export type TiempoObservatorio = ReturnType<typeof useTiempoObservatorio>

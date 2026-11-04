import { useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ErrorApi, MENSAJE_RED } from '../../api/cliente'
import { useSimular, type Escenario } from '../../api/consultas'
import { decodificar, normalizar, type Control, type Valor, type Valores } from './parametros'

/** Espera tras la última edición antes de pedir el escenario nuevo. */
export const ANTIRREBOTE_MS = 300

export interface Simulacion {
  valores: Valores
  /** Fija un parámetro (o lo quita con `undefined`); pide el escenario nuevo tras el antirrebote. */
  cambiar: (clave: string, valor: Valor | undefined) => void
  restablecer: () => void
  calculando: boolean
  segundos: number
  error: string | null
}

/**
 * Parámetros editables del escenario actual. Cada edición reinicia un temporizador de 300 ms; al
 * vencer se hace UNA petición con el estado final. Si llega otra edición mientras se calcula, la
 * respuesta anterior se descarta (solo cuenta la última petición).
 */
export function useSimulacion(
  esc: Escenario,
  controles: Control[],
  par: string,
  alNuevo: (id: string, valores: Valores) => void,
): Simulacion {
  const cliente = useQueryClient()
  const simular = useSimular()
  const base = esc.id.split('~')[0]
  const deUrl = useMemo(() => decodificar(par, controles), [par, controles])
  const [edicion, setEdicion] = useState<Valores | null>(null)
  const valores = edicion ?? deUrl
  const [pendiente, setPendiente] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [segundos, setSegundos] = useState(0)
  const temporizador = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const secuencia = useRef(0)

  const enviar = useCallback((v: Valores) => {
    setPendiente(false)
    const mia = ++secuencia.current
    if (!Object.keys(v).length && esc.id === base) { setEdicion(null); return }
    if (!Object.keys(v).length) { alNuevo(base, {}); return }
    simular.mutate({ escenario_id: base, parametros: v }, {
      onSuccess: (nuevo) => {
        if (mia !== secuencia.current) return
        cliente.setQueryData(['escenario', nuevo.id], nuevo)
        alNuevo(nuevo.id, v)
        setEdicion(null)
      },
      onError: (e) => {
        if (mia === secuencia.current) setError(e instanceof ErrorApi ? e.mensaje : MENSAJE_RED)
      },
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [base, esc.id, alNuevo, cliente])

  const cambiar = useCallback((clave: string, valor: Valor | undefined) => {
    const siguiente = { ...valores }
    if (valor === undefined) delete siguiente[clave]
    else siguiente[clave] = valor
    const limpio = normalizar(siguiente, controles)
    setEdicion(limpio)
    setError(null)
    setPendiente(true)
    clearTimeout(temporizador.current)
    temporizador.current = setTimeout(() => enviar(limpio), ANTIRREBOTE_MS)
  }, [valores, controles, enviar])

  const restablecer = useCallback(() => {
    clearTimeout(temporizador.current)
    const punto: Valores = {}
    if ('lat' in valores && 'lon' in valores) { punto.lat = valores.lat; punto.lon = valores.lon }
    setEdicion(punto)
    setError(null)
    enviar(punto)
  }, [valores, enviar])

  useEffect(() => () => clearTimeout(temporizador.current), [])

  const calculando = pendiente || simular.isPending
  useEffect(() => {
    if (!calculando) { setSegundos(0); return }
    const id = setInterval(() => setSegundos((s) => s + 1), 1000)
    return () => clearInterval(id)
  }, [calculando])

  return { valores, cambiar, restablecer, calculando, segundos, error }
}

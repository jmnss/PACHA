import type { UseQueryResult } from '@tanstack/react-query'
import { useMemo, useRef, useState } from 'react'
import { ErrorApi, MENSAJE_RED } from '../../api/cliente'
import { useCapa, useSimular, type CapaDto, type Contexto, type Escenario, type ResultadoCambio } from '../../api/consultas'
import { Boton } from '../../diseno/Boton'
import { Cargando, ErrorBloque, Vacio } from '../../diseno/Estados'
import { Leyenda } from '../../diseno/Leyenda'
import { Pestanas } from '../../diseno/Pestanas'
import { SelloOrigen } from '../../diseno/SelloOrigen'
import { Tarjeta } from '../../diseno/Tarjeta'
import { formatearFecha } from '../../tiempo/fechas'
import { dentroDeEcuador } from '../../mapa/dentroDeEcuador'
import { CapaLienzo } from '../../mapa/CapaLienzo'
import { MapaBase } from '../../mapa/MapaBase'
import { BloqueTiempo } from './BloqueTiempo'
import { estiloDeCapa, temporadasLluviosas } from './derivados'
import type { TiempoObservatorio } from './useTiempoObservatorio'

export type ModoCapa = 'modelo' | 'cambio'
export const SIN_PAREJA = 'Elige dos pasadas distintas para ver el cambio.'
export const AVISO_FUERA = 'Ese punto está fuera de Ecuador. Elige un punto dentro del país.'

const MODOS = [
  { id: 'modelo', etiqueta: 'Modelo en el tiempo' },
  { id: 'cambio', etiqueta: 'Cambio detectado' },
]

interface Props {
  esc: Escenario
  resultado: UseQueryResult<ResultadoCambio>
  tiempo: TiempoObservatorio
  contexto?: Contexto | null
  antesId: string
  despuesId: string
  polarizacion?: string
  onFijar: (cual: 'antes' | 'despues', id: string) => void
  /** Id del escenario derivado creado al pulsar un punto del mapa. */
  onEscenarioNuevo: (id: string) => void
}

/** Última respuesta buena: la capa anterior sigue visible mientras llega la nueva. */
function useUltimo<T>(valor: T | undefined): T | undefined {
  const ref = useRef<T | undefined>(undefined)
  if (valor !== undefined) ref.current = valor
  return ref.current
}

const hora = (ms: number) => (ms > 0 ? new Date(ms).toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit' }) : undefined)
const mensaje = (e: unknown) => (e instanceof ErrorApi ? e.mensaje : MENSAJE_RED)

function extremosDe(capa: CapaDto): [string, string] | undefined {
  return capa.variable.includes('desplazamiento') ? ['alejándose', 'hacia el satélite'] : undefined
}

/** Mapa con la capa elegida, su leyenda y sello, y la cinta de pasadas con sus controles debajo. */
export function VistaMapa({ esc, resultado, tiempo, contexto, antesId, despuesId, polarizacion, onFijar, onEscenarioNuevo }: Props) {
  const [modo, setModo] = useState<ModoCapa>('cambio')
  const [pais, setPais] = useState(false)
  const [aviso, setAviso] = useState<string | null>(null)
  const simular = useSimular()

  const pasada = esc.adquisiciones[tiempo.pasadaActiva]
  const variable = esc.variables[0]
  const modelo = useCapa(esc.id, modo === 'modelo' && pasada ? { adquisicion: pasada.id, variable, polarizacion } : undefined)
  const consulta = modo === 'modelo' ? modelo : resultado
  const capaNueva = modo === 'modelo' ? modelo.data : resultado.data?.cambio
  const ultimaModelo = useUltimo(modelo.data)
  const ultimaCambio = useUltimo(resultado.data?.cambio)
  const capa = capaNueva ?? (modo === 'modelo' ? ultimaModelo : ultimaCambio)

  const [lat0, lon0] = [(esc.bbox[1] + esc.bbox[3]) / 2, (esc.bbox[0] + esc.bbox[2]) / 2]
  const marcadores = useMemo(() => (pais ? [{ lat: lat0, lon: lon0, etiqueta: esc.nombre }] : []), [pais, lat0, lon0, esc.nombre])
  const estilo = useMemo(() => (capa ? estiloDeCapa(capa) : null), [capa])
  const t = esc.adquisiciones.map((a) => Date.parse(a.instante))
  const temporadas = useMemo(
    () => temporadasLluviosas(contexto, Math.min(...t), Math.max(...t)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [contexto, esc.id],
  )

  const alClic = (lat: number, lon: number) => {
    if (!dentroDeEcuador(lat, lon)) { setAviso(AVISO_FUERA); return }
    setAviso(null)
    const base = esc.id.split('~')[0]
    simular.mutate({ escenario_id: base, parametros: { lat, lon } }, { onSuccess: (nuevo) => onEscenarioNuevo(nuevo.id) })
  }

  // Se compara por posición en la lista de pasadas, no por el texto de los ids.
  const ids = esc.adquisiciones.map((a) => a.id)
  const [iAntes, iDespues] = [ids.indexOf(antesId), ids.indexOf(despuesId)]
  const ordinal = tiempo.pasadaActiva
  const motivoAntes = ordinal >= iDespues ? 'La pasada «antes» debe ser anterior a la pasada «después».' : undefined
  const motivoDespues = ordinal <= iAntes ? 'La pasada «después» debe ser posterior a la pasada «antes».' : undefined

  // Sin pareja válida la consulta no se lanza (idle): se explica en vez de quedarse cargando.
  const sinPareja = modo === 'cambio' && resultado.fetchStatus === 'idle' && !resultado.data
  const cargando = !sinPareja && (consulta.isPending || (consulta.isFetching && !capa))
  const rotulo = modo === 'modelo'
    ? (pasada ? `Pasada · ${formatearFecha(pasada.instante) ?? '—'}` : null)
    : `Cambio · antes ${formatearFecha(esc.adquisiciones[iAntes]?.instante) ?? '—'}, después ${formatearFecha(esc.adquisiciones[iDespues]?.instante) ?? '—'}`

  return (
    <>
      <Tarjeta pie={capa ? <SelloOrigen origen={capa.origen} /> : undefined} className="vista-mapa">
        <div className="vista-mapa__barra">
          <Pestanas etiqueta="Capa del mapa" pestanas={MODOS} activa={modo} onCambiar={(id) => setModo(id as ModoCapa)} />
          <Boton variante="secundario" onClick={() => setPais((p) => !p)} aria-pressed={pais}>
            {pais ? 'Ver el escenario' : 'Ver todo Ecuador'}
          </Boton>
        </div>
        <div className="vista-mapa__mapa">
          <MapaBase bbox={pais ? undefined : esc.bbox} onClic={alClic} onFueraDeEcuador={alClic} marcadores={marcadores}>
            {capa && estilo && (
              <CapaLienzo rejilla={capa.rejilla} bbox={capa.rejilla.bbox} rampa={estilo.rampa} categorias={estilo.categorias} />
            )}
          </MapaBase>
          {cargando && <div className="vista-mapa__estado"><Cargando texto="Calculando la capa…" filas={2} /></div>}
          {sinPareja && (
            <div className="vista-mapa__estado"><Vacio titulo="Sin cambio que mostrar" texto={SIN_PAREJA} /></div>
          )}
          {consulta.isError && !capa && (
            <div className="vista-mapa__estado">
              <ErrorBloque mensaje={mensaje(consulta.error)} ultimoDato={hora(consulta.dataUpdatedAt)} onReintentar={() => void consulta.refetch()} />
            </div>
          )}
        </div>
        {aviso && <p className="vista-mapa__aviso" role="alert">{aviso}</p>}
        {simular.isPending && <p className="vista-mapa__aviso" role="status">Calculando la escena en ese punto…</p>}
        {simular.isError && (
          <div className="vista-mapa__aviso">
            <ErrorBloque mensaje={mensaje(simular.error)} onReintentar={() => simular.reset()} />
          </div>
        )}
        {capa && rotulo && <p className="vista-mapa__capa num">{rotulo}</p>}
        {capa && estilo && (
          <Leyenda paleta={capa.paleta} vmin={capa.rejilla.vmin} vmax={capa.rejilla.vmax} unidad={capa.unidad}
            leyenda={capa.leyenda} variable={capa.variable} extremos={extremosDe(capa)} />
        )}
        <p className="vista-mapa__ayuda">
          {pais ? 'Pulsa un punto dentro de Ecuador para simular una escena allí.' : 'Pulsa el mapa para simular una escena en ese punto, o abre todo Ecuador para elegir otro lugar.'}
        </p>
      </Tarjeta>
      <Tarjeta titulo="Cinta de pasadas">
        <BloqueTiempo
          pasadas={esc.adquisiciones} tiempo={tiempo} contexto={contexto} temporadas={temporadas}
          alInteractuar={() => setModo('modelo')}
          onFijarAntes={() => pasada && onFijar('antes', pasada.id)}
          onFijarDespues={() => pasada && onFijar('despues', pasada.id)}
          motivoAntes={motivoAntes} motivoDespues={motivoDespues}
        />
      </Tarjeta>
    </>
  )
}

import { useMemo } from 'react'
import { ErrorApi, MENSAJE_RED } from '../../api/cliente'
import { useCambio, useContexto, useEscenario, useEscenarios, useTipos, type Escenario } from '../../api/consultas'
import { CabeceraPantalla } from '../../diseno/CabeceraPantalla'
import { Cargando, ErrorBloque, Vacio } from '../../diseno/Estados'
import { Pestanas } from '../../diseno/Pestanas'
import { Selector } from '../../diseno/Selector'
import { useEstadoUrl, type Esquema } from '../../estado/useEstadoUrl'
import { hallazgo } from './derivados'
import { PanelContexto } from './PanelContexto'
import { PanelMetricas } from './PanelMetricas'
import { useTiempoObservatorio } from './useTiempoObservatorio'
import { VistaMapa } from './VistaMapa'
import './observatorio.css'

/** Estado de la pantalla en la URL: /observatorio?escenario&antes&despues&t&vista */
const ESQUEMA = {
  escenario: { tipo: 'string', porDefecto: 'ec_la_segua' },
  antes: { tipo: 'string', porDefecto: '' },
  despues: { tipo: 'string', porDefecto: '' },
  t: { tipo: 'string', porDefecto: '' },
  vista: { tipo: 'enum', valores: ['mapa', 'comparar', 'serie'], porDefecto: 'mapa' },
} as const satisfies Esquema

const VISTAS = [
  { id: 'mapa', etiqueta: 'Mapa' },
  { id: 'comparar', etiqueta: 'Antes y después' },
  { id: 'serie', etiqueta: 'Serie' },
]

const PREGUNTA = 'Qué cambió aquí entre dos pasadas y cuánto.'
const hora = (ms: number) => (ms > 0 ? new Date(ms).toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit' }) : undefined)

/** Ruta /observatorio: mapa y tiempo (esta tarea); «Antes y después» y «Serie» llegan en las tareas 4.2 y 4.3. */
export default function Observatorio() {
  const [url] = useEstadoUrl(ESQUEMA)
  const escenario = useEscenario(url.escenario)

  if (escenario.isPending) {
    return (
      <>
        <CabeceraPantalla titulo="Observatorio" hallazgo={PREGUNTA} />
        <Cargando texto="Cargando el escenario…" filas={4} />
      </>
    )
  }
  if (escenario.isError) {
    return (
      <>
        <CabeceraPantalla titulo="Observatorio" hallazgo={PREGUNTA} />
        <ErrorBloque
          mensaje={escenario.error instanceof ErrorApi ? escenario.error.mensaje : MENSAJE_RED}
          ultimoDato={hora(escenario.dataUpdatedAt)}
          onReintentar={() => void escenario.refetch()}
        />
      </>
    )
  }
  // `key`: al cambiar de escenario se reinicia el tiempo (instante, reproductor).
  return <ObservatorioCargado key={escenario.data.id} esc={escenario.data} />
}

function ObservatorioCargado({ esc }: { esc: Escenario }) {
  const [url, cambiar] = useEstadoUrl(ESQUEMA)
  const escenarios = useEscenarios()
  const tipos = useTipos()

  const pasadas = esc.adquisiciones
  const ids = pasadas.map((p) => p.id)
  const antesId = ids.includes(url.antes) ? url.antes : ids[0]
  const despuesId = ids.includes(url.despues) ? url.despues : ids[ids.length - 1]
  const polarizacion = esc.polarizaciones.includes('HH') ? 'HH' : esc.polarizaciones[0]

  const peticion = useMemo(
    () => (antesId && despuesId && antesId !== despuesId ? { antes: antesId, despues: despuesId, ...(polarizacion ? { polarizacion } : {}) } : undefined),
    [antesId, despuesId, polarizacion],
  )
  const resultado = useCambio(esc.id, peticion)
  const lat = (esc.bbox[1] + esc.bbox[3]) / 2
  const lon = (esc.bbox[0] + esc.bbox[2]) / 2
  const contexto = useContexto(lat, lon)

  const instantes = useMemo(() => pasadas.map((p) => p.instante), [pasadas])
  const tiempo = useTiempoObservatorio(instantes, url.t, (t) => { if (t !== url.t) cambiar({ t }, { reemplazar: true }) })

  const iso = (id: string) => pasadas.find((p) => p.id === id)?.instante ?? ''
  const frase = hallazgo(resultado.data, iso(antesId), iso(despuesId))
  const texto = frase ?? (resultado.isError ? 'No se pudo calcular el cambio entre las dos pasadas elegidas.' : resultado.isPending ? 'Calculando el cambio entre las dos pasadas…' : PREGUNTA)

  const lista = escenarios.data ?? []
  const opcionesEscenario = lista.some((e) => e.id === esc.id) ? lista : [...lista, esc]
  const irA = (id: string) => cambiar({ escenario: id, antes: '', despues: '', t: '' })
  const alTipo = (tipo: string) => {
    const destino = lista.find((e) => e.tipo_cambio === tipo)
    if (destino) irA(destino.id)
  }

  const selectores = (
    <div className="observatorio__selectores">
      <Selector etiqueta="Tipo de cambio" value={esc.tipo_cambio} onChange={(e) => alTipo(e.target.value)}
        opciones={(tipos.data ?? [{ id: esc.tipo_cambio, nombre: esc.tipo_cambio }]).map((t) => ({ valor: t.id, texto: t.nombre }))} />
      <Selector etiqueta="Escenario" value={esc.id} onChange={(e) => irA(e.target.value)}
        opciones={opcionesEscenario.map((e) => ({ valor: e.id, texto: e.nombre }))} />
    </div>
  )

  return (
    <>
      <CabeceraPantalla titulo="Observatorio" hallazgo={texto} acciones={selectores} />
      <Pestanas etiqueta="Vistas del Observatorio" pestanas={VISTAS} activa={url.vista} onCambiar={(v) => cambiar({ vista: v as typeof url.vista })} />
      <div className="observatorio">
        <div className="observatorio__principal">
          {url.vista === 'mapa' ? (
            <VistaMapa
              esc={esc} resultado={resultado} tiempo={tiempo} contexto={contexto.data}
              antesId={antesId} despuesId={despuesId} polarizacion={polarizacion}
              onFijar={(cual, id) => cambiar({ [cual === 'antes' ? 'antes' : 'despues']: id })}
              onEscenarioNuevo={irA}
            />
          ) : (
            <Vacio
              titulo={url.vista === 'comparar' ? 'Antes y después' : 'Serie'}
              texto="Esta vista todavía no está disponible. Mientras tanto, usa la vista Mapa."
            />
          )}
        </div>
        <aside className="observatorio__lado" aria-label="Métricas y contexto">
          <PanelMetricas esc={esc} resultado={resultado} indice={tiempo.indice} antesId={antesId} despuesId={despuesId} />
          <PanelContexto consulta={contexto} ms={tiempo.ms} />
        </aside>
      </div>
    </>
  )
}

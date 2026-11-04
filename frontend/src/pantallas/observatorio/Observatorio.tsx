import { useMemo } from 'react'
import { ErrorApi, MENSAJE_RED } from '../../api/cliente'
import { useCambio, useContexto, useEscenario, useEscenarios, useTipos, type Escenario, type TipoCambio } from '../../api/consultas'
import { Boton } from '../../diseno/Boton'
import { CabeceraPantalla } from '../../diseno/CabeceraPantalla'
import { Cargando, ErrorBloque } from '../../diseno/Estados'
import { Pestanas } from '../../diseno/Pestanas'
import { Selector } from '../../diseno/Selector'
import { useEstadoUrl, type Esquema } from '../../estado/useEstadoUrl'
import { hallazgo, parejaValida } from './derivados'
import { leerCuadrante, leerPunto, textoCuadrante, textoPunto } from './medicion'
import { Mediciones } from './Mediciones'
import { NotasResultado, VistaAntesDespues } from './VistaAntesDespues'
import { SIN_PAREJA } from './VistaMapa'
import { PanelContexto } from './PanelContexto'
import { PanelMetricas } from './PanelMetricas'
import { VistaSerie } from './VistaSerie'
import { useTiempoObservatorio } from './useTiempoObservatorio'
import { VistaMapa } from './VistaMapa'
import './observatorio.css'

/** Estado de la pantalla en la URL: /observatorio?escenario&antes&despues&t&vista */
const ESQUEMA = {
  escenario: { tipo: 'string', porDefecto: 'ec_la_segua' },
  antes: { tipo: 'string', porDefecto: '' },
  despues: { tipo: 'string', porDefecto: '' },
  t: { tipo: 'string', porDefecto: '' },
  pol: { tipo: 'string', porDefecto: '' },
  p: { tipo: 'string', porDefecto: '' },
  c: { tipo: 'string', porDefecto: '' },
  vista: { tipo: 'enum', valores: ['mapa', 'comparar', 'serie'], porDefecto: 'mapa' },
} as const satisfies Esquema

const VISTAS = [
  { id: 'mapa', etiqueta: 'Mapa' },
  { id: 'comparar', etiqueta: 'Antes y después' },
  { id: 'serie', etiqueta: 'Serie' },
]

const PREGUNTA = 'Qué cambió aquí entre dos pasadas y cuánto.'
const hora = (ms: number) => (ms > 0 ? new Date(ms).toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit' }) : undefined)

/** Ruta /observatorio: mapa y tiempo (esta tarea); «Antes y después» y «Serie» son las otras dos vistas. */
export default function Observatorio() {
  const [url, cambiar] = useEstadoUrl(ESQUEMA)
  const escenario = useEscenario(url.escenario)
  const escenarios = useEscenarios()
  const tipos = useTipos()
  const irA = (id: string) => cambiar({ escenario: id, antes: '', despues: '', t: '', pol: '', p: '', c: '' })

  if (escenario.isPending) {
    return (
      <>
        <CabeceraPantalla titulo="Observatorio" hallazgo={PREGUNTA} />
        <Cargando texto="Cargando el escenario…" filas={4} />
      </>
    )
  }
  if (escenario.isError) {
    const e = escenario.error
    const catalogo = escenarios.data ?? []
    // Un escenario derivado caducado (id con «~») vuelve a su base; si no existe, al primero del catálogo.
    const base = url.escenario.split('~')[0]
    const destino = catalogo.find((x) => x.id === base && x.id !== url.escenario) ?? catalogo[0]
    const noExiste = e instanceof ErrorApi && e.estado === 404
    return (
      <>
        <CabeceraPantalla
          titulo="Observatorio"
          hallazgo={PREGUNTA}
          acciones={
            <Selectores
              tipos={tipos.data} lista={catalogo} escenarioId={url.escenario} tipoId=""
              onEscenario={irA} onTipo={(t) => { const d = catalogo.find((x) => x.tipo_cambio === t); if (d) irA(d.id) }}
            />
          }
        />
        <div className="observatorio__salida">
          <ErrorBloque
            mensaje={e instanceof ErrorApi ? e.mensaje : MENSAJE_RED}
            ultimoDato={hora(escenario.dataUpdatedAt)}
            onReintentar={() => void escenario.refetch()}
          />
          {noExiste && destino && <Boton variante="secundario" onClick={() => irA(destino.id)}>Volver a {destino.nombre}</Boton>}
        </div>
      </>
    )
  }
  // `key`: al cambiar de escenario se reinicia el tiempo (instante, reproductor).
  return <ObservatorioCargado key={escenario.data.id} esc={escenario.data} />
}

interface PropsSelectores {
  tipos: TipoCambio[] | undefined
  lista: Escenario[]
  escenarioId: string
  tipoId: string
  /** Escenario actual si no está en el catálogo (derivado de un clic). */
  actual?: Escenario
  onEscenario: (id: string) => void
  onTipo: (tipo: string) => void
}

/** Tipo de cambio y escenario: siguen visibles aunque el escenario no cargue. */
function Selectores({ tipos, lista, escenarioId, tipoId, actual, onEscenario, onTipo }: PropsSelectores) {
  const opciones = lista.map((e) => ({ valor: e.id, texto: e.nombre }))
  if (!lista.some((e) => e.id === escenarioId)) {
    opciones.push({ valor: escenarioId, texto: actual?.nombre ?? 'Escenario no disponible' })
  }
  const opcionesTipo = (tipos ?? []).map((t) => ({ valor: t.id, texto: t.nombre }))
  if (!opcionesTipo.some((o) => o.valor === tipoId)) opcionesTipo.unshift({ valor: tipoId, texto: tipoId || 'Elige un tipo' })
  return (
    <div className="observatorio__selectores">
      <Selector etiqueta="Tipo de cambio" value={tipoId} onChange={(e) => onTipo(e.target.value)} opciones={opcionesTipo} />
      <Selector etiqueta="Escenario" value={escenarioId} onChange={(e) => onEscenario(e.target.value)} opciones={opciones} />
    </div>
  )
}

function ObservatorioCargado({ esc }: { esc: Escenario }) {
  const [url, cambiar] = useEstadoUrl(ESQUEMA)
  const escenarios = useEscenarios()
  const tipos = useTipos()

  const pasadas = esc.adquisiciones
  const ids = pasadas.map((p) => p.id)
  // La pareja se normaliza por posición: distintas y en orden; si no, primera y última pasada.
  const [iAntes, iDespues] = parejaValida(ids.indexOf(url.antes), ids.indexOf(url.despues), ids.length)
  const antesId = ids[iAntes]
  const despuesId = ids[iDespues]
  const polarizacion = esc.polarizaciones.includes(url.pol) ? url.pol : esc.polarizaciones.includes('HH') ? 'HH' : esc.polarizaciones[0]
  const punto = leerPunto(url.p)
  const cuadrante = leerCuadrante(url.c)

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
  const texto = frase ?? (!peticion ? SIN_PAREJA : resultado.isError ? 'No se pudo calcular el cambio entre las dos pasadas elegidas.' : resultado.isPending ? 'Calculando el cambio entre las dos pasadas…' : PREGUNTA)

  const lista = escenarios.data ?? []
  const irA = (id: string) => cambiar({ escenario: id, antes: '', despues: '', t: '', pol: '', p: '', c: '' })
  const alTipo = (tipo: string) => {
    const destino = lista.find((e) => e.tipo_cambio === tipo)
    if (destino) irA(destino.id)
  }
  const selectores = (
    <Selectores tipos={tipos.data} lista={lista} escenarioId={esc.id} tipoId={esc.tipo_cambio} actual={esc} onEscenario={irA} onTipo={alTipo} />
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
          ) : url.vista === 'comparar' ? (
            <VistaAntesDespues
              esc={esc} resultado={resultado} antesId={antesId} despuesId={despuesId} polarizacion={polarizacion}
              punto={punto} cuadrante={cuadrante}
              onPunto={(q) => cambiar({ p: textoPunto(q), c: '' })}
              onCuadrante={(q) => cambiar({ c: textoCuadrante(q), p: '' })}
              onPareja={(antes, despues) => cambiar({ antes, despues })}
              onPolarizacion={(pol) => cambiar({ pol })}
            />
          ) : (
            <VistaSerie esc={esc} resultado={resultado} antesId={antesId} despuesId={despuesId} />
          )}
        </div>
        <aside className="observatorio__lado" aria-label="Métricas y contexto">
          {url.vista === 'comparar' && peticion && (
            <Mediciones
              esc={esc} antesId={antesId} despuesId={despuesId} bbox={resultado.data?.antes.rejilla.bbox ?? esc.bbox}
              punto={punto} cuadrante={cuadrante} polarizacion={polarizacion} onBorrar={() => cambiar({ p: '', c: '' })}
            />
          )}
          <PanelMetricas esc={esc} resultado={resultado} indice={tiempo.pasadaActiva} antesId={antesId} despuesId={despuesId} />
          {url.vista === 'comparar' && <NotasResultado resultado={resultado} />}
          {url.vista !== 'comparar' && <PanelContexto consulta={contexto} ms={tiempo.ms} />}
        </aside>
      </div>
    </>
  )
}

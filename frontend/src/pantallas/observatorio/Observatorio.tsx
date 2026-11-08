import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { ErrorApi, mensajeDeError } from '../../api/cliente'
import { useCambio, useContexto, useEscenario, useEscenarios, useSimular, useTipos, type Escenario, type TipoCambio } from '../../api/consultas'
import { Boton } from '../../diseno/Boton'
import { CabeceraPantalla } from '../../diseno/CabeceraPantalla'
import { Cargando, ErrorBloque } from '../../diseno/Estados'
import { HojaInferior } from '../../diseno/HojaInferior'
import { MenuAcciones, type AccionMenu } from '../../diseno/MenuAcciones'
import { Tarjeta } from '../../diseno/Tarjeta'
import { Pestanas } from '../../diseno/Pestanas'
import { Selector } from '../../diseno/Selector'
import { useEstadoUrl, type Esquema } from '../../estado/useEstadoUrl'
import { useMovil } from '../../estado/useMovil'
import { Termino } from '../../diseno/Termino'
import { clavesApi } from '../../idioma/clavesApi'
import { useTituloPagina } from '../../estado/useTituloPagina'
import { formatoHora } from '../../idioma/formato'
import { useT } from '../../idioma/useT'
import { codificar, decodificar, type Control, type Valores } from './parametros'
import { PanelSimulacion } from './PanelSimulacion'
import { useSimulacion } from './useSimulacion'
import { hallazgo, parejaValida } from './derivados'
import { leerCuadrante, leerPunto, textoCuadrante, textoPunto } from './medicion'
import { Mediciones } from './Mediciones'
import { NotasResultado, VistaAntesDespues } from './VistaAntesDespues'
import { VistaImpacto } from './VistaImpacto'
import { AyudaRadar } from './AyudaRadar'
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
  par: { tipo: 'string', porDefecto: '' },
  vista: { tipo: 'enum', valores: ['mapa', 'comparar', 'serie', 'impacto'], porDefecto: 'mapa' },
} as const satisfies Esquema

const VISTAS = [
  { id: 'mapa', clave: 'obs.estructura.vista_mapa' },
  { id: 'comparar', clave: 'obs.estructura.vista_comparar' },
  { id: 'serie', clave: 'obs.estructura.vista_serie' },
  { id: 'impacto', clave: 'obs.estructura.vista_impacto' },
] as const


/** Ruta /observatorio: mapa y tiempo (esta tarea); «Antes y después» y «Serie» son las otras dos vistas. */
export default function Observatorio() {
  const { t, idioma } = useT()
  useTituloPagina('titulos.observatorio')
  const [url, cambiar] = useEstadoUrl(ESQUEMA)
  const escenario = useEscenario(url.escenario)
  const escenarios = useEscenarios()
  const tipos = useTipos()
  const irA = (id: string) => cambiar({ escenario: id, antes: '', despues: '', t: '', pol: '', p: '', c: '', par: '' })

  // Un enlace a un escenario simulado caducado (404, id con «~») con `par=`: se vuelve a simular la base
  // con los parámetros del enlace y se reemplaza la URL. Un solo intento, así que no hay bucle.
  const cliente = useQueryClient()
  const resimular = useSimular()
  const intentado = useRef(false)
  const caducado = escenario.isError && escenario.error instanceof ErrorApi && escenario.error.estado === 404
  const listaBase = escenarios.data
  useEffect(() => {
    if (!caducado || intentado.current || !url.escenario.includes('~') || !url.par) return
    if (!listaBase || tipos.isPending) return
    const baseId = url.escenario.split('~')[0]
    const baseEsc = listaBase.find((x) => x.id === baseId)
    if (!baseEsc) return
    const controles = tipos.data?.find((t) => t.id === baseEsc.tipo_cambio)?.controles ?? []
    const valores = decodificar(url.par, controles)
    if (!Object.keys(valores).length) return
    intentado.current = true
    resimular.mutate({ escenario_id: baseId, parametros: valores }, {
      onSuccess: (nuevo) => {
        cliente.setQueryData(['escenario', nuevo.id], nuevo)
        cambiar({ escenario: nuevo.id, par: codificar(valores) }, { reemplazar: true })
      },
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [caducado, url.escenario, url.par, listaBase, tipos.isPending, tipos.data])

  if (escenario.isPending || resimular.isPending) {
    return (
      <>
        <CabeceraPantalla titulo={t('obs.estructura.titulo')} hallazgo={t('obs.estructura.pregunta')} />
        <Cargando texto={t('obs.estructura.cargando_escenario')} filas={4} />
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
          titulo={t('obs.estructura.titulo')}
          hallazgo={t('obs.estructura.pregunta')}
          acciones={
            <Selectores
              tipos={tipos.data} lista={catalogo} escenarioId={url.escenario} tipoId=""
              onEscenario={irA} onTipo={(t) => { const d = catalogo.find((x) => x.tipo_cambio === t); if (d) irA(d.id) }}
            />
          }
        />
        <div className="observatorio__salida">
          <ErrorBloque
            mensaje={mensajeDeError(e, t)}
            ultimoDato={formatoHora(idioma, escenario.dataUpdatedAt)}
            onReintentar={() => void escenario.refetch()}
          />
          {noExiste && destino && <Boton variante="secundario" onClick={() => irA(destino.id)}>{t('obs.estructura.volver_a', { nombre: destino.nombre })}</Boton>}
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
  const { t, textoApi } = useT()
  const nombreEsc = (e: Escenario) => textoApi(e.nombre, clavesApi.escenario(e.id, 'sitio')).texto
  const opciones = lista.map((e) => ({ valor: e.id, texto: nombreEsc(e) }))
  if (!lista.some((e) => e.id === escenarioId)) {
    opciones.push({ valor: escenarioId, texto: actual ? nombreEsc(actual) : t('obs.estructura.escenario_no_disponible') })
  }
  const opcionesTipo = (tipos ?? []).map((x) => ({ valor: x.id, texto: textoApi(x.nombre, clavesApi.tipo(x.id, 'nombre')).texto }))
  if (!opcionesTipo.some((o) => o.valor === tipoId)) opcionesTipo.unshift({ valor: tipoId, texto: tipoId || t('obs.estructura.elige_tipo') })
  return (
    <div className="observatorio__selectores">
      <Selector etiqueta={t('obs.estructura.tipo_cambio')} value={tipoId} onChange={(e) => onTipo(e.target.value)} opciones={opcionesTipo} />
      <Selector etiqueta={t('obs.estructura.escenario')} value={escenarioId} onChange={(e) => onEscenario(e.target.value)} opciones={opciones} />
    </div>
  )
}

function ObservatorioCargado({ esc }: { esc: Escenario }) {
  const { t, idioma, textoApi } = useT()
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
  const frase = hallazgo(resultado.data, iso(antesId), iso(despuesId), t, idioma)
  const texto = frase ?? (!peticion ? t('obs.estructura.sin_pareja') : resultado.isError ? t('obs.estructura.error_cambio') : resultado.isPending ? t('obs.estructura.calculando_cambio') : t('obs.estructura.pregunta'))

  const lista = escenarios.data ?? []
  const irA = (id: string) => cambiar({ escenario: id, antes: '', despues: '', t: '', pol: '', p: '', c: '', par: '' })
  // Escenario derivado de un clic en el mapa: otro lugar, así que se reinicia la selección.
  const irAPunto = (id: string, v: Valores) => cambiar({ escenario: id, antes: '', despues: '', t: '', pol: '', p: '', c: '', par: codificar(v) })
  const alTipo = (tipo: string) => {
    const destino = lista.find((e) => e.tipo_cambio === tipo)
    if (destino) irA(destino.id)
  }
  const puedeSimular = esc.capacidades.simulacion
  const tipoActual = tipos.data?.find((x) => x.id === esc.tipo_cambio)
  const observable = tipoActual?.observable
    ? textoApi(tipoActual.observable, clavesApi.tipo(tipoActual.id, 'observable'))
    : null
  // σ⁰ lleva su explicación; el resto del texto del observable viene de la API (con su clave).
  const sigma = t('obs.estructura.sigma0_termino')
  const detalleObservable = observable && (
    <>
      {t('obs.estructura.observable')}{' '}
      {observable.texto.startsWith(sigma)
        ? <><Termino nombre={sigma} explicacion={t('obs.estructura.sigma0_explicacion')} />{observable.traducido ? observable.texto.slice(sigma.length) : <span lang="es">{observable.texto.slice(sigma.length)}</span>}</>
        : observable.traducido ? observable.texto : <span lang="es">{observable.texto}</span>}
    </>
  )
  const controles = useMemo<Control[]>(() => tipos.data?.find((x) => x.id === esc.tipo_cambio)?.controles ?? [], [tipos.data, esc.tipo_cambio])
  // Cambiar parámetros mantiene el lugar, la pareja y el instante: solo cambia la escena.
  const alNuevo = useCallback((id: string, v: Valores) => cambiar({ escenario: id, par: codificar(v) }, { reemplazar: true }), [cambiar])
  const sim = useSimulacion(esc, controles, url.par, alNuevo)
  const movil = useMovil()
  const [hoja, setHoja] = useState(false)
  const [pais, setPais] = useState(false)
  const motivoReproductor = sim.calculando ? t('obs.estructura.motivo_reproductor') : undefined
  const panel = !puedeSimular ? null : tipos.isPending ? (
    <Tarjeta titulo={t('obs.parametros.titulo')}><Cargando texto={t('obs.estructura.cargando_parametros')} filas={4} /></Tarjeta>
  ) : tipos.isError ? (
    <Tarjeta titulo={t('obs.parametros.titulo')}>
      <ErrorBloque mensaje={mensajeDeError(tipos.error, t)} onReintentar={() => void tipos.refetch()} />
    </Tarjeta>
  ) : (
    <PanelSimulacion esc={esc} controles={controles} sim={sim} enHoja={movil} />
  )
  const selectores = (
    <Selectores tipos={tipos.data} lista={lista} escenarioId={esc.id} tipoId={esc.tipo_cambio} actual={esc} onEscenario={irA} onTipo={alTipo} />
  )

  // «Impacto» solo existe para las historias (inundación, incendio); en otro escenario se muestra el mapa.
  const vista = url.vista === 'impacto' && !esc.historia ? 'mapa' : url.vista
  const acciones: AccionMenu[] = []
  if (puedeSimular) acciones.push({ id: 'parametros', texto: t('obs.parametros.titulo'), alElegir: () => setHoja(true) })
  if (vista === 'mapa') acciones.push({ id: 'pais', texto: pais ? t('obs.mapa.ver_escenario') : t('obs.mapa.ver_todo'), alElegir: () => setPais((p) => !p) })
  return (
    <>
      <CabeceraPantalla titulo={t('obs.estructura.titulo')} hallazgo={texto} detalle={detalleObservable} acciones={selectores} />
      <div className="observatorio__vistas">
        <Pestanas etiqueta={t('obs.estructura.vistas_etiqueta')} pestanas={(esc.historia ? VISTAS : VISTAS.filter((v) => v.id !== 'impacto')).map((v) => ({ id: v.id, etiqueta: t(v.clave) }))} activa={vista} onCambiar={(v) => cambiar({ vista: v as typeof url.vista })} />
        {movil && acciones.length > 0 && <MenuAcciones etiqueta={t('obs.estructura.mas_acciones')} acciones={acciones} />}
      </div>
      <div className="observatorio">
        <div className="observatorio__principal">
          {vista === 'mapa' ? (
            <VistaMapa
              esc={esc} resultado={resultado} tiempo={tiempo} contexto={contexto.data}
              antesId={antesId} despuesId={despuesId} polarizacion={polarizacion}
              onFijar={(cual, id) => cambiar({ [cual === 'antes' ? 'antes' : 'despues']: id })}
              onEscenarioNuevo={irAPunto} parametros={sim.valores} motivoReproductor={motivoReproductor}
              pais={pais} onPais={setPais}
            />
          ) : vista === 'comparar' ? (
            <VistaAntesDespues
              esc={esc} resultado={resultado} antesId={antesId} despuesId={despuesId} polarizacion={polarizacion}
              punto={punto} cuadrante={cuadrante}
              onPunto={(q) => cambiar({ p: textoPunto(q), c: '' })}
              onCuadrante={(q) => cambiar({ c: textoCuadrante(q), p: '' })}
              onPareja={(antes, despues) => cambiar({ antes, despues })}
              onPolarizacion={(pol) => cambiar({ pol })}
            />
          ) : vista === 'impacto' && esc.historia ? (
            <VistaImpacto esc={esc} antesId={antesId} despuesId={despuesId} polarizacion={polarizacion} />
          ) : (
            <VistaSerie esc={esc} resultado={resultado} antesId={antesId} despuesId={despuesId} ms={tiempo.ms} punto={punto} cuadrante={cuadrante} />
          )}
        </div>
        <aside className="observatorio__lado" aria-label={t('obs.estructura.lado_etiqueta')}>
          {!movil && panel}
          <AyudaRadar descripcion={tipoActual?.descripcion} nombreTipo={tipoActual?.nombre} tipoId={tipoActual?.id} />
          {vista === 'comparar' && peticion && (
            <Mediciones
              esc={esc} antesId={antesId} despuesId={despuesId} bbox={resultado.data?.antes.rejilla.bbox ?? esc.bbox}
              punto={punto} cuadrante={cuadrante} polarizacion={polarizacion} onBorrar={() => cambiar({ p: '', c: '' })}
              onVerSerie={() => cambiar({ vista: 'serie' })}
            />
          )}
          <PanelMetricas esc={esc} resultado={resultado} indice={tiempo.pasadaActiva} antesId={antesId} despuesId={despuesId} />
          {vista === 'comparar' && <NotasResultado resultado={resultado} escenarioId={esc.id} />}
          {vista !== 'comparar' && <PanelContexto consulta={contexto} ms={tiempo.ms} />}
        </aside>
      </div>
      {movil && hoja && panel && (
        <HojaInferior titulo={t('obs.parametros.titulo')} onCerrar={() => setHoja(false)}>{panel}</HojaInferior>
      )}
    </>
  )
}

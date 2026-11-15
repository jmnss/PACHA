import type { UseQueryResult } from '@tanstack/react-query'
import { useEffect, useId, useMemo, useRef, useState } from 'react'
import type { Clave } from '../../idioma/traductor'
import { clavesApi } from '../../idioma/clavesApi'
import { formatoHora } from '../../idioma/formato'
import { useT } from '../../idioma/useT'
import { useMovil } from '../../estado/useMovil'
import { mensajeDeError } from '../../api/cliente'
import { useCapa, useEscenarios, useFotogramas, useSimular, type CapaDto, type Contexto, type Escenario, type ResultadoCambio } from '../../api/consultas'
import { Boton } from '../../diseno/Boton'
import { IconoChevron } from '../../diseno/iconos'
import { Cargando, ErrorBloque, Vacio } from '../../diseno/Estados'
import { Leyenda } from '../../diseno/Leyenda'
import { ControlSegmentado } from '../../diseno/ControlSegmentado'
import { SelloOrigen } from '../../diseno/SelloOrigen'
import { Tarjeta } from '../../diseno/Tarjeta'
import { formatearFecha, formatearInstante } from '../../tiempo/fechas'
import { dentroDeEcuador } from '../../mapa/dentroDeEcuador'
import { CapaLienzo } from '../../mapa/CapaLienzo'
import { ControlesMapa } from '../../mapa/ControlesMapa'
import { MAPA_BASE_INICIAL, mapaRemotoActivo, type MapaBaseId } from '../../mapa/estilo'
import { Localizador } from '../../mapa/Localizador'
import { MapaBase } from '../../mapa/MapaBase'
import type { Valores } from './parametros'
import { BloqueTiempo } from './BloqueTiempo'
import { estiloDeCapa, temporadasLluviosas } from './derivados'
import { ventanaFotogramas } from './fotogramas'
import { PASO_PASADA_MIN } from './useTiempoObservatorio'
import type { TiempoObservatorio } from './useTiempoObservatorio'

export type ModoCapa = 'modelo' | 'cambio'

const MODOS: { id: ModoCapa; clave: Clave }[] = [
  { id: 'modelo', clave: 'obs.mapa.modo_modelo' },
  { id: 'cambio', clave: 'obs.mapa.modo_cambio' },
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
  /** Id del escenario derivado creado al pulsar un punto del mapa, con los parámetros que lo crearon. */
  onEscenarioNuevo: (id: string, parametros: Valores) => void
  /** Lleva a un escenario del catálogo (clic en su marcador de la vista país). */
  onIrAEscenario: (id: string) => void
  /** Parámetros vigentes: el punto nuevo los conserva. */
  parametros?: Valores
  /** Vista de todo Ecuador (estado en la pantalla: en móvil lo cambia el menú de acciones). */
  pais: boolean
  onPais: (p: boolean) => void
  motivoReproductor?: string
}

/** Última respuesta buena: la capa anterior sigue visible mientras llega la nueva. */
function useUltimo<T>(valor: T | undefined): T | undefined {
  const ref = useRef<T | undefined>(undefined)
  if (valor !== undefined) ref.current = valor
  return ref.current
}

const CLAVE_BASE = 'nisar.mapaBase'
const BASES_VALIDAS: readonly string[] = ['oscuro', 'satelite', 'relieve']
function baseGuardada(): MapaBaseId {
  try {
    const v = localStorage.getItem(CLAVE_BASE)
    if (v && BASES_VALIDAS.includes(v)) return v as MapaBaseId
  } catch { /* sin almacenamiento: se usa el mapa base por defecto */ }
  return MAPA_BASE_INICIAL
}
/** En móvil la leyenda empieza plegada para no tapar el mapa. */
const esMovil = () => typeof window !== 'undefined' && !!window.matchMedia?.('(max-width: 699px)').matches


function extremosDe(capa: CapaDto): [Clave, Clave] | undefined {
  return capa.variable.includes('desplazamiento')
    ? ['origen.leyenda.desplazamiento_menos', 'origen.leyenda.desplazamiento_mas']
    : undefined
}

/** Mapa con la capa elegida, su leyenda y sello, y la cinta de pasadas con sus controles debajo. */
export function VistaMapa({ esc, resultado, tiempo, contexto, antesId, despuesId, polarizacion, onFijar, onEscenarioNuevo, onIrAEscenario, parametros, pais, onPais, motivoReproductor }: Props) {
  const { t, idioma, textoApi } = useT()
  const idNota = useId()
  const idPlaca = useId()
  const [placaAbierta, setPlacaAbierta] = useState(false)
  const [modo, setModo] = useState<ModoCapa>('cambio')
  const movil = useMovil()
  const [aviso, setAviso] = useState<string | null>(null)
  const simular = useSimular()
  const [base, setBase] = useState<MapaBaseId>(baseGuardada)
  const [opacidad, setOpacidad] = useState(0.85)
  const [leyendaAbierta, setLeyendaAbierta] = useState(() => !esMovil())
  const [conBases] = useState(mapaRemotoActivo)
  const elegirBase = (id: MapaBaseId) => {
    setBase(id)
    try { localStorage.setItem(CLAVE_BASE, id) } catch { /* solo una comodidad */ }
  }

  const pasada = esc.adquisiciones[tiempo.pasadaActiva]
  const variable = esc.variables[0]
  // Con un paso menor que una pasada el mapa muestra el estado continuo del modelo (fotogramas).
  const instantesMs = esc.adquisiciones.map((a) => Date.parse(a.instante))
  const ventana = modo === 'modelo' && esc.capacidades.modelo_continuo && tiempo.pasoMin < PASO_PASADA_MIN
    ? ventanaFotogramas(Math.min(...instantesMs), Math.max(...instantesMs), tiempo.ms, tiempo.pasoMin)
    : null
  const fotogramas = useFotogramas(ventana ? {
    escenario_id: esc.id, parametros: {}, paso_min: tiempo.pasoMin,
    inicio: new Date(ventana.inicio).toISOString(), fin: new Date(ventana.fin).toISOString(),
  } : undefined)
  const fotograma = ventana ? fotogramas.data?.[ventana.indice] : undefined
  const { setEsperando } = tiempo
  const esperandoFotogramas = !!ventana && !fotogramas.data && !fotogramas.isError
  useEffect(() => { setEsperando(esperandoFotogramas) }, [esperandoFotogramas, setEsperando])
  const modelo = useCapa(esc.id, modo === 'modelo' && pasada && !ventana ? { adquisicion: pasada.id, variable, polarizacion } : undefined)
  const consulta = modo === 'modelo' ? (ventana ? fotogramas : modelo) : resultado
  const capaNueva = modo === 'modelo' ? (ventana ? fotograma : modelo.data) : resultado.data?.cambio
  const ultimaModelo = useUltimo(ventana ? fotograma : modelo.data)
  const ultimaCambio = useUltimo(resultado.data?.cambio)
  const capa = capaNueva ?? (modo === 'modelo' ? ultimaModelo : ultimaCambio)

  const catalogo = useEscenarios().data
  // El destino se lee de un ref: así los marcadores no se recrean cuando la pantalla pasa una función nueva.
  const irAEscenario = useRef(onIrAEscenario)
  irAEscenario.current = onIrAEscenario
  // Vista país: un marcador por escenario del catálogo (centro de su caja); el abierto, más grande.
  const marcadores = useMemo(() => {
    if (!pais) return []
    const base = esc.id.split('~')[0]
    const lista = catalogo?.length ? catalogo : [esc]
    return lista.map((e) => ({
      lat: (e.bbox[1] + e.bbox[3]) / 2, lon: (e.bbox[0] + e.bbox[2]) / 2,
      etiqueta: textoApi(e.nombre, clavesApi.escenario(e.id, 'sitio')).texto,
      actual: e.id === base,
      onClic: () => irAEscenario.current(e.id),
    }))
  }, [pais, catalogo, esc, textoApi])
  const estilo = useMemo(() => (capa ? estiloDeCapa(capa) : null), [capa])
  const tsPasadas = esc.adquisiciones.map((a) => Date.parse(a.instante))
  const temporadas = useMemo(
    () => temporadasLluviosas(contexto, Math.min(...tsPasadas), Math.max(...tsPasadas)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [contexto, esc.id],
  )

  const alClic = (lat: number, lon: number) => {
    if (!dentroDeEcuador(lat, lon)) { setAviso(t('obs.mapa.aviso_fuera')); return }
    setAviso(null)
    const base = esc.id.split('~')[0]
    const enviados: Valores = { ...parametros, lat, lon }
    simular.mutate({ escenario_id: base, parametros: enviados }, { onSuccess: (nuevo) => onEscenarioNuevo(nuevo.id, enviados) })
  }

  // Se compara por posición en la lista de pasadas, no por el texto de los ids.
  const ids = esc.adquisiciones.map((a) => a.id)
  const [iAntes, iDespues] = [ids.indexOf(antesId), ids.indexOf(despuesId)]
  const ordinal = tiempo.pasadaActiva
  const motivoAntes = ordinal >= iDespues ? t('obs.mapa.motivo_antes') : undefined
  const motivoDespues = ordinal <= iAntes ? t('obs.mapa.motivo_despues') : undefined

  // Sin pareja válida la consulta no se lanza (idle): se explica en vez de quedarse cargando.
  const sinPareja = modo === 'cambio' && resultado.fetchStatus === 'idle' && !resultado.data
  const cargando = !sinPareja && (consulta.isPending || (consulta.isFetching && !capa))
  const rotulo = modo === 'modelo'
    ? (ventana ? t('obs.mapa.rotulo_modelo', { instante: formatearInstante(tiempo.ms, idioma) ?? '—' }) : pasada ? t('obs.mapa.rotulo_pasada', { fecha: formatearFecha(pasada.instante, idioma) ?? '—' }) : null)
    : t('obs.mapa.rotulo_cambio', { antes: formatearFecha(esc.adquisiciones[iAntes]?.instante, idioma) ?? '—', despues: formatearFecha(esc.adquisiciones[iDespues]?.instante, idioma) ?? '—' })

  return (
    <>
      <Tarjeta pie={capa ? <SelloOrigen origen={capa.origen} /> : undefined} className="vista-mapa">
        <div className="vista-mapa__barra">
          <ControlSegmentado etiqueta={t('obs.mapa.capa_etiqueta')} opciones={MODOS.map((m) => ({ id: m.id, etiqueta: t(m.clave) }))} valor={modo} onCambiar={(id) => setModo(id as ModoCapa)} />
          <div className="vista-mapa__acciones">
            {!movil && (
              <Boton variante="secundario" onClick={() => onPais(!pais)} aria-pressed={pais}>
                {pais ? t('obs.mapa.ver_escenario') : t('obs.mapa.ver_todo')}
              </Boton>
            )}
          </div>
        </div>
        <div className="vista-mapa__mapa" role="group" aria-label={t('obs.estructura.vista_mapa')} aria-describedby={idNota}>
          <p id={idNota} className="solo-lectores">{t('a11y.mapa.nota')}</p>
          <MapaBase base={base} bbox={pais ? undefined : esc.bbox} onClic={alClic} onFueraDeEcuador={alClic} marcadores={marcadores} conProvincia>
            {capa && estilo && (
              <CapaLienzo rejilla={capa.rejilla} bbox={capa.rejilla.bbox} rampa={estilo.rampa} categorias={estilo.categorias} opacidad={opacidad} />
            )}
          </MapaBase>
          <div className="vista-mapa__flota">
            <div className="vista-mapa__arriba">
              {movil ? (
                <div className="vista-mapa__placa">
                  <button type="button" className="vista-mapa__plegar vista-mapa__placa-boton num" aria-expanded={placaAbierta} aria-controls={placaAbierta ? idPlaca : undefined} onClick={() => setPlacaAbierta((a) => !a)}>
                    <span>{capa && rotulo ? t('obs.mapa.resumen_capa', { rotulo, pct: Math.round(opacidad * 100) }) : t('obs.mapa.resumen_capa_sola', { pct: Math.round(opacidad * 100) })}</span>
                    <span className="vista-mapa__placa-chevron"><IconoChevron /></span>
                  </button>
                  {placaAbierta && (
                    <div id={idPlaca}>
                      <ControlesMapa base={base} onBase={elegirBase} opacidad={opacidad} onOpacidad={setOpacidad} conBases={conBases} />
                    </div>
                  )}
                </div>
              ) : (
                <>
                  {capa && rotulo ? <p className="vista-mapa__capa num">{rotulo}</p> : <span />}
                  <ControlesMapa base={base} onBase={elegirBase} opacidad={opacidad} onOpacidad={setOpacidad} conBases={conBases} />
                </>
              )}
            </div>
            {capa && estilo && (
              <div className="vista-mapa__leyenda">
                <button type="button" className="vista-mapa__plegar" aria-expanded={leyendaAbierta} onClick={() => setLeyendaAbierta((a) => !a)}>
                  {leyendaAbierta ? t('obs.mapa.ocultar_leyenda') : t('obs.mapa.mostrar_leyenda')}
                </button>
                {leyendaAbierta && (
                  <Leyenda paleta={capa.paleta} vmin={capa.rejilla.vmin} vmax={capa.rejilla.vmax} unidad={capa.unidad}
                    leyenda={capa.leyenda} variable={capa.variable} extremos={extremosDe(capa)} />
                )}
              </div>
            )}
          </div>
          {!pais && <div className="vista-mapa__localizador"><Localizador bbox={esc.bbox} /></div>}
          {cargando && <div className="vista-mapa__estado"><Cargando texto={t('obs.mapa.calculando_capa')} filas={2} /></div>}
          {sinPareja && (
            <div className="vista-mapa__estado"><Vacio titulo={t('obs.mapa.sin_cambio_titulo')} texto={t('obs.estructura.sin_pareja')} /></div>
          )}
          {consulta.isError && !capa && (
            <div className="vista-mapa__estado">
              <ErrorBloque mensaje={mensajeDeError(consulta.error, t)} ultimoDato={formatoHora(idioma, consulta.dataUpdatedAt)} onReintentar={() => void consulta.refetch()} />
            </div>
          )}
        </div>
        {aviso && <p className="vista-mapa__aviso" role="alert">{aviso}</p>}
        {simular.isPending && <p className="vista-mapa__aviso" role="status">{t('obs.mapa.calculando_escena')}</p>}
        {simular.isError && (
          <div className="vista-mapa__aviso">
            <ErrorBloque mensaje={mensajeDeError(simular.error, t)} onReintentar={() => simular.reset()} />
          </div>
        )}
        <p className="vista-mapa__ayuda">
          {pais ? t('obs.mapa.ayuda_pais') : t('obs.mapa.ayuda_escenario')}
        </p>
      </Tarjeta>
      <Tarjeta titulo={t('obs.mapa.cinta_titulo')}>
        <BloqueTiempo
          pasadas={esc.adquisiciones} evento={esc.instante_evento ?? undefined} tiempo={tiempo} contexto={contexto} temporadas={temporadas}
          alInteractuar={() => setModo('modelo')}
          onFijarAntes={() => pasada && onFijar('antes', pasada.id)}
          onFijarDespues={() => pasada && onFijar('despues', pasada.id)}
          motivoAntes={motivoAntes} motivoDespues={motivoDespues} motivoReproductor={motivoReproductor}
          pasosCortos={esc.capacidades.modelo_continuo}
        />
      </Tarjeta>
    </>
  )
}

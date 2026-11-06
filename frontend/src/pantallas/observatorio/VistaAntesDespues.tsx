import type { UseQueryResult } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { mensajeDeError } from '../../api/cliente'
import type { CapaDto, Escenario, ResultadoCambio } from '../../api/consultas'
import { Comparador, type Cuadrante, type Punto } from '../../comparador/Comparador'
import { Boton } from '../../diseno/Boton'
import { Cargando, ErrorBloque, Vacio } from '../../diseno/Estados'
import { Pestanas } from '../../diseno/Pestanas'
import { NotasModelo } from '../../diseno/NotasModelo'
import { Selector } from '../../diseno/Selector'
import { SelloOrigen } from '../../diseno/SelloOrigen'
import { Tarjeta } from '../../diseno/Tarjeta'
import { Termino } from '../../diseno/Termino'
import { descargarPng } from '../../exportar/png'
import { langDe } from '../../idioma/idiomas'
import { useT } from '../../idioma/useT'
import { formatearFecha } from '../../tiempo/fechas'
import { CampoFlujo } from './CampoFlujo'
import { estiloDeCapa } from './derivados'
import { LienzoCapa } from './LienzoCapa'
import { etiquetaCapa, nombreVariable } from './medicion'
import { pngDeCapa } from './pngCapa'
import { TablaResultados } from './TablaResultados'

interface Props {
  esc: Escenario
  resultado: UseQueryResult<ResultadoCambio>
  antesId: string
  despuesId: string
  polarizacion?: string
  punto: Punto | null
  cuadrante: Cuadrante | null
  onPunto: (p: Punto) => void
  onCuadrante: (c: Cuadrante) => void
  onPareja: (antes: string, despues: string) => void
  onPolarizacion: (p: string) => void
}

const MIN_LADO = 0.002

const hora = (ms: number, lang: string) => (ms > 0 ? new Date(ms).toLocaleTimeString(lang === 'es' ? 'es-EC' : lang, { hour: '2-digit', minute: '2-digit' }) : undefined)

interface Vista { id: string; etiqueta: string; capa?: CapaDto }

/** Antes y después: comparador con divisor, o la capa de cambio (y las demás del resultado), con gestos de medición. */
export function VistaAntesDespues({ esc, resultado, antesId, despuesId, polarizacion, punto, cuadrante, onPunto, onCuadrante, onPareja, onPolarizacion }: Props) {
  const { t, idioma, textoApi } = useT()
  const fecha = (iso: string | undefined) => formatearFecha(iso, idioma) ?? '—'
  const explicaciones: Record<string, string> = {
    'σ⁰': t('obs.comparar.explica_sigma'),
    Polarización: t('obs.comparar.explica_polarizacion'),
    HH: t('obs.comparar.explica_hh'),
    HV: t('obs.comparar.explica_hv'),
  }
  const termino = (n: string) => <Termino nombre={n === 'Polarización' ? t('obs.comparar.polarizacion') : n} explicacion={explicaciones[n]} />
  const [ver, setVer] = useState('comparar')
  const [errorPng, setErrorPng] = useState<string | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)
  const pasadas = esc.adquisiciones
  const iAntes = pasadas.findIndex((p) => p.id === antesId)
  const iDespues = pasadas.findIndex((p) => p.id === despuesId)
  const r = resultado.data

  const vistas = useMemo<Vista[]>(() => {
    if (!r) return []
    const l: Vista[] = [{ id: 'comparar', etiqueta: t('obs.comparar.vista_comparar', { variable: nombreVariable(r.antes.variable, t) }) }, { id: 'cambio', etiqueta: t('obs.mapa.modo_cambio'), capa: r.cambio }]
    if (r.clasificacion) l.push({ id: 'clasificacion', etiqueta: t('obs.comparar.vista_clasificacion'), capa: r.clasificacion })
    r.capas_extra.forEach((c, i) => l.push({ id: `extra${i}`, etiqueta: etiquetaCapa(c, t), capa: c }))
    return l
  }, [r, t])
  const vista = vistas.find((v) => v.id === ver) ?? vistas[0]

  // Solo la fecha; la dirección orbital se añade únicamente si dos pasadas comparten día.
  const alPunto = (q: Punto) => { setAviso(null); onPunto(q) }
  const alCuadrante = (q: Cuadrante) => {
    if (q[2] - q[0] < MIN_LADO || q[3] - q[1] < MIN_LADO) { setAviso(t('obs.comparar.aviso_sin_area')); return }
    setAviso(null)
    onCuadrante(q)
  }

  const opciones = (desde: number, hasta: number) =>
    pasadas.slice(desde, hasta).map((p) => {
      const repetida = pasadas.some((q) => q.id !== p.id && fecha(q.instante) === fecha(p.instante))
      return { valor: p.id, texto: repetida ? `${fecha(p.instante)} · ${textoApi(p.direccion_orbital ?? '').texto}` : fecha(p.instante) }
    })
  const selectores = (
    <div className="vista-comparar__selectores">
      <Selector etiqueta={t('obs.comparar.antes')} value={antesId} onChange={(e) => onPareja(e.target.value, despuesId)} opciones={opciones(0, Math.max(0, iDespues))} />
      <Selector etiqueta={t('obs.comparar.despues')} value={despuesId} onChange={(e) => onPareja(antesId, e.target.value)} opciones={opciones(iAntes + 1, pasadas.length)} />
      {esc.polarizaciones.length > 1 && (
        <Selector etiqueta={t('obs.comparar.polarizacion')} value={polarizacion ?? ''} onChange={(e) => onPolarizacion(e.target.value)}
          opciones={esc.polarizaciones.map((p) => ({ valor: p, texto: p }))} />
      )}
    </div>
  )
  const conocidas = ['HH', 'HV'].filter((x) => esc.polarizaciones.includes(x))
  const ayudaPolarizacion = esc.polarizaciones.length > 0 && (
    <p className="vista-mapa__ayuda">
      {termino('Polarización')}: {esc.polarizaciones.map((x, i) => (
        <span key={x}>{i > 0 && ', '}{conocidas.includes(x) ? termino(x) : x}</span>
      ))}.
    </p>
  )

  if (!antesId || !despuesId || antesId === despuesId) {
    return (
      <Tarjeta titulo={t('obs.estructura.vista_comparar')}>
        <Vacio titulo={t('obs.comparar.elige_dos')} texto={t('obs.comparar.elige_dos_texto')} />
      </Tarjeta>
    )
  }

  const etiquetaAntes = t('obs.comparar.etiqueta_antes', { fecha: fecha(pasadas[iAntes]?.instante) })
  const etiquetaDespues = t('obs.comparar.etiqueta_despues', { fecha: fecha(pasadas[iDespues]?.instante) })

  const descargar = async (capa: CapaDto) => {
    setErrorPng(null)
    try { descargarPng(`${esc.id}_${capa.variable}.png`, await pngDeCapa(capa, t)) } catch (e) {
      setErrorPng(e instanceof Error ? e.message : t('exportar.error.png'))
    }
  }

  let cuerpo
  if (resultado.isPending) cuerpo = <Cargando texto={t('obs.comparar.cargando')} filas={5} />
  else if (resultado.isError && !r) {
    cuerpo = <ErrorBloque mensaje={mensajeDeError(resultado.error, t)}
      ultimoDato={hora(resultado.dataUpdatedAt, langDe(idioma))} onReintentar={() => void resultado.refetch()} />
  } else if (r && vista) {
    const sel = { punto, cuadrante }
    if (vista.id === 'comparar') {
      const estilo = estiloDeCapa(r.antes)
      const pol = polarizacion && r.antes.polarizacion ? r.antes.polarizacion : null
      const sigma = r.antes.variable === 'sigma0'
      const nombre = sigma ? termino('σ⁰') : nombreVariable(r.antes.variable, t)
      cuerpo = (
        <Comparador
          antes={r.antes.rejilla} despues={r.despues.rejilla} rampa={estilo.rampa} categorias={estilo.categorias}
          etiquetaAntes={etiquetaAntes} etiquetaDespues={etiquetaDespues}
          titulo={<>{nombre}{pol ? ` ${pol}` : ''}, {r.antes.unidad}</>}
          origen={r.antes.origen} origenDespues={r.despues.origen} unidad={r.antes.unidad} variable={r.antes.variable} leyenda={r.antes.leyenda}
          onPunto={alPunto} onCuadrante={alCuadrante} {...sel}
        />
      )
    } else if (vista.capa) {
      cuerpo = (
        <>
          <LienzoCapa capa={vista.capa} titulo={t('obs.comparar.titulo_capa', { capa: vista.etiqueta, antes: fecha(pasadas[iAntes]?.instante), despues: fecha(pasadas[iDespues]?.instante) })}
            onPunto={alPunto} onCuadrante={alCuadrante} {...sel} />
          {vista.capa.polarizacion && polarizacion && vista.capa.polarizacion !== polarizacion && (
            <p className="medicion__nota">{t('obs.medicion.nota_polarizacion')}</p>
          )}
          <div>
            <Boton variante="secundario" onClick={() => void descargar(vista.capa!)}>{t('obs.comparar.descargar_png')}</Boton>
          </div>
          {errorPng && <p className="vista-comparar__error" role="alert">{errorPng}</p>}
        </>
      )
    }
  }

  return (
    <>
      <Tarjeta className="vista-comparar">
        {selectores}
        {ayudaPolarizacion}
        {vistas.length > 0 && <Pestanas etiqueta={t('obs.comparar.ver')} pestanas={vistas} activa={vista?.id ?? 'comparar'} onCambiar={setVer} />}
        {cuerpo}
        {aviso && <p className="vista-comparar__error" role="status">{aviso}</p>}
        <p className="vista-mapa__ayuda">{t('obs.comparar.ayuda_gestos')}</p>
      </Tarjeta>
      {r?.vectores && <CampoFlujo vectores={r.vectores} />}
      {r?.tablas.map((tabla) => <TablaResultados key={tabla.titulo} tabla={tabla} escenario={esc.id} />)}
    </>
  )
}

/** Notas del resultado (qué significa lo que se ve), con el aviso de que lo dicho sobre NISAR no está verificado. */
export function NotasResultado({ resultado }: { resultado: UseQueryResult<ResultadoCambio> }) {
  const { t } = useT()
  const notas = resultado.data?.notas ?? []
  if (notas.length === 0) return null
  return (
    <Tarjeta titulo={t('obs.comparar.como_leer')} pie={<SelloOrigen origen={resultado.data!.origen} />}>
      <NotasModelo notas={notas} />
    </Tarjeta>
  )
}

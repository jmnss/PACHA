import type { UseQueryResult } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { ErrorApi, MENSAJE_RED } from '../../api/cliente'
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
import { formatearFecha } from '../../tiempo/fechas'
import { CampoFlujo } from './CampoFlujo'
import { estiloDeCapa } from './derivados'
import { LienzoCapa } from './LienzoCapa'
import { etiquetaCapa, NOTA_POLARIZACION, nombreVariable } from './medicion'
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

export const AVISO_SIN_AREA = 'Dibuja un recuadro con área'
const MIN_LADO = 0.002

const EXPLICACIONES: Record<string, string> = {
  'σ⁰': 'Cuánta señal vuelve al satélite desde cada punto del suelo. El agua lisa devuelve poca; las copas de los árboles, mucha.',
  Polarización: 'Orientación de la onda de radar al emitirse y al recibirse. Cada combinación responde distinto al agua, la vegetación y el suelo.',
  HH: 'Se emite y se recibe con la onda en horizontal.',
  HV: 'Se emite en horizontal y se recibe en vertical.',
}
const termino = (n: string) => <Termino nombre={n} explicacion={EXPLICACIONES[n]} />

export const ELIGE_DOS = 'Elige dos fechas distintas'
const hora = (ms: number) => (ms > 0 ? new Date(ms).toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit' }) : undefined)
const fecha = (iso: string | undefined) => formatearFecha(iso) ?? '—'

interface Vista { id: string; etiqueta: string; capa?: CapaDto }

/** Antes y después: comparador con divisor, o la capa de cambio (y las demás del resultado), con gestos de medición. */
export function VistaAntesDespues({ esc, resultado, antesId, despuesId, polarizacion, punto, cuadrante, onPunto, onCuadrante, onPareja, onPolarizacion }: Props) {
  const [ver, setVer] = useState('comparar')
  const [errorPng, setErrorPng] = useState<string | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)
  const pasadas = esc.adquisiciones
  const iAntes = pasadas.findIndex((p) => p.id === antesId)
  const iDespues = pasadas.findIndex((p) => p.id === despuesId)
  const r = resultado.data

  const vistas = useMemo<Vista[]>(() => {
    if (!r) return []
    const l: Vista[] = [{ id: 'comparar', etiqueta: `${nombreVariable(r.antes.variable)} antes y después` }, { id: 'cambio', etiqueta: 'Cambio detectado', capa: r.cambio }]
    if (r.clasificacion) l.push({ id: 'clasificacion', etiqueta: 'Clasificación', capa: r.clasificacion })
    r.capas_extra.forEach((c, i) => l.push({ id: `extra${i}`, etiqueta: etiquetaCapa(c), capa: c }))
    return l
  }, [r])
  const vista = vistas.find((v) => v.id === ver) ?? vistas[0]

  // Solo la fecha; la dirección orbital se añade únicamente si dos pasadas comparten día.
  const alPunto = (q: Punto) => { setAviso(null); onPunto(q) }
  const alCuadrante = (q: Cuadrante) => {
    if (q[2] - q[0] < MIN_LADO || q[3] - q[1] < MIN_LADO) { setAviso(AVISO_SIN_AREA); return }
    setAviso(null)
    onCuadrante(q)
  }

  const opciones = (desde: number, hasta: number) =>
    pasadas.slice(desde, hasta).map((p) => {
      const repetida = pasadas.some((q) => q.id !== p.id && fecha(q.instante) === fecha(p.instante))
      return { valor: p.id, texto: repetida ? `${fecha(p.instante)} · ${p.direccion_orbital}` : fecha(p.instante) }
    })
  const selectores = (
    <div className="vista-comparar__selectores">
      <Selector etiqueta="Antes" value={antesId} onChange={(e) => onPareja(e.target.value, despuesId)} opciones={opciones(0, Math.max(0, iDespues))} />
      <Selector etiqueta="Después" value={despuesId} onChange={(e) => onPareja(antesId, e.target.value)} opciones={opciones(iAntes + 1, pasadas.length)} />
      {esc.polarizaciones.length > 1 && (
        <Selector etiqueta="Polarización" value={polarizacion ?? ''} onChange={(e) => onPolarizacion(e.target.value)}
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
      <Tarjeta titulo="Antes y después">
        <Vacio titulo={ELIGE_DOS} texto="Este escenario necesita dos pasadas distintas para compararlas. Fíjalas desde la vista Mapa." />
      </Tarjeta>
    )
  }

  const etiquetaAntes = `Antes · ${fecha(pasadas[iAntes]?.instante)}`
  const etiquetaDespues = `Después · ${fecha(pasadas[iDespues]?.instante)}`

  const descargar = async (capa: CapaDto) => {
    setErrorPng(null)
    try { descargarPng(`${esc.id}_${capa.variable}.png`, await pngDeCapa(capa)) } catch (e) {
      setErrorPng(e instanceof Error ? e.message : 'No se pudo generar el PNG.')
    }
  }

  let cuerpo
  if (resultado.isPending) cuerpo = <Cargando texto="Calculando el cambio entre las dos fechas…" filas={5} />
  else if (resultado.isError && !r) {
    cuerpo = <ErrorBloque mensaje={resultado.error instanceof ErrorApi ? resultado.error.mensaje : MENSAJE_RED}
      ultimoDato={hora(resultado.dataUpdatedAt)} onReintentar={() => void resultado.refetch()} />
  } else if (r && vista) {
    const sel = { punto, cuadrante }
    if (vista.id === 'comparar') {
      const estilo = estiloDeCapa(r.antes)
      const pol = polarizacion && r.antes.polarizacion ? r.antes.polarizacion : null
      const sigma = r.antes.variable === 'sigma0'
      const nombre = sigma ? termino('σ⁰') : nombreVariable(r.antes.variable)
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
          <LienzoCapa capa={vista.capa} titulo={`${vista.etiqueta} · ${fecha(pasadas[iAntes]?.instante)} a ${fecha(pasadas[iDespues]?.instante)}`}
            onPunto={alPunto} onCuadrante={alCuadrante} {...sel} />
          {vista.capa.polarizacion && polarizacion && vista.capa.polarizacion !== polarizacion && (
            <p className="medicion__nota">{NOTA_POLARIZACION}</p>
          )}
          <div>
            <Boton variante="secundario" onClick={() => void descargar(vista.capa!)}>Descargar PNG</Boton>
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
        {vistas.length > 0 && <Pestanas etiqueta="Ver" pestanas={vistas} activa={vista?.id ?? 'comparar'} onCambiar={setVer} />}
        {cuerpo}
        {aviso && <p className="vista-comparar__error" role="status">{aviso}</p>}
        <p className="vista-mapa__ayuda">Pulsa la imagen para medir un punto, o arrástrala para medir un cuadrante.</p>
      </Tarjeta>
      {r?.vectores && <CampoFlujo vectores={r.vectores} />}
      {r?.tablas.map((t) => <TablaResultados key={t.titulo} tabla={t} escenario={esc.id} />)}
    </>
  )
}

/** Notas del resultado (qué significa lo que se ve), con el aviso de que lo dicho sobre NISAR no está verificado. */
export function NotasResultado({ resultado }: { resultado: UseQueryResult<ResultadoCambio> }) {
  const notas = resultado.data?.notas ?? []
  if (notas.length === 0) return null
  return (
    <Tarjeta titulo="Cómo leer esto" pie={<SelloOrigen origen={resultado.data!.origen} />}>
      <NotasModelo notas={notas} />
    </Tarjeta>
  )
}

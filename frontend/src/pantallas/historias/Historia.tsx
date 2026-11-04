import { Fragment, useMemo, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ErrorApi, MENSAJE_RED } from '../../api/cliente'
import { useCambio, useContexto, type Escenario } from '../../api/consultas'
import { Comparador } from '../../comparador/Comparador'
import { Cargando, ErrorBloque } from '../../diseno/Estados'
import { NotasModelo } from '../../diseno/NotasModelo'
import { Pestanas } from '../../diseno/Pestanas'
import { Tarjeta } from '../../diseno/Tarjeta'
import { Termino } from '../../diseno/Termino'
import { CintaPasadas } from '../../tiempo/CintaPasadas'
import { formatearFecha } from '../../tiempo/fechas'
import { estiloDeCapa, hallazgo, temporadasLluviosas } from '../observatorio/derivados'
import { TERMINOS, type ContenidoHistoria, type Parrafo } from './contenido/tipos'

interface Props {
  contenido: ContenidoHistoria
  esc: Escenario
}

const fecha = (iso: string | undefined) => formatearFecha(iso) ?? '—'
const hora = (ms: number) => (ms > 0 ? new Date(ms).toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit' }) : undefined)

/**
 * Plantilla de una historia: cinco partes fijas, cada una con encabezado de 20 px.
 * Pareja de pasadas por defecto (decisión documentada): la primera y la última del escenario,
 * porque la API no ofrece un intervalo recomendado y así el comparador abarca todo el ciclo.
 */
export function Historia({ contenido: c, esc }: Props) {
  const pasadas = esc.adquisiciones
  const [iDespues, setIDespues] = useState(Math.max(0, pasadas.length - 1))
  const recomendada = esc.polarizaciones.includes(c.comparador.polarizacion) ? c.comparador.polarizacion : esc.polarizaciones[0]
  const [pol, setPol] = useState<string | undefined>(recomendada)

  const antes = pasadas[0]
  const despues = pasadas[iDespues]
  const peticion = useMemo(
    () => (antes && despues && antes.id !== despues.id ? { antes: antes.id, despues: despues.id, ...(pol ? { polarizacion: pol } : {}) } : undefined),
    [antes, despues, pol],
  )
  const resultado = useCambio(esc.id, peticion)
  const lat = (esc.bbox[1] + esc.bbox[3]) / 2
  const lon = (esc.bbox[0] + esc.bbox[2]) / 2
  const contexto = useContexto(lat, lon)
  const ts = pasadas.map((p) => Date.parse(p.instante))
  const temporadas = useMemo(
    () => (ts.length ? temporadasLluviosas(contexto.data, Math.min(...ts), Math.max(...ts)) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [contexto.data, pasadas],
  )

  // Un término se explica solo la primera vez que aparece en la historia.
  const vistos = new Set<string>()
  const texto = (p: Parrafo): ReactNode =>
    p.map((s, i) => {
      if (typeof s === 'string') return <Fragment key={i}>{s}</Fragment>
      const def = TERMINOS[s.termino]
      if (vistos.has(s.termino)) return <Fragment key={i}>{def.nombre}</Fragment>
      vistos.add(s.termino)
      return <Termino key={i} nombre={def.nombre} explicacion={def.explicacion} />
    })
  const parrafos = (lista: Parrafo[]) => lista.map((p, i) => <p key={i} className="historia__parrafo">{texto(p)}</p>)

  const r = resultado.data
  const frase = hallazgo(r, antes?.instante ?? '', despues?.instante ?? '')
  const polarizaciones = ['HH', 'HV'].filter((x) => esc.polarizaciones.includes(x)).map((x) => ({ id: x, etiqueta: x === c.comparador.polarizacion ? `${x} · recomendada` : x }))

  const enlace = `/observatorio?${new URLSearchParams({
    escenario: esc.id,
    ...(antes ? { antes: antes.id } : {}),
    ...(despues ? { despues: despues.id } : {}),
    ...(pol ? { pol } : {}),
    vista: 'comparar',
  })}`

  // Cada parte se arma en el orden de lectura para que «la primera vez» sea la primera que se lee.
  const p1 = parrafos(c.queCambia.parrafos)
  const p2 = parrafos(c.queVeElRadar.parrafos)
  const p3a = parrafos(c.comparador.introduccion)
  const p3b = <p className="historia__parrafo">{texto(c.comparador.porQue)}</p>
  const p3c = <p className="historia__parrafo">{texto(c.comparador.otra)}</p>
  const p4 = parrafos(c.hipotesis.parrafos)
  const p5 = parrafos(c.aplicaciones.parrafos)

  let cuerpo: ReactNode = null
  if (!peticion) {
    cuerpo = <p className="historia__nota">Este escenario no tiene dos pasadas distintas para comparar.</p>
  } else if (resultado.isPending) {
    cuerpo = <Cargando texto="Calculando el cambio entre la primera y la última pasada…" filas={5} />
  } else if (resultado.isError && !r) {
    cuerpo = (
      <ErrorBloque mensaje={resultado.error instanceof ErrorApi ? resultado.error.mensaje : MENSAJE_RED}
        ultimoDato={hora(resultado.dataUpdatedAt)} onReintentar={() => void resultado.refetch()} />
    )
  } else if (r) {
    const estilo = estiloDeCapa(r.antes)
    cuerpo = (
      <Comparador
        antes={r.antes.rejilla} despues={r.despues.rejilla} rampa={estilo.rampa} categorias={estilo.categorias}
        etiquetaAntes={`Antes · ${fecha(antes?.instante)}`} etiquetaDespues={`Después · ${fecha(despues?.instante)}`}
        titulo={`${r.antes.variable === 'sigma0' ? 'σ⁰' : r.antes.variable}${r.antes.polarizacion ? ` ${r.antes.polarizacion}` : ''}, ${r.antes.unidad}`}
        origen={r.antes.origen} origenDespues={r.despues.origen} unidad={r.antes.unidad} variable={r.antes.variable} leyenda={r.antes.leyenda}
      />
    )
  }

  return (
    <article className="historia" aria-labelledby="historia-titulo">
      <h2 id="historia-titulo" className="historia__titulo">{c.titulo}</h2>

      <div className="historia__lectura">
      <section className="historia__parte" aria-labelledby="h-1">
        <h3 id="h-1" className="historia__encabezado">{c.queCambia.titulo}</h3>
        {p1}
      </section>

      <section className="historia__parte" aria-labelledby="h-2">
        <h3 id="h-2" className="historia__encabezado">{c.queVeElRadar.titulo}</h3>
        {p2}
      </section>
      </div>

      <section className="historia__parte historia__parte--ancha" aria-labelledby="h-3">
        <h3 id="h-3" className="historia__encabezado">{c.comparador.titulo}</h3>
        <div className="historia__texto">
          {p3a}
          {p3b}
          {p3c}
        </div>
        {frase && <p className="historia__hallazgo">{frase}</p>}
        <Tarjeta className="historia__comparador">
          {polarizaciones.length > 1 && <Pestanas etiqueta="Polarización" pestanas={polarizaciones} activa={pol ?? ''} onCambiar={setPol} />}
          {cuerpo}
          {pasadas.length > 1 && (
            <>
              <CintaPasadas
                adquisiciones={pasadas} instante={despues?.instante ?? ''} temporadas={temporadas}
                onCambio={(_, i) => setIDespues(Math.max(1, i))}
              />
              <p className="historia__nota">
                Cada muesca es una pasada del satélite sobre este lugar. Mueve el cursor para elegir la pasada «después»; «antes» es siempre la primera.
              </p>
            </>
          )}
        </Tarjeta>
        {r && r.notas.length > 0 && (
          <div className="historia__notas">
            <NotasModelo notas={r.notas} />
          </div>
        )}
        <div>
          <Link to={enlace} className="boton boton--primario">Ver en el Observatorio</Link>
        </div>
      </section>

      <section className="historia__parte" aria-labelledby="h-4">
        <h3 id="h-4" className="historia__encabezado">{c.hipotesis.titulo}</h3>
        {p4}
      </section>

      <section className="historia__parte" aria-labelledby="h-5">
        <h3 id="h-5" className="historia__encabezado">{c.aplicaciones.titulo}</h3>
        {p5}
      </section>
    </article>
  )
}

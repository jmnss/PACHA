import { Fragment, useMemo, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { mensajeDeError } from '../../api/cliente'
import { useCambio, useContexto, type Escenario } from '../../api/consultas'
import { Comparador } from '../../comparador/Comparador'
import { Cargando, ErrorBloque } from '../../diseno/Estados'
import { NotasModelo } from '../../diseno/NotasModelo'
import { Pestanas } from '../../diseno/Pestanas'
import { Tarjeta } from '../../diseno/Tarjeta'
import { Termino } from '../../diseno/Termino'
import { formatoHora } from '../../idioma/formato'
import { useT } from '../../idioma/useT'
import { CintaPasadas } from '../../tiempo/CintaPasadas'
import { formatearFecha } from '../../tiempo/fechas'
import { estiloDeCapa, hallazgo, temporadasLluviosas } from '../observatorio/derivados'
import { terminosDe } from './contenido'
import type { ContenidoHistoria, Parrafo } from './contenido/tipos'
import { parejaDeMayorCambio } from './pareja'

interface Props {
  contenido: ContenidoHistoria
  esc: Escenario
  /** Índice de historias: va en la columna de lectura, para que el comparador suba en escritorio. */
  indice?: ReactNode
}


/**
 * Plantilla de una historia: cinco partes fijas, cada una con encabezado de 20 px.
 *
 * Pareja de pasadas por defecto: la API no recomienda un intervalo. Se pide primero el cambio entre la primera y
 * la última pasada y, con su serie, `parejaDeMayorCambio` elige la pareja que más cambia (ver pareja.ts). Si no
 * hay criterio fiable se queda primera/última. La cinta mueve «después»; «antes» queda fija.
 */
export function Historia({ contenido: c, esc, indice }: Props) {
  const { t, idioma } = useT()
  const fecha = (iso: string | undefined) => formatearFecha(iso, idioma) ?? '—'
  const TERMINOS = terminosDe(idioma)
  const pasadas = esc.adquisiciones
  const ultima = pasadas.length - 1
  const recomendada = esc.polarizaciones.includes(c.comparador.polarizacion) ? c.comparador.polarizacion : esc.polarizaciones[0]
  const [pol, setPol] = useState<string | undefined>(recomendada)
  const [despuesElegido, setDespuesElegido] = useState<number | null>(null)

  // Descubrimiento de la pareja: primera y última pasada, con la polarización recomendada.
  const descubrimiento = useCambio(
    esc.id,
    useMemo(() => (ultima > 0 ? { antes: pasadas[0].id, despues: pasadas[ultima].id, ...(recomendada ? { polarizacion: recomendada } : {}) } : undefined), [pasadas, ultima, recomendada]),
  )
  const pareja = useMemo<[number, number] | null>(() => {
    if (ultima < 1 || descubrimiento.isPending) return null
    return parejaDeMayorCambio(descubrimiento.data?.series[0]?.puntos, pasadas) ?? [0, ultima]
  }, [descubrimiento.isPending, descubrimiento.data, pasadas, ultima])

  const iAntes = pareja ? pareja[0] : 0
  const iDespues = pareja ? Math.max(iAntes + 1, despuesElegido ?? pareja[1]) : 0
  const antes = pasadas[iAntes]
  const despues = pasadas[iDespues]
  const peticion = useMemo(
    () => (pareja && antes && despues ? { antes: antes.id, despues: despues.id, ...(pol ? { polarizacion: pol } : {}) } : undefined),
    [pareja, antes, despues, pol],
  )
  // `conservar`: al mover la cinta o cambiar de polarización se sigue viendo la imagen anterior hasta que llegue la nueva.
  const resultado = useCambio(esc.id, peticion, true)
  const lat = (esc.bbox[1] + esc.bbox[3]) / 2
  const lon = (esc.bbox[0] + esc.bbox[2]) / 2
  const contexto = useContexto(lat, lon)
  const temporadas = useMemo(() => {
    const ts = pasadas.map((p) => Date.parse(p.instante))
    return ts.length ? temporadasLluviosas(contexto.data, Math.min(...ts), Math.max(...ts)) : []
  }, [contexto.data, pasadas])

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
  const frase = hallazgo(r, antes?.instante ?? '', despues?.instante ?? '', t, idioma)
  const polarizaciones = ['HH', 'HV']
    .filter((x) => esc.polarizaciones.includes(x))
    .map((x) => ({ id: x, etiqueta: x === c.comparador.polarizacion ? t('historias.pol.recomendada', { pol: x }) : x }))

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

  let cuerpo: ReactNode
  if (ultima < 1) {
    cuerpo = <p className="historia__nota">{t('historias.comparador.sin_pasadas')}</p>
  } else if (!peticion || (resultado.isPending && !r)) {
    cuerpo = <Cargando texto={t('historias.comparador.calculando')} filas={5} />
  } else if (resultado.isError && !r) {
    cuerpo = (
      <ErrorBloque
        mensaje={mensajeDeError(resultado.error, t)}
        ultimoDato={formatoHora(idioma, resultado.dataUpdatedAt)}
        onReintentar={() => void resultado.refetch()}
      />
    )
  } else if (r) {
    const estilo = estiloDeCapa(r.antes)
    cuerpo = (
      <Comparador
        antes={r.antes.rejilla} despues={r.despues.rejilla} rampa={estilo.rampa} categorias={estilo.categorias}
        etiquetaAntes={t('historias.comparador.antes', { fecha: fecha(antes?.instante) })} etiquetaDespues={t('historias.comparador.despues', { fecha: fecha(despues?.instante) })}
        titulo={`${r.antes.variable === 'sigma0' ? 'σ⁰' : r.antes.variable}${r.antes.polarizacion ? ` ${r.antes.polarizacion}` : ''}, ${r.antes.unidad}`}
        origen={r.antes.origen} origenDespues={r.despues.origen} unidad={r.antes.unidad} variable={r.antes.variable} leyenda={r.antes.leyenda}
      />
    )
  }

  return (
    <article className="historia" aria-labelledby="historia-titulo">
      <div className="historia__cabecera">
        {indice}
        <h2 id="historia-titulo" className="historia__titulo" data-contenido-largo>{c.titulo}</h2>
      </div>

      <div className="historia__lectura">
        <section className="historia__parte" aria-labelledby="h-1">
          <h3 id="h-1" className="historia__encabezado" data-contenido-largo>{c.queCambia.titulo}</h3>
          <div data-contenido-largo>{p1}</div>
        </section>
        <section className="historia__parte" aria-labelledby="h-2">
          <h3 id="h-2" className="historia__encabezado" data-contenido-largo>{c.queVeElRadar.titulo}</h3>
          <div data-contenido-largo>{p2}</div>
        </section>
      </div>

      <section className="historia__parte historia__parte--comparador" aria-labelledby="h-3">
        <h3 id="h-3" className="historia__encabezado" data-contenido-largo>{c.comparador.titulo}</h3>
        <Tarjeta className="historia__comparador">
          <div className="historia__pestanas">
            {polarizaciones.length > 1 && <Pestanas etiqueta={t('historias.pol.etiqueta')} pestanas={polarizaciones} activa={pol ?? ''} onCambiar={setPol} />}
            {/* Siempre ocupa su sitio: «Actualizando…» no cambia la altura del bloque. */}
            <p className="historia__estado" role="status">{resultado.isPlaceholderData ? t('historias.comparador.actualizando') : ''}</p>
          </div>
          {cuerpo}
          {ultima > 0 && (
            <>
              <CintaPasadas
                adquisiciones={pasadas} instante={despues?.instante ?? ''} temporadas={temporadas}
                onCambio={(_, i) => setDespuesElegido(Math.max(iAntes + 1, i))}
              />
              <p className="historia__nota">{t('historias.comparador.nota_cinta')}</p>
            </>
          )}
        </Tarjeta>
        <div className="historia__texto">
          <div data-contenido-largo>{p3a}</div>
          {frase && <p className="historia__hallazgo">{frase}</p>}
          <div data-contenido-largo>{p3b}{p3c}</div>
        </div>
        {r && r.notas.length > 0 && (
          <div className="historia__notas">
            <NotasModelo notas={r.notas} escenarioId={esc.id} />
          </div>
        )}
        <div>
          <Link to={enlace} className="boton boton--primario">{t('historias.comparador.ver_observatorio')}</Link>
        </div>
      </section>

      <section className="historia__parte historia__parte--4" aria-labelledby="h-4">
        <h3 id="h-4" className="historia__encabezado" data-contenido-largo>{c.hipotesis.titulo}</h3>
        <div data-contenido-largo>{p4}</div>
      </section>

      <section className="historia__parte historia__parte--5" aria-labelledby="h-5">
        <h3 id="h-5" className="historia__encabezado" data-contenido-largo>{c.aplicaciones.titulo}</h3>
        <div data-contenido-largo>{p5}</div>
      </section>
    </article>
  )
}

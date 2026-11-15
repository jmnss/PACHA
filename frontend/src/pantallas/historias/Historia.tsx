import { Fragment, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useCapa, useComparacionEmbalses, useResumen, type Escenario, type LecturaApi } from '../../api/consultas'
import { ControlSegmentado } from '../../diseno/ControlSegmentado'
import { RotuloSimulacion } from '../../diseno/RotuloSimulacion'
import { Termino } from '../../diseno/Termino'
import { useT } from '../../idioma/useT'
import { formatearFecha } from '../../tiempo/fechas'
import { CifraPaso } from './CifraPaso'
import { cifraDePaso, planVisor, tituloCapa, type CapaIncendio } from './cifras'
import { terminosDe } from './contenido'
import { PASOS, type ClavePaso, type ContenidoHistoria, type Parrafo } from './contenido/tipos'
import { FichaSitio } from './FichaSitio'
import { IndicadorPasos } from './IndicadorPasos'
import { LecturasApi } from './LecturasApi'
import { TablaComparacion } from './TablaComparacion'
import { TarjetaPaso } from './TarjetaPaso'
import { VisorPaso } from './VisorPaso'

/** Estado de la historia que vive en la URL (lo lee y escribe `Historias`). */
export interface EstadoHistoria {
  paso: number
  /** '' = la polarización recomendada de la historia. */
  pol: '' | 'HH' | 'HV'
  /** Se conserva en la URL por compatibilidad; con dos fechas no se usa. */
  pasada: number
}

interface Props {
  contenido: ContenidoHistoria
  esc: Escenario
  estado: EstadoHistoria
  cambiar: (parcial: Partial<EstadoHistoria>) => void
  /** Selector de sitio (embalses) y nota del evento real (incendio), bajo el título. */
  cabecera?: ReactNode
}

/** Lecturas de la API que van con cada paso (las demás, en Impactos). */
function lecturasDe(paso: ClavePaso, todas: LecturaApi[]): LecturaApi[] {
  const deSatelite = (l: LecturaApi) => /\.(contraste|escena_cambia)$/.test(l.clave_texto)
  if (paso === 'satelite') return todas.filter(deSatelite)
  if (paso === 'impactos') return todas.filter((l) => !deSatelite(l))
  return []
}

/**
 * Historia como recorrido por cuatro pasos (Datos · Lo que ve el satélite · Simular · Impactos) con los datos NISAR
 * del equipo. Las cifras, la ficha y las lecturas salen de `/resumen`; el visor solo pide las capas que cada fecha tiene.
 */
export function Historia({ contenido: c, esc, estado, cambiar, cabecera }: Props) {
  const { t, idioma } = useT()
  const TERMINOS = terminosDe(idioma)
  const recomendada = esc.polarizaciones.includes(c.polarizacion) ? c.polarizacion : esc.polarizaciones[0]
  const pol: string | undefined = estado.pol && esc.polarizaciones.includes(estado.pol) ? estado.pol : recomendada
  const n = Math.min(Math.max(1, estado.paso), PASOS.length)
  const paso = PASOS[n - 1]
  const [capaIncendio, setCapaIncendio] = useState<CapaIncendio>('mascara')

  const resumen = useResumen(esc.id)
  const res = resumen.data
  const comparacion = useComparacionEmbalses(c.historiaApi === 'embalse')

  const plan = planVisor(c, paso, esc, res, pol, capaIncendio)
  const capaA = useCapa(esc.id, plan?.a)
  const capaB = useCapa(esc.id, plan && plan.modo !== 'sola' ? plan.b : undefined)

  const fechaDe = (id: string | undefined) => {
    const a = esc.adquisiciones.find((x) => x.id === id)
    return formatearFecha(a?.fecha ?? a?.instante, idioma) ?? '—'
  }

  let etiquetaA = '', etiquetaB = '', titulo = '', queVes = c.pasos[paso].vista.replace('{pol}', pol ?? '')
  if (plan?.modo === 'fechas') {
    etiquetaA = t('historias.comparador.antes', { fecha: fechaDe(plan.a.adquisicion) })
    etiquetaB = t('historias.comparador.despues', { fecha: fechaDe(plan.b.adquisicion) })
    titulo = plan.a.variable === 'mascara' ? t('historias.comparador.mascara') : tituloCapa(capaA.data)
  } else if (plan?.modo === 'polarizaciones') {
    etiquetaA = t('historias.comparador.pol', { pol: 'HH', fecha: fechaDe(plan.a.adquisicion) })
    etiquetaB = t('historias.comparador.pol', { pol: 'HV', fecha: fechaDe(plan.b.adquisicion) })
    titulo = `γ⁰ HH / HV, dB`
    queVes = t('historias.vista.polarizaciones')
  } else if (plan?.modo === 'sola') {
    etiquetaA = fechaDe(plan.a.adquisicion)
    titulo = plan.a.variable === 'delta_rfdi' ? t('historias.comparador.drfdi')
      : c.historiaApi === 'incendio' ? t('historias.comparador.quemado') : t('historias.comparador.mascara')
  }

  // Un término se explica solo la primera vez que aparece en lo que está abierto.
  const vistos = new Set<string>()
  const texto = (p: Parrafo): ReactNode =>
    p.map((s, i) => {
      if (typeof s === 'string') return <Fragment key={i}>{s}</Fragment>
      const def = TERMINOS[s.termino]
      if (vistos.has(s.termino)) return <Fragment key={i}>{def.nombre}</Fragment>
      vistos.add(s.termino)
      return <Termino key={i} nombre={def.nombre} explicacion={def.explicacion} />
    })

  const polarizaciones = ['HH', 'HV']
    .filter((x) => esc.polarizaciones.includes(x))
    .map((x) => ({ id: x, etiqueta: x === c.polarizacion ? t('historias.pol.recomendada', { pol: x }) : x }))

  const antesId = plan && plan.modo === 'fechas' ? plan.a.adquisicion : esc.adquisiciones[0]?.id
  const despuesId = plan && plan.modo === 'fechas' ? plan.b.adquisicion : esc.adquisiciones[esc.adquisiciones.length - 1]?.id
  const enlace = `/explorar/observatorio?${new URLSearchParams({
    escenario: esc.id,
    ...(antesId ? { antes: antesId } : {}),
    ...(despuesId ? { despues: despuesId } : {}),
    ...(pol ? { pol } : {}),
    vista: 'comparar',
  })}`

  const controles = (
    <div className="visor__controles">
      {plan?.modo === 'fechas' && plan.a.variable === 'gamma0' && polarizaciones.length > 1 && (
        <ControlSegmentado etiqueta={t('historias.pol.etiqueta')} opciones={polarizaciones} valor={pol ?? ''} onCambiar={(p) => cambiar({ pol: p === recomendada ? '' : (p as 'HH' | 'HV') })} />
      )}
      {c.historiaApi === 'incendio' && paso === 'impactos' && esc.variables.includes('delta_rfdi') && (
        <ControlSegmentado
          etiqueta={t('historias.capa.etiqueta')} valor={capaIncendio} onCambiar={(v) => setCapaIncendio(v as CapaIncendio)}
          opciones={[{ id: 'mascara', etiqueta: t('historias.capa.mascara') }, { id: 'delta_rfdi', etiqueta: t('historias.capa.drfdi') }]}
        />
      )}
    </div>
  )

  return (
    <article className="historia" aria-labelledby="historia-titulo">
      <div className="historia__lectura">
        <header className="historia__cabecera">
          <h2 id="historia-titulo" className="historia__titulo">{c.titulo}</h2>
          <p className="historia__resumen">{c.resumen}</p>
          {cabecera}
        </header>

        <IndicadorPasos n={n} total={PASOS.length} />

        <ol className="pasos" aria-label={t('historias.paso.lista')}>
          {PASOS.map((clave, i) => {
            const p = c.pasos[clave]
            const abierto = i + 1 === n
            const siguiente = PASOS[i + 1]
            return (
              <TarjetaPaso
                key={clave} n={i + 1} titular={p.titular} frase={p.frase} abierto={abierto}
                onAbrir={() => cambiar({ paso: i + 1 })}
                cifra={<CifraPaso cifra={cifraDePaso(c, clave, res, pol)} rotulo={p.cifra} pol={pol} />}
              >
                {clave === 'simular' && <RotuloSimulacion />}
                {p.detalle.map((par, k) => <p key={k} className="historia__parrafo">{texto(par)}</p>)}
                {clave === 'datos' && res && <FichaSitio datos={res.ficha} />}
                {res && <LecturasApi lecturas={lecturasDe(clave, res.lecturas)} />}
                {clave === 'impactos' && c.historiaApi === 'embalse' && comparacion.data && comparacion.data.sitios.length > 1 && (
                  <TablaComparacion datos={comparacion.data} />
                )}
                {clave === 'simular' && (
                  <Link to="/simular" className="boton boton--secundario">{t('historias.simular.enlace')}</Link>
                )}
                {siguiente && (
                  <button type="button" className="boton boton--terciario paso__siguiente" onClick={() => cambiar({ paso: i + 2 })}>
                    {t('historias.paso.siguiente', { titular: c.pasos[siguiente].titular })}
                  </button>
                )}
              </TarjetaPaso>
            )
          })}
        </ol>

        <section className="historia__final" aria-labelledby="historia-final">
          <h3 id="historia-final" className="historia__final-titulo">{t('historias.final.titulo')}</h3>
          <p className="historia__parrafo">{t('historias.final.texto')}</p>
          <div><Link to={enlace} className="boton boton--primario">{t('historias.final.boton')}</Link></div>
        </section>
      </div>

      <div className="historia__visor">
        <VisorPaso
          queVes={queVes} modo={plan ? (plan.modo === 'sola' ? 'sola' : 'par') : res || resumen.isError ? null : 'par'}
          a={capaA} b={capaB} etiquetaA={etiquetaA} etiquetaB={etiquetaB} titulo={titulo} controles={controles}
        />
      </div>
    </article>
  )
}

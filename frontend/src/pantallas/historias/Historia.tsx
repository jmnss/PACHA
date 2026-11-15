import { Fragment, useMemo, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useCambio, useCapa, useContexto, type Escenario } from '../../api/consultas'
import { ControlSegmentado } from '../../diseno/ControlSegmentado'
import { NotasModelo } from '../../diseno/NotasModelo'
import { Termino } from '../../diseno/Termino'
import { EtiquetaMetrica, UnidadMetrica, ValorMetrica } from '../../idioma/MetricaApi'
import { useT } from '../../idioma/useT'
import { CintaPasadas } from '../../tiempo/CintaPasadas'
import { formatearFecha } from '../../tiempo/fechas'
import { temporadasLluviosas } from '../observatorio/derivados'
import { CifraPaso } from './CifraPaso'
import { cifraDePaso, vistaDePaso } from './cifras'
import { terminosDe } from './contenido'
import { PASOS, type ContenidoHistoria, type Parrafo } from './contenido/tipos'
import { IndicadorPasos } from './IndicadorPasos'
import { parejaDeMayorCambio } from './pareja'
import { PorLlegar } from './PorLlegar'
import { TarjetaPaso } from './TarjetaPaso'
import { VisorPaso } from './VisorPaso'

/** Estado de la historia que vive en la URL (lo lee y escribe `Historias`). */
export interface EstadoHistoria {
  paso: number
  /** '' = la polarización recomendada de la historia. */
  pol: '' | 'HH' | 'HV'
  /** Índice de la pasada «después»; 0 = la pareja automática. */
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

/**
 * Historia como recorrido por cuatro pasos (Datos · Lo que ve el satélite · Simular · Impactos). Cada paso es una
 * tarjeta con su cifra (de la API, con su sello); el comparador queda fijo a la derecha y cambia con el paso.
 * Pareja por defecto: la API no recomienda un intervalo; `parejaDeMayorCambio` la elige con la serie del escenario.
 */
export function Historia({ contenido: c, esc, estado, cambiar, cabecera }: Props) {
  const { t, idioma } = useT()
  const fecha = (iso: string | undefined) => formatearFecha(iso, idioma) ?? '—'
  const TERMINOS = terminosDe(idioma)
  const pasadas = esc.adquisiciones
  const ultima = pasadas.length - 1
  const recomendada = esc.polarizaciones.includes(c.polarizacion) ? c.polarizacion : esc.polarizaciones[0]
  const pol: string | undefined = estado.pol && esc.polarizaciones.includes(estado.pol) ? estado.pol : recomendada
  const n = Math.min(Math.max(1, estado.paso), PASOS.length)
  const paso = PASOS[n - 1]

  const descubrimiento = useCambio(
    esc.id,
    useMemo(() => (ultima > 0 ? { antes: pasadas[0].id, despues: pasadas[ultima].id, ...(recomendada ? { polarizacion: recomendada } : {}) } : undefined), [pasadas, ultima, recomendada]),
  )
  const pareja = useMemo<[number, number] | null>(() => {
    if (ultima < 1 || descubrimiento.isPending) return null
    return parejaDeMayorCambio(descubrimiento.data?.series[0]?.puntos, pasadas) ?? [0, ultima]
  }, [descubrimiento.isPending, descubrimiento.data, pasadas, ultima])

  const iAntes = pareja ? pareja[0] : 0
  const iDespues = pareja ? Math.min(ultima, Math.max(iAntes + 1, estado.pasada || pareja[1])) : 0
  const antes = pareja ? pasadas[iAntes] : undefined
  const despues = pareja ? pasadas[iDespues] : undefined
  const peticion = useMemo(
    () => (antes && despues ? { antes: antes.id, despues: despues.id, ...(pol ? { polarizacion: pol } : {}) } : undefined),
    [antes, despues, pol],
  )
  const resultado = useCambio(esc.id, peticion, true)
  const vista = vistaDePaso(c, paso, esc)
  const mascaraAntes = useCapa(esc.id, vista === 'mascara' && antes ? { adquisicion: antes.id, variable: 'mascara' } : undefined)
  const mascaraDespues = useCapa(esc.id, vista === 'mascara' && despues ? { adquisicion: despues.id, variable: 'mascara' } : undefined)

  const lat = (esc.bbox[1] + esc.bbox[3]) / 2
  const lon = (esc.bbox[0] + esc.bbox[2]) / 2
  const contexto = useContexto(lat, lon)
  const temporadas = useMemo(() => {
    const ts = pasadas.map((p) => Date.parse(p.instante))
    return ts.length ? temporadasLluviosas(contexto.data, Math.min(...ts), Math.max(...ts)) : []
  }, [contexto.data, pasadas])

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

  const r = resultado.data
  const polarizaciones = ['HH', 'HV']
    .filter((x) => esc.polarizaciones.includes(x))
    .map((x) => ({ id: x, etiqueta: x === c.polarizacion ? t('historias.pol.recomendada', { pol: x }) : x }))

  const enlace = `/explorar/observatorio?${new URLSearchParams({
    escenario: esc.id,
    ...(antes ? { antes: antes.id } : {}),
    ...(despues ? { despues: despues.id } : {}),
    ...(pol ? { pol } : {}),
    vista: 'comparar',
  })}`

  const controles = (
    <div className="visor__controles">
      {vista === 'radar' && polarizaciones.length > 1 && (
        <ControlSegmentado etiqueta={t('historias.pol.etiqueta')} opciones={polarizaciones} valor={pol ?? ''} onCambiar={(p) => cambiar({ pol: p === recomendada ? '' : (p as 'HH' | 'HV') })} />
      )}
      <p className="historia__estado" role="status">{resultado.isPlaceholderData ? t('historias.comparador.actualizando') : ''}</p>
      {pasadas.length > 2 && pareja && (
        <>
          <CintaPasadas
            adquisiciones={pasadas} instante={despues?.instante ?? ''} temporadas={temporadas}
            onCambio={(_, i) => cambiar({ pasada: i === pareja[1] ? 0 : Math.max(iAntes + 1, i) })}
          />
          <p className="historia__nota">{t('historias.comparador.nota_cinta')}</p>
        </>
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
                cifra={<CifraPaso cifra={cifraDePaso(c, clave, esc, r, antes?.instante, despues?.instante)} rotulo={p.cifra} />}
              >
                {p.detalle.map((par, k) => <p key={k} className="historia__parrafo">{texto(par)}</p>)}
                {clave === 'impactos' && r && r.metricas.length > 0 && (
                  <details className="paso__metricas">
                    <summary>{t('historias.cifra.mas')}</summary>
                    <dl>
                      {r.metricas.map((m) => (
                        <div key={m.etiqueta} className="paso__metrica">
                          <dt><EtiquetaMetrica m={m} /></dt>
                          <dd><ValorMetrica m={m} /> <UnidadMetrica unidad={m.unidad} /></dd>
                        </div>
                      ))}
                    </dl>
                  </details>
                )}
                {clave === 'satelite' && r && r.notas.length > 0 && <NotasModelo notas={r.notas} escenarioId={esc.id} textos={r.notas_texto} />}
                <PorLlegar elementos={p.porLlegar} />
                {clave === 'simular' && c.historiaApi === 'incendio' && (
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
          vista={vista} queVes={c.pasos[paso].vista.replace('{pol}', pol ?? '')} hayPareja={ultima > 0}
          cambio={resultado} mascaraAntes={mascaraAntes} mascaraDespues={mascaraDespues}
          fechaAntes={fecha(antes?.instante)} fechaDespues={fecha(despues?.instante)} controles={controles}
        />
      </div>
    </article>
  )
}

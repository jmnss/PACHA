import { useQueries } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { llamar } from '../../api/cliente'
import { useEscenarios, type Escenario, type ResumenSitio } from '../../api/consultas'
import { CabeceraPantalla } from '../../diseno/CabeceraPantalla'
import { Cargando } from '../../diseno/Estados'
import { SelloOrigen } from '../../diseno/SelloOrigen'
import { Termino } from '../../diseno/Termino'
import { useTituloPagina } from '../../estado/useTituloPagina'
import type { Clave } from '../../idioma/traductor'
import { TextoApi } from '../../idioma/TextoApi'
import { useT } from '../../idioma/useT'
import { formatearFecha } from '../../tiempo/fechas'
import './metodo.css'

/** Lecturas de la API que son cuidados de método (hipótesis), no resultados. */
const LECTURAS_CUIDADO = ['api.resumen.lectura.escena_cambia', 'api.resumen.lectura.incendio.rfdi_no_separa',
  'api.resumen.lectura.incendio.rfdi_separa', 'api.resumen.lectura.incendio.publicada', 'api.resumen.lectura.comparacion']

const ENLACES: { clave: Clave; url: string }[] = [
  { clave: 'metodo.p6.nisar', url: 'https://science.nasa.gov/mission/nisar/mission-overview/' },
  { clave: 'metodo.p6.guia', url: 'https://nisar-docs.asf.alaska.edu/nisar-intro/' },
  { clave: 'metodo.p6.jpl', url: 'https://www.jpl.nasa.gov/press-kits/nisar/quick-facts/' },
  { clave: 'metodo.p6.dem', url: 'https://registry.opendata.aws/copernicus-dem/' },
  { clave: 'metodo.p6.geob', url: 'https://www.geoboundaries.org/' },
]

const delEquipo = (e: Escenario) => (e.historia === 'embalse' || e.historia === 'incendio') && !!e.sitio

/** Resúmenes de los sitios del equipo (misma clave de caché que `useResumen`). */
function useResumenes(ids: string[]) {
  return useQueries({
    queries: ids.map((id) => ({
      queryKey: ['resumen', id],
      queryFn: () => llamar<ResumenSitio>(`/api/escenarios/${encodeURIComponent(id)}/resumen`),
    })),
  })
}

function Paso({ i, n, titulo, resumen, visual, detalle }: { i: number; n: number; titulo: string; resumen: ReactNode; visual?: ReactNode; detalle?: ReactNode }) {
  const { t } = useT()
  return (
    <li className="metodo__paso">
      <div className="metodo__cabeza">
        <span className="metodo__n num">{t('metodo.paso_n', { i, n })}</span>
        <h2 className="metodo__titulo">{titulo}</h2>
      </div>
      <div className="metodo__cuerpo">
        <p className="metodo__resumen">{resumen}</p>
        {visual}
        {detalle && (
          <details className="metodo__detalle">
            <summary>{t('metodo.mas')}</summary>
            <div className="metodo__detalle-cuerpo">{detalle}</div>
          </details>
        )}
      </div>
    </li>
  )
}

/** Ruta `/aprender/metodo`: el recorrido real de los datos del equipo, de NISAR a la cifra. */
export default function Metodo() {
  const { t, idioma } = useT()
  useTituloPagina('titulos.metodo')
  const escenarios = useEscenarios()
  const sitios = (escenarios.data ?? []).filter(delEquipo)
  const consultas = useResumenes(sitios.map((e) => e.id))
  const resumenes = consultas.flatMap((q) => (q.data ? [q.data] : []))
  const cargando = escenarios.isLoading || consultas.some((q) => q.isLoading)
  const fallo = escenarios.isError || consultas.some((q) => q.isError)
  const fecha = (iso: string) => formatearFecha(iso, idioma) ?? iso
  const n = (x: number, d = 2) => x.toLocaleString(idioma === 'en' ? 'en' : 'es', { minimumFractionDigits: d, maximumFractionDigits: d })
  const enEs = idioma === 'es' ? undefined : 'es'
  const totalFechas = resumenes.reduce((s, r) => s + r.fechas.length, 0)
  const N = 6

  const contraste = resumenes.flatMap((r) => r.historia !== 'embalse' ? [] : r.fechas.flatMap((f) => {
    const hh = f.retrodispersion.find((e) => e.polarizacion === 'HH')
    return hh && hh.mediana_clase_db != null && hh.mediana_resto_db != null ? [{ r, f, hh }] : []
  }))[0]
  const cuidados = resumenes.flatMap((r) => r.lecturas.filter((l) => LECTURAS_CUIDADO.includes(l.clave_texto ?? '')).map((l) => ({ r, l })))
  const fichas = resumenes.flatMap((r) => r.ficha.map((d) => ({ r, d })))
  const origen = resumenes[0]?.origen

  const estado = cargando ? <Cargando texto={t('metodo.cargando')} filas={2} /> : fallo ? <p className="metodo__nota">{t('metodo.error')}</p> : null

  return (
    <>
      <CabeceraPantalla titulo={t('metodo.titulo')}
        hallazgo={resumenes.length ? t('metodo.hallazgo', { sitios: resumenes.length, fechas: totalFechas }) : t('metodo.hallazgo_cargando')} />
      <ol className="metodo" aria-label={t('metodo.pasos')}>
        <Paso i={1} n={N} titulo={t('metodo.p1.titulo')} resumen={t('metodo.p1.resumen')}
          visual={
            <dl className="metodo__kpi">
              {(['onda', 'ciclo', 'franja', 'orbita'] as const).map((k) => (
                <div key={k}><dt>{t(`metodo.p1.kpi.${k}` as Clave)}</dt><dd className="num">{t(`metodo.p1.kpi.${k}_valor` as Clave)}</dd></div>
              ))}
            </dl>
          }
          detalle={<>
            <p>{t('metodo.p1.d1')}</p><p>{t('metodo.p1.d2')}</p><p>{t('metodo.p1.d3')}</p>
            <p className="metodo__nota">{t('metodo.p1.fuente')}</p>
          </>} />
        <Paso i={2} n={N} titulo={t('metodo.p2.titulo')}
          resumen={<>
            <Termino nombre={t('metodo.p2.termino.gcov')} explicacion={t('metodo.p2.termino.gcov_def')} />{' · '}
            <Termino nombre={t('metodo.p2.termino.db')} explicacion={t('metodo.p2.termino.db_def')} />{'. '}
            {t('metodo.p2.resumen')}
          </>}
          visual={
            <dl className="metodo__pol">
              <div><dt>{t('metodo.p2.hh')}</dt><dd>{t('metodo.p2.hh_texto')}</dd></div>
              <div><dt>{t('metodo.p2.hv')}</dt><dd>{t('metodo.p2.hv_texto')}</dd></div>
            </dl>
          }
          detalle={<><p>{t('metodo.p2.d1')}</p><p>{t('metodo.p2.d2')}</p><p>{t('metodo.p2.d3')}</p></>} />
        <Paso i={3} n={N} titulo={t('metodo.p3.titulo')} resumen={t('metodo.p3.resumen')}
          visual={estado ?? (
            <div className="metodo__bloque">
              <table className="metodo__tabla">
                <caption className="solo-lectores">{t('metodo.p3.tabla')}</caption>
                <thead><tr><th scope="col">{t('metodo.p3.col.sitio')}</th><th scope="col">{t('metodo.p3.col.metodo')}</th><th scope="col" className="num">{t('metodo.p3.col.clases')}</th><th scope="col">{t('metodo.p3.col.autor')}</th></tr></thead>
                <tbody>
                  {sitios.map((e) => {
                    const m = e.origen.procedencia?.metodo as { nombre?: string; clases?: number } | null | undefined
                    const autor = (e.origen.procedencia as { autor?: string } | null | undefined)?.autor
                    return (
                      <tr key={e.id}>
                        <th scope="row">{e.nombre}</th>
                        {m?.nombre ? <td lang={enEs}>{m.nombre}</td> : <td>{t('metodo.p3.sin_metodo')}</td>}
                        <td className="num">{m?.clases ?? '—'}</td>
                        <td>{autor ?? '—'}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
              {contraste && (
                <p className="metodo__dato">{t('metodo.p3.contraste', { sitio: contraste.r.nombre, fecha: fecha(contraste.f.fecha), agua: n(contraste.hh.mediana_clase_db!, 1), resto: n(contraste.hh.mediana_resto_db!, 1) })}</p>
              )}
              {origen && <SelloOrigen origen={origen} />}
            </div>
          )}
          detalle={<>
            <p><Termino nombre={t('metodo.p3.termino.rfdi')} explicacion={t('metodo.p3.termino.rfdi_def')} />{' — '}{t('metodo.p3.d1')}</p>
            <p>{t('metodo.p3.d2')}</p>
          </>} />
        <Paso i={4} n={N} titulo={t('metodo.p4.titulo')} resumen={t('metodo.p4.resumen')}
          visual={<>
            <p className="metodo__formula">{t('metodo.p4.formula')}</p>
            <p className="metodo__nota">{t('metodo.p4.formula_ej')}</p>
            {estado ?? (
              <div className="metodo__bloque">
                <table className="metodo__tabla">
                  <caption className="solo-lectores">{t('metodo.p4.tabla')}</caption>
                  <thead><tr><th scope="col">{t('metodo.p4.col.sitio')}</th><th scope="col" className="num">{t('metodo.p4.col.antes')}</th><th scope="col" className="num">{t('metodo.p4.col.despues')}</th><th scope="col" className="num">{t('metodo.p4.col.cambio')}</th></tr></thead>
                  <tbody>
                    {resumenes.map((r) => {
                      const v = r.variacion
                      const inc = r.incendio
                      return (
                        <tr key={r.escenario_id}>
                          <th scope="row">{r.nombre}</th>
                          <td className="num">{v ? t('metodo.p4.km2_en', { km2: n(v.antes_km2), fecha: fecha(v.fecha_antes) }) : '—'}</td>
                          <td className="num">{v ? t('metodo.p4.km2_en', { km2: n(v.despues_km2), fecha: fecha(v.fecha_despues) }) : inc ? fecha(inc.fecha) : '—'}</td>
                          <td className="num">{v ? t('metodo.p4.cambio', { abs: n(v.absoluta_km2), rel: v.relativa_pct == null ? '—' : n(v.relativa_pct, 1), dias: v.dias })
                            : inc ? t('metodo.p4.quemado', { km2: n(inc.area_marcada_km2), ha: n(inc.area_marcada_ha, 0) }) : '—'}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
                {origen && <SelloOrigen origen={origen} />}
              </div>
            )}
          </>}
          detalle={<><p>{t('metodo.p4.d1')}</p><p>{t('metodo.p4.d2')}</p><p>{t('metodo.p4.d3')}</p></>} />
        <Paso i={5} n={N} titulo={t('metodo.p5.titulo')} resumen={t('metodo.p5.resumen')}
          visual={
            <ul className="metodo__lista">
              {(['geometria', 'segmentacion', 'madurez', 'campo'] as const).map((k) => <li key={k}>{t(`metodo.p5.${k}` as Clave)}</li>)}
            </ul>
          }
          detalle={cuidados.length ? <>
            <h3 className="metodo__subtitulo">{t('metodo.p5.api')}</h3>
            <ul className="metodo__lista">
              {cuidados.map(({ r, l }, i) => (
                <li key={`${r.escenario_id}-${i}`}><strong>{r.nombre}.</strong>{' '}
                  <TextoApi texto={l.texto} clave={l.clave_texto} valores={l.valores_texto} decimales={l.decimales_texto} /></li>
              ))}
            </ul>
          </> : undefined} />
        <Paso i={6} n={N} titulo={t('metodo.p6.titulo')} resumen={t('metodo.p6.resumen')}
          visual={
            <ul className="metodo__lista metodo__fuentes">
              <li>{t('metodo.p6.equipo')}</li>
              {ENLACES.map((e) => (
                <li key={e.clave}><a href={e.url} target="_blank" rel="noopener noreferrer">{t(e.clave)}</a>
                  {e.clave === 'metodo.p6.dem' && <span className="metodo__nota"> {t('metodo.p6.dem_licencia')}</span>}</li>
              ))}
            </ul>
          }
          detalle={fichas.length ? <>
            <h3 className="metodo__subtitulo">{t('metodo.p6.fichas')}</h3>
            <ul className="metodo__lista metodo__fuentes">
              {fichas.map(({ r, d }) => (
                <li key={`${r.escenario_id}-${d.id}`}>
                  <a href={d.fuente.url} target="_blank" rel="noopener noreferrer" title={d.fuente.cita}>{t('metodo.p6.ficha', { sitio: r.nombre, fuente: d.fuente.nombre })}</a>
                  {' · '}<span className="metodo__nota">{t('metodo.p6.consulta', { fecha: fecha(d.fuente.consulta) })}</span>
                </li>
              ))}
            </ul>
          </> : undefined} />
      </ol>
    </>
  )
}

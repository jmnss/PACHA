import type { DatoFicha } from '../../api/consultas'
import { TextoApi } from '../../idioma/TextoApi'
import { useT } from '../../idioma/useT'
import { formatearFecha } from '../../tiempo/fechas'

const ES_FECHA = /^\d{4}-\d{2}-\d{2}$/

/** Ficha del sitio: solo datos publicados, cada uno con su fuente enlazada y la cita. */
export function FichaSitio({ datos }: { datos: DatoFicha[] }) {
  const { t, idioma, formatoNumero } = useT()
  if (datos.length === 0) return null
  return (
    <section className="ficha-sitio" aria-label={t('historias.ficha.titulo')}>
      <h4 className="ficha-sitio__titulo">{t('historias.ficha.titulo')}</h4>
      <dl className="ficha-sitio__lista">
        {datos.map((d) => {
          const valor = typeof d.valor === 'number'
            ? formatoNumero(d.valor, { maximumFractionDigits: 2 })
            : ES_FECHA.test(d.valor) ? formatearFecha(d.valor, idioma) ?? d.valor : d.valor
          return (
            <div key={d.id} className="ficha-sitio__dato">
              <dt><TextoApi texto={d.etiqueta} clave={`${d.clave_texto}.etiqueta`} />{d.nombre_propio ? ` (${d.nombre_propio})` : ''}</dt>
              <dd>
                <span className="ficha-sitio__valor">{valor}{d.unidad ? ` ${d.unidad}` : ''}</span>
                <span className="ficha-sitio__fuente">
                  {t('historias.ficha.fuente')}: <a href={d.fuente.url} target="_blank" rel="noopener noreferrer">{d.fuente.nombre}</a>
                  {' · '}<q lang="es">{d.fuente.cita}</q>
                </span>
              </dd>
            </div>
          )
        })}
      </dl>
    </section>
  )
}

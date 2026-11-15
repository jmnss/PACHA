import type { ComparacionEmbalses } from '../../api/consultas'
import { useT } from '../../idioma/useT'
import { formatearFecha } from '../../tiempo/fechas'
import { LecturasApi } from './LecturasApi'

/** Mazar y Daule-Peripa con la misma métrica (superficie de agua, primera → última fecha), de `/comparacion/embalses`. */
export function TablaComparacion({ datos }: { datos: ComparacionEmbalses }) {
  const { t, idioma, formatoNumero } = useT()
  const n = (x: number | null | undefined, d: number) => (x == null ? '—' : formatoNumero(x, { minimumFractionDigits: d, maximumFractionDigits: d }))
  const f = (iso: string) => formatearFecha(iso, idioma) ?? iso
  return (
    <section className="comparacion-embalses" aria-labelledby="comparacion-titulo">
      <h4 id="comparacion-titulo" className="comparacion-embalses__titulo">{t('historias.comparacion.titulo')}</h4>
      <div className="comparacion-embalses__marco">
        <table className="comparacion-embalses__tabla">
          <thead>
            <tr>
              <th scope="col">{t('historias.comparacion.sitio')}</th>
              <th scope="col">{t('historias.comparacion.fechas')}</th>
              <th scope="col" className="num">{t('historias.comparacion.antes')}</th>
              <th scope="col" className="num">{t('historias.comparacion.despues')}</th>
              <th scope="col" className="num">{t('historias.comparacion.variacion')}</th>
            </tr>
          </thead>
          <tbody>
            {datos.sitios.map((s) => (
              <tr key={s.escenario_id}>
                <th scope="row">{s.nombre}</th>
                <td>{f(s.variacion.fecha_antes)} → {f(s.variacion.fecha_despues)} ({t('historias.comparacion.dias', { n: s.variacion.dias })})</td>
                <td className="num">{n(s.variacion.antes_km2, 2)}</td>
                <td className="num">{n(s.variacion.despues_km2, 2)}</td>
                <td className="num">{n(s.variacion.relativa_pct, 1)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <LecturasApi lecturas={datos.lecturas} />
    </section>
  )
}

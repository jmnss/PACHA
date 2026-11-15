import type { CSSProperties } from 'react'
import type { Clave } from '../../idioma/traductor'
import { useT } from '../../idioma/useT'

/** Capas de la columna, la más reciente arriba. Ilustrativas: sin fechas ni medidas. */
const CAPAS: readonly { clave: Clave; color: string; grosor: number; ancho: string; nueva?: boolean }[] = [
  { clave: 'inicio.pasadas.en_curso', color: 'var(--ocre)', grosor: 0.9, ancho: '100%', nueva: true },
  { clave: 'inicio.pasadas.lluvias', color: 'var(--laguna)', grosor: 1.6, ancho: '92%' },
  { clave: 'inicio.pasadas.transicion', color: 'var(--paramo)', grosor: 0.7, ancho: '84%' },
  { clave: 'inicio.pasadas.seca', color: 'var(--limo)', grosor: 1.3, ancho: '96%' },
  { clave: 'inicio.pasadas.sin_cambios', color: 'var(--ceniza)', grosor: 0.6, ancho: '88%' },
  { clave: 'inicio.pasadas.lluvias', color: 'var(--laguna)', grosor: 1.2, ancho: '94%' },
  { clave: 'inicio.pasadas.seca', color: 'var(--cacao)', grosor: 1, ancho: '90%' },
]

/** «Registro de pasadas» (de C): columna de capas que hace de línea de tiempo; la de arriba crece con el haz. */
export function RegistroPasadas() {
  const { t } = useT()
  return (
    <aside className="pasadas" aria-labelledby="inicio-pasadas-t">
      <h2 id="inicio-pasadas-t" className="pasadas__titulo">{t('inicio.pasadas.titulo')}</h2>
      <p className="pasadas__extremo">{t('inicio.pasadas.hoy')}</p>
      <ol className="pasadas__lista">
        {CAPAS.map((c, i) => (
          <li key={i} className={c.nueva ? 'pasadas__capa pasadas__capa--nueva' : 'pasadas__capa'}
            style={{ '--c': c.color, '--g': c.grosor, '--w': c.ancho } as CSSProperties}>
            <span className="pasadas__roca" aria-hidden="true" />
            <span className="pasadas__rotulo">{t(c.clave)}</span>
          </li>
        ))}
      </ol>
      <p className="pasadas__extremo">{t('inicio.pasadas.antes')}</p>
      <p className="pasadas__nota">{t('inicio.pasadas.nota')}</p>
    </aside>
  )
}

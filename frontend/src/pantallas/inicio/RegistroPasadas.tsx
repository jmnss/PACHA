import type { CSSProperties } from 'react'
import { useEscenario } from '../../api/consultas'
import type { Clave } from '../../idioma/traductor'
import { useT } from '../../idioma/useT'
import { ESCENARIO_DE, type IdLugar } from './lugares'

const COLOR: Record<IdLugar, string> = { daule: 'var(--laguna)', mazar: 'var(--paramo)', casitagua: 'var(--cacao)' }
const DIA = 86_400_000

interface Capa { lugar: IdLugar; instante: string; ms: number }

/** «Registro de pasadas» (de C): columna de capas que hace de línea de tiempo con las pasadas reales de los tres lugares. */
export function RegistroPasadas() {
  const { t, formatoFecha } = useT()
  const consultas = [
    useEscenario(ESCENARIO_DE.daule),
    useEscenario(ESCENARIO_DE.mazar),
    useEscenario(ESCENARIO_DE.casitagua),
  ]
  const lugares: IdLugar[] = ['daule', 'mazar', 'casitagua']
  const capas: Capa[] = lugares
    .flatMap((lugar, i) => (consultas[i].data?.adquisiciones ?? []).map((a) => ({ lugar, instante: a.instante, ms: Date.parse(a.instante) })))
    .filter((c) => Number.isFinite(c.ms))
    .sort((a, b) => b.ms - a.ms)
  const cargando = consultas.some((c) => c.isPending) && capas.length === 0
  const fallo = !cargando && capas.length === 0
  return (
    <aside className="pasadas" aria-labelledby="inicio-pasadas-t">
      <h2 id="inicio-pasadas-t" className="pasadas__titulo">{t('inicio.pasadas.titulo')}</h2>
      {capas.length > 0 && <p className="pasadas__extremo">{t('inicio.pasadas.hoy')}</p>}
      <ol className="pasadas__lista">
        {capas.map((c, i) => {
          // El grosor de cada capa es proporcional al tiempo hasta la pasada anterior (acotado).
          const previa = capas[i + 1]
          const dias = previa ? (c.ms - previa.ms) / DIA : 30
          const grosor = Math.min(2, Math.max(0.6, dias / 60))
          return (
            <li key={`${c.lugar}-${c.instante}`} className={i === 0 ? 'pasadas__capa pasadas__capa--nueva' : 'pasadas__capa'}
              style={{ '--c': i === 0 ? 'var(--ocre)' : COLOR[c.lugar], '--g': grosor, '--w': '92%' } as CSSProperties}>
              <span className="pasadas__roca" aria-hidden="true" />
              <span className="pasadas__rotulo">
                <span className="num">{formatoFecha(c.instante, 'corta')}</span> · {t(`inicio.lugar.${c.lugar}.nombre` as Clave)}
              </span>
            </li>
          )
        })}
      </ol>
      {cargando && <p className="pasadas__nota">{t('inicio.pasadas.cargando')}</p>}
      {fallo && <p className="pasadas__nota">{t('inicio.pasadas.error')}</p>}
      {capas.length > 0 && <p className="pasadas__extremo">{t('inicio.pasadas.antes')}</p>}
      {capas.length > 0 && <p className="pasadas__nota">{t('inicio.pasadas.nota')}</p>}
    </aside>
  )
}
